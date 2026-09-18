-- 038_create_event_mural.sql
-- Cria a tabela app_event_photos (mural do evento) com moderação.
--
-- Contexto: o código em useSupabaseEvents.ts já consultava 'app_event_photos',
-- mas a tabela nunca foi criada no banco — a galeria estava quebrada.
-- Esta migration cria a tabela com os campos que o código existente espera
-- (photo_url, caption, uploaded_at, uploaded_by, is_cover) e acrescenta o
-- fluxo de mural: envio por participante + fila de moderação.

-- Preflight: o histórico de migrations deste repo diverge do banco em produção,
-- então confirmamos as dependências antes de criar qualquer coisa.
DO $$
DECLARE
  missing TEXT := '';
  kind CHAR;
BEGIN
  SELECT relkind INTO kind FROM pg_class
   WHERE oid = to_regclass('public.app_events');

  IF kind IS NULL THEN
    RAISE EXCEPTION 'app_events não existe. Confirme o schema antes de aplicar.';
  ELSIF kind <> 'r' THEN
    RAISE EXCEPTION
      'app_events é % e não uma tabela; não é possível criar chave estrangeira para ela.',
      CASE kind WHEN 'v' THEN 'uma view' WHEN 'm' THEN 'uma view materializada' ELSE 'outro objeto' END;
  END IF;

  IF to_regclass('public.app_event_tickets') IS NULL THEN missing := missing || ' app_event_tickets'; END IF;
  IF to_regclass('public.app_people')        IS NULL THEN missing := missing || ' app_people';        END IF;
  IF to_regclass('public.app_admin_users')   IS NULL THEN missing := missing || ' app_admin_users';   END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'Tabelas ausentes:%. Aplique as dependências antes desta migration.', missing;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.app_event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.app_events(id) ON DELETE CASCADE,

  -- Mídia
  photo_url TEXT NOT NULL,
  storage_path TEXT,
  media_type TEXT NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  caption TEXT,
  is_cover BOOLEAN NOT NULL DEFAULT FALSE,

  -- Origem e moderação
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'participant')),
  moderation_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Autoria
  submitted_by_ticket_id UUID REFERENCES public.app_event_tickets(id) ON DELETE SET NULL,
  submitted_by_person_id UUID REFERENCES public.app_people(id) ON DELETE SET NULL,
  uploaded_by TEXT,
  consent_image_use BOOLEAN NOT NULL DEFAULT FALSE,

  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Envio de participante exige consentimento explícito de uso de imagem (LGPD)
  CONSTRAINT participant_requires_consent
    CHECK (source <> 'participant' OR consent_image_use = TRUE)
);

CREATE INDEX IF NOT EXISTS idx_event_photos_feed
  ON public.app_event_photos (event_id, moderation_status, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_photos_moderation_queue
  ON public.app_event_photos (moderation_status, uploaded_at)
  WHERE moderation_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_event_photos_cover
  ON public.app_event_photos (event_id) WHERE is_cover = TRUE;
CREATE INDEX IF NOT EXISTS idx_event_photos_ticket
  ON public.app_event_photos (submitted_by_ticket_id);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION public.mural_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_photos_updated_at ON public.app_event_photos;
CREATE TRIGGER trg_event_photos_updated_at
  BEFORE UPDATE ON public.app_event_photos
  FOR EACH ROW EXECUTE FUNCTION public.mural_touch_updated_at();

-- Helper de autorização: admin é quem está em app_admin_users.
-- SECURITY DEFINER evita recursão de RLS ao checar a própria tabela de admins.
-- Nome próprio de propósito: já existe uma is_admin() no banco, apontando para
-- admin_users, da qual dependem políticas do carrossel e de depoimentos.
-- Redefini-la aqui mudaria o controle de acesso daquelas tabelas.
CREATE OR REPLACE FUNCTION public.is_mural_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_admin_users WHERE id = auth.uid());
$$;

-- RLS: diferente do padrão permissivo do resto do projeto.
-- O mural recebe conteúdo de visitante anônimo, então a trava precisa ser real.
ALTER TABLE public.app_event_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mural_public_read_approved" ON public.app_event_photos;
CREATE POLICY "mural_public_read_approved" ON public.app_event_photos
  FOR SELECT TO anon, authenticated
  USING (moderation_status = 'approved');

DROP POLICY IF EXISTS "mural_admin_read_all" ON public.app_event_photos;
CREATE POLICY "mural_admin_read_all" ON public.app_event_photos
  FOR SELECT TO authenticated
  USING (public.is_mural_admin());

-- Participante só consegue inserir conteúdo pendente e consentido.
-- Não consegue se auto-aprovar nem se passar por upload do admin.
DROP POLICY IF EXISTS "mural_participant_submit" ON public.app_event_photos;
CREATE POLICY "mural_participant_submit" ON public.app_event_photos
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    source = 'participant'
    AND moderation_status = 'pending'
    AND consent_image_use = TRUE
    AND is_cover = FALSE
  );

DROP POLICY IF EXISTS "mural_admin_insert" ON public.app_event_photos;
CREATE POLICY "mural_admin_insert" ON public.app_event_photos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_mural_admin());

DROP POLICY IF EXISTS "mural_admin_update" ON public.app_event_photos;
CREATE POLICY "mural_admin_update" ON public.app_event_photos
  FOR UPDATE TO authenticated
  USING (public.is_mural_admin()) WITH CHECK (public.is_mural_admin());

DROP POLICY IF EXISTS "mural_admin_delete" ON public.app_event_photos;
CREATE POLICY "mural_admin_delete" ON public.app_event_photos
  FOR DELETE TO authenticated
  USING (public.is_mural_admin());

GRANT SELECT, INSERT ON public.app_event_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_event_photos TO authenticated;
GRANT ALL PRIVILEGES ON public.app_event_photos TO service_role;

-- Realtime para o feed ao vivo
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_event_photos;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Storage: bucket usado por uploadEventPhoto (supabase.storage.from('events'))
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'events', 'events', TRUE, 15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "events_bucket_public_read" ON storage.objects;
CREATE POLICY "events_bucket_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'events');

-- Anônimo só escreve dentro de event-mural/, nunca nas pastas do admin
DROP POLICY IF EXISTS "events_bucket_mural_upload" ON storage.objects;
CREATE POLICY "events_bucket_mural_upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'events'
    AND (storage.foldername(name))[1] = 'event-mural'
  );

DROP POLICY IF EXISTS "events_bucket_admin_write" ON storage.objects;
CREATE POLICY "events_bucket_admin_write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'events' AND public.is_mural_admin())
  WITH CHECK (bucket_id = 'events' AND public.is_mural_admin());

COMMENT ON TABLE public.app_event_photos IS
  'Mural do evento: fotos e vídeos do admin e de participantes, com fila de moderação.';
COMMENT ON COLUMN public.app_event_photos.moderation_status IS
  'Envios de participante entram como pending; uploads do admin já nascem approved.';
COMMENT ON COLUMN public.app_event_photos.storage_path IS
  'Caminho no bucket events, necessário para remover o arquivo ao excluir o registro.';
