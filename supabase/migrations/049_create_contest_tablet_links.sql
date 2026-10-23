-- 049_create_contest_tablet_links.sql
-- Links de acesso seguro ao Modo Tablet dos Concursos.
--
-- Permite que dispositivos (tablets/celulares) operem o concurso (fotografar
-- candidatos, registrar fotos, colher votos e ver apuração) via token,
-- sem necessidade de login na conta administrativa e sem acesso ao sistema confidencial.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
  IF to_regclass('public.app_event_contests') IS NULL THEN
    RAISE EXCEPTION 'app_event_contests não existe.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.app_contest_tablet_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.app_events(id) ON DELETE CASCADE,
  contest_id UUID NOT NULL REFERENCES public.app_event_contests(id) ON DELETE CASCADE,

  token TEXT NOT NULL UNIQUE,
  label TEXT,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,

  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contest_tablet_shares_contest
  ON public.app_contest_tablet_shares (contest_id) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contest_tablet_shares_token
  ON public.app_contest_tablet_shares (token);

-- RLS: Apenas administradores autenticados podem ver e gerenciar a tabela
ALTER TABLE public.app_contest_tablet_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contest_tablet_shares_admin_all" ON public.app_contest_tablet_shares;
CREATE POLICY "contest_tablet_shares_admin_all" ON public.app_contest_tablet_shares
  FOR ALL TO authenticated
  USING (public.is_mural_admin()) WITH CHECK (public.is_mural_admin());

REVOKE ALL ON public.app_contest_tablet_shares FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_contest_tablet_shares TO authenticated;
GRANT ALL PRIVILEGES ON public.app_contest_tablet_shares TO service_role;

-- 1. Criação do link do tablet pelo administrador
CREATE OR REPLACE FUNCTION public.create_contest_tablet_share(
  p_contest_id UUID,
  p_label TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (share_id UUID, share_token TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_token TEXT;
  v_id UUID;
  v_event_id UUID;
BEGIN
  IF NOT public.is_mural_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem criar links para tablet.';
  END IF;

  SELECT c.event_id INTO v_event_id
  FROM public.app_event_contests c
  WHERE c.id = p_contest_id AND c.deleted_at IS NULL;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Concurso não encontrado ou já excluído.';
  END IF;

  v_token := encode(extensions.gen_random_bytes(16), 'hex');

  INSERT INTO public.app_contest_tablet_shares
    (event_id, contest_id, token, label, expires_at, created_by)
  VALUES
    (v_event_id, p_contest_id, v_token, nullif(trim(coalesce(p_label, '')), ''), p_expires_at, auth.uid())
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_contest_tablet_share(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_contest_tablet_share(UUID, TEXT, TIMESTAMPTZ) TO authenticated, service_role;

-- 2. Revogação de link do tablet pelo administrador
CREATE OR REPLACE FUNCTION public.revoke_contest_tablet_share(p_share_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.is_mural_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem revogar links de tablet.';
  END IF;

  UPDATE public.app_contest_tablet_shares s
  SET is_active = FALSE, revoked_at = NOW()
  WHERE s.id = p_share_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_contest_tablet_share(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_contest_tablet_share(UUID) TO authenticated, service_role;

-- 3. Verificação do token do tablet (chamada pelo tablet ao abrir a página)
DROP FUNCTION IF EXISTS public.verify_contest_tablet_token(TEXT);

CREATE OR REPLACE FUNCTION public.verify_contest_tablet_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_share RECORD;
  v_contest RECORD;
  v_event_title TEXT := '';
BEGIN
  -- 1. Localiza o share ativo e não expirado
  SELECT s.id, s.token, s.label, s.contest_id, s.event_id INTO v_share
  FROM public.app_contest_tablet_shares s
  WHERE s.token = p_token
    AND s.is_active = TRUE
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > NOW());

  IF v_share.id IS NULL THEN
    RETURN jsonb_build_object('valid', FALSE, 'error', 'Link do tablet inválido, expirado ou revogado.');
  END IF;

  -- 2. Atualiza estatísticas de acesso
  UPDATE public.app_contest_tablet_shares s
  SET access_count = s.access_count + 1,
      last_accessed_at = NOW()
  WHERE s.id = v_share.id;

  -- 3. Busca metadados do concurso
  SELECT c.id, c.title, c.description, c.prize_description, c.status,
         c.voting_opens_at, c.voting_closes_at, c.show_live_results,
         c.require_checkin, c.allow_self_vote
  INTO v_contest
  FROM public.app_event_contests c
  WHERE c.id = v_share.contest_id
    AND c.deleted_at IS NULL;

  IF v_contest.id IS NULL THEN
    RETURN jsonb_build_object('valid', FALSE, 'error', 'Concurso não encontrado ou já excluído.');
  END IF;

  -- 4. Busca título do evento se disponível
  BEGIN
    SELECT COALESCE(e.title, '')::TEXT INTO v_event_title
    FROM public.app_events e
    WHERE e.id = v_share.event_id;
  EXCEPTION WHEN OTHERS THEN
    v_event_title := '';
  END;

  RETURN jsonb_build_object(
    'valid', TRUE,
    'share_id', v_share.id,
    'token', v_share.token,
    'label', v_share.label,
    'contest_id', v_contest.id,
    'event_id', v_share.event_id,
    'contest_title', v_contest.title,
    'contest_description', v_contest.description,
    'prize_description', v_contest.prize_description,
    'event_title', COALESCE(v_event_title, ''),
    'contest_status', v_contest.status,
    'voting_opens_at', v_contest.voting_opens_at,
    'voting_closes_at', v_contest.voting_closes_at,
    'show_live_results', v_contest.show_live_results,
    'require_checkin', v_contest.require_checkin,
    'allow_self_vote', v_contest.allow_self_vote
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_contest_tablet_token(TEXT) TO anon, authenticated, service_role;

-- 4. Função para consultar ingressos que já votaram via tablet token
CREATE OR REPLACE FUNCTION public.kiosk_get_voted_tickets(p_token TEXT)
RETURNS TABLE (ticket_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_target_contest_id UUID;
BEGIN
  SELECT s.contest_id INTO v_target_contest_id
  FROM public.app_contest_tablet_shares s
  WHERE s.token = p_token
    AND s.is_active = TRUE
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > NOW());

  IF v_target_contest_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT v.ticket_id
  FROM public.app_contest_votes v
  WHERE v.contest_id = v_target_contest_id
    AND v.voided_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_get_voted_tickets(TEXT) TO anon, authenticated, service_role;

-- 5. Função para salvar foto capturada no tablet e vincular ao concurso
CREATE OR REPLACE FUNCTION public.kiosk_save_contest_photo(
  p_token TEXT,
  p_photo_url TEXT,
  p_storage_path TEXT,
  p_participant_name TEXT,
  p_participant_ticket_id UUID,
  p_participant_person_id UUID DEFAULT NULL,
  p_existing_entry_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_share RECORD;
  v_photo_id UUID;
  v_entry RECORD;
BEGIN
  SELECT s.id, s.event_id, s.contest_id, s.label INTO v_share
  FROM public.app_contest_tablet_shares s
  WHERE s.token = p_token
    AND s.is_active = TRUE
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > NOW());

  IF v_share.id IS NULL THEN
    RAISE EXCEPTION 'Token de tablet inválido ou expirado.';
  END IF;

  -- 1. Insere a foto como aprovada e fonte admin
  INSERT INTO public.app_event_photos (
    event_id,
    photo_url,
    storage_path,
    media_type,
    source,
    moderation_status,
    consent_image_use,
    uploaded_by,
    submitted_by_ticket_id,
    submitted_by_person_id
  ) VALUES (
    v_share.event_id,
    p_photo_url,
    p_storage_path,
    'photo',
    'admin',
    'approved',
    TRUE,
    COALESCE(v_share.label, 'Tablet Concurso'),
    p_participant_ticket_id,
    p_participant_person_id
  )
  RETURNING id INTO v_photo_id;

  -- 2. Atualiza ou insere a candidatura no concurso
  IF p_existing_entry_id IS NOT NULL THEN
    UPDATE public.app_contest_entries e
    SET photo_id = v_photo_id
    WHERE e.id = p_existing_entry_id AND e.contest_id = v_share.contest_id
    RETURNING e.id, e.contest_id, e.photo_id INTO v_entry;

    IF v_entry.id IS NULL THEN
      RAISE EXCEPTION 'Candidatura não encontrada para atualização.';
    END IF;
  ELSE
    INSERT INTO public.app_contest_entries (
      contest_id,
      photo_id,
      participant_name,
      participant_person_id,
      participant_ticket_id
    ) VALUES (
      v_share.contest_id,
      v_photo_id,
      trim(p_participant_name),
      p_participant_person_id,
      p_participant_ticket_id
    )
    RETURNING id, contest_id, photo_id INTO v_entry;
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'entry_id', v_entry.id,
    'photo_id', v_photo_id,
    'photo_url', p_photo_url,
    'contest_id', v_share.contest_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_save_contest_photo(TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID) TO anon, authenticated, service_role;

-- 6. Função para remover candidatura via tablet token
CREATE OR REPLACE FUNCTION public.kiosk_remove_contest_entry(
  p_token TEXT,
  p_entry_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_target_contest_id UUID;
BEGIN
  SELECT s.contest_id INTO v_target_contest_id
  FROM public.app_contest_tablet_shares s
  WHERE s.token = p_token
    AND s.is_active = TRUE
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > NOW());

  IF v_target_contest_id IS NULL THEN
    RAISE EXCEPTION 'Token de tablet inválido ou expirado.';
  END IF;

  DELETE FROM public.app_contest_entries e
  WHERE e.id = p_entry_id AND e.contest_id = v_target_contest_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_remove_contest_entry(TEXT, UUID) TO anon, authenticated, service_role;

-- 7. Função para consultar apuração via tablet token
CREATE OR REPLACE FUNCTION public.kiosk_get_results(p_token TEXT)
RETURNS TABLE (
  contest_id UUID,
  entry_id UUID,
  participant_name TEXT,
  participant_person_id UUID,
  photo_id UUID,
  entry_status TEXT,
  vote_count BIGINT,
  first_vote_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_target_contest_id UUID;
BEGIN
  SELECT s.contest_id INTO v_target_contest_id
  FROM public.app_contest_tablet_shares s
  WHERE s.token = p_token
    AND s.is_active = TRUE
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > NOW());

  IF v_target_contest_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.contest_id,
    r.entry_id,
    r.participant_name,
    r.participant_person_id,
    r.photo_id,
    r.entry_status,
    r.vote_count,
    r.first_vote_at
  FROM public.app_contest_results r
  WHERE r.contest_id = v_target_contest_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_get_results(TEXT) TO anon, authenticated, service_role;
