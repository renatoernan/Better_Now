-- 039_create_event_contests.sql
-- Concursos do evento (ex: "fantasia mais assustadora") e a curadoria que
-- promove fotos aprovadas do mural a candidatas.
--
-- A votação em si é a Fase 3; aqui ficam apenas o concurso, suas janelas e as
-- candidaturas. Cada foto é uma candidatura (UNIQUE contest_id, photo_id) e a
-- regra de uma foto por pessoa é aplicada pelo admin na curadoria, com aviso
-- na interface quando a pessoa já tem outra candidatura no mesmo concurso.

DO $$
BEGIN
  IF to_regclass('public.app_event_photos') IS NULL THEN
    RAISE EXCEPTION 'app_event_photos não existe. Aplique a migration 038 antes desta.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'is_mural_admin' AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'Função is_mural_admin() ausente. Aplique a migration 038 antes desta.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'mural_touch_updated_at' AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'Função mural_touch_updated_at() ausente. Aplique a migration 038 antes desta.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.app_event_contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.app_events(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  prize_description TEXT,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'voting', 'closed', 'published')),

  voting_opens_at TIMESTAMPTZ,
  voting_closes_at TIMESTAMPTZ,

  -- Decisões de regra do concurso, usadas a partir da Fase 3
  show_live_results BOOLEAN NOT NULL DEFAULT FALSE,
  require_checkin BOOLEAN NOT NULL DEFAULT TRUE,
  allow_self_vote BOOLEAN NOT NULL DEFAULT FALSE,

  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT voting_window_ordered
    CHECK (voting_opens_at IS NULL OR voting_closes_at IS NULL
           OR voting_closes_at > voting_opens_at)
);

CREATE TABLE IF NOT EXISTS public.app_contest_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES public.app_event_contests(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.app_event_photos(id) ON DELETE CASCADE,

  -- Quem aparece na foto. O vínculo com cadastro é o caminho preferido;
  -- participant_name é a saída quando a pessoa não é identificável na hora.
  participant_name TEXT NOT NULL,
  participant_person_id UUID REFERENCES public.app_people(id) ON DELETE SET NULL,
  participant_ticket_id UUID REFERENCES public.app_event_tickets(id) ON DELETE SET NULL,

  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disqualified')),
  disqualified_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Uma foto não concorre duas vezes no mesmo concurso
  CONSTRAINT uniq_contest_photo UNIQUE (contest_id, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_contests_event
  ON public.app_event_contests (event_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_entries_contest
  ON public.app_contest_entries (contest_id, display_order);
CREATE INDEX IF NOT EXISTS idx_entries_photo
  ON public.app_contest_entries (photo_id);
-- Sustenta o aviso de pessoa já inscrita durante a curadoria ao vivo
CREATE INDEX IF NOT EXISTS idx_entries_person
  ON public.app_contest_entries (contest_id, participant_person_id)
  WHERE participant_person_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_contests_updated_at ON public.app_event_contests;
CREATE TRIGGER trg_contests_updated_at
  BEFORE UPDATE ON public.app_event_contests
  FOR EACH ROW EXECUTE FUNCTION public.mural_touch_updated_at();

DROP TRIGGER IF EXISTS trg_entries_updated_at ON public.app_contest_entries;
CREATE TRIGGER trg_entries_updated_at
  BEFORE UPDATE ON public.app_contest_entries
  FOR EACH ROW EXECUTE FUNCTION public.mural_touch_updated_at();

-- Só fotos aprovadas do mural podem concorrer, e a foto precisa ser do mesmo
-- evento do concurso. Em trigger porque CHECK não enxerga outras tabelas.
CREATE OR REPLACE FUNCTION public.validate_contest_entry()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  photo_event UUID;
  photo_status TEXT;
  contest_event UUID;
BEGIN
  SELECT event_id, moderation_status INTO photo_event, photo_status
    FROM public.app_event_photos WHERE id = NEW.photo_id;
  SELECT event_id INTO contest_event
    FROM public.app_event_contests WHERE id = NEW.contest_id;

  IF photo_status <> 'approved' THEN
    RAISE EXCEPTION 'Apenas fotos aprovadas no mural podem concorrer (foto está como %).', photo_status;
  END IF;

  IF photo_event <> contest_event THEN
    RAISE EXCEPTION 'A foto pertence a outro evento e não pode concorrer neste concurso.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_contest_entry ON public.app_contest_entries;
CREATE TRIGGER trg_validate_contest_entry
  BEFORE INSERT OR UPDATE OF photo_id, contest_id ON public.app_contest_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_contest_entry();

-- RLS: leitura pública apenas de concursos já divulgados; escrita só do admin.
ALTER TABLE public.app_event_contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_contest_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contests_public_read" ON public.app_event_contests;
CREATE POLICY "contests_public_read" ON public.app_event_contests
  FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL AND status <> 'draft');

DROP POLICY IF EXISTS "contests_admin_read" ON public.app_event_contests;
CREATE POLICY "contests_admin_read" ON public.app_event_contests
  FOR SELECT TO authenticated USING (public.is_mural_admin());

DROP POLICY IF EXISTS "contests_admin_write" ON public.app_event_contests;
CREATE POLICY "contests_admin_write" ON public.app_event_contests
  FOR ALL TO authenticated
  USING (public.is_mural_admin()) WITH CHECK (public.is_mural_admin());

DROP POLICY IF EXISTS "entries_public_read" ON public.app_contest_entries;
CREATE POLICY "entries_public_read" ON public.app_contest_entries
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.app_event_contests c
     WHERE c.id = contest_id AND c.deleted_at IS NULL AND c.status <> 'draft'
  ));

DROP POLICY IF EXISTS "entries_admin_read" ON public.app_contest_entries;
CREATE POLICY "entries_admin_read" ON public.app_contest_entries
  FOR SELECT TO authenticated USING (public.is_mural_admin());

DROP POLICY IF EXISTS "entries_admin_write" ON public.app_contest_entries;
CREATE POLICY "entries_admin_write" ON public.app_contest_entries
  FOR ALL TO authenticated
  USING (public.is_mural_admin()) WITH CHECK (public.is_mural_admin());

GRANT SELECT ON public.app_event_contests TO anon;
GRANT SELECT ON public.app_contest_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_event_contests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_contest_entries TO authenticated;
GRANT ALL PRIVILEGES ON public.app_event_contests TO service_role;
GRANT ALL PRIVILEGES ON public.app_contest_entries TO service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_event_contests;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_contest_entries;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

COMMENT ON TABLE public.app_event_contests IS
  'Concursos de um evento. A votação é registrada a partir da Fase 3.';
COMMENT ON TABLE public.app_contest_entries IS
  'Candidaturas: cada foto aprovada promovida pelo admin vira uma entry.';
COMMENT ON COLUMN public.app_contest_entries.participant_name IS
  'Nome de quem aparece na foto; preenchido do cadastro quando identificado.';
