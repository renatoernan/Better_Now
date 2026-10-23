-- 051_allow_group_contest_entries.sql
-- Suporte a candidaturas coletivas (grupos, casais e temas livres) nos concursos.
--
-- Permite que candidaturas concorram sem vínculo obrigatório a um ingresso ou pessoa,
-- com nome/tema opcional (ex: "Os Anões", "Casal Fantasia").

DO $$
BEGIN
  IF to_regclass('public.app_contest_entries') IS NULL THEN
    RAISE EXCEPTION 'app_contest_entries não existe. Aplique as migrations 039 e 040 antes desta.';
  END IF;
END $$;

-- 1. Torna participant_name opcional e adiciona a coluna entry_type
ALTER TABLE public.app_contest_entries
  ALTER COLUMN participant_name DROP NOT NULL;

ALTER TABLE public.app_contest_entries
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'individual'
  CHECK (entry_type IN ('individual', 'group', 'couple', 'other'));

COMMENT ON COLUMN public.app_contest_entries.entry_type IS
  'Modalidade da candidatura: individual (padrão), group, couple ou other.';

-- 2. Atualiza a view de apuração interna (admin e kiosk)
DROP VIEW IF EXISTS public.app_contest_results CASCADE;

CREATE OR REPLACE VIEW public.app_contest_results
WITH (security_invoker = true) AS
SELECT
  e.contest_id,
  e.id AS entry_id,
  e.participant_name,
  e.participant_person_id,
  e.entry_type,
  e.photo_id,
  e.status AS entry_status,
  COUNT(v.id) FILTER (WHERE v.voided_at IS NULL) AS vote_count,
  MIN(v.created_at) FILTER (WHERE v.voided_at IS NULL) AS first_vote_at
FROM public.app_contest_entries e
LEFT JOIN public.app_contest_votes v ON v.entry_id = e.id
GROUP BY e.contest_id, e.id, e.participant_name, e.participant_person_id, e.entry_type, e.photo_id, e.status;

GRANT SELECT ON public.app_contest_results TO authenticated, service_role;

-- 3. Atualiza as views públicas para o Telão
DROP VIEW IF EXISTS public.app_public_contest_results CASCADE;

CREATE OR REPLACE VIEW public.app_public_contest_results AS
SELECT
  c.id            AS contest_id,
  c.event_id,
  c.title         AS contest_title,
  c.status        AS contest_status,
  e.id            AS entry_id,
  e.participant_name,
  e.entry_type,
  p.photo_url,
  COUNT(v.id) FILTER (WHERE v.voided_at IS NULL) AS vote_count,
  MIN(v.created_at) FILTER (WHERE v.voided_at IS NULL) AS first_vote_at
FROM public.app_event_contests c
JOIN public.app_contest_entries e ON e.contest_id = c.id AND e.status = 'active'
LEFT JOIN public.app_event_photos p ON p.id = e.photo_id
LEFT JOIN public.app_contest_votes v ON v.entry_id = e.id
WHERE c.deleted_at IS NULL
  AND (
    (c.show_live_results AND c.status = 'voting')
    OR c.status = 'published'
  )
GROUP BY c.id, c.event_id, c.title, c.status, e.id, e.participant_name, e.entry_type, p.photo_url;

GRANT SELECT ON public.app_public_contest_results TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.app_public_contest_entries CASCADE;

CREATE OR REPLACE VIEW public.app_public_contest_entries
WITH (security_invoker = true) AS
SELECT
  c.id      AS contest_id,
  c.event_id,
  c.title   AS contest_title,
  c.status  AS contest_status,
  c.show_live_results,
  e.id      AS entry_id,
  e.participant_name,
  e.entry_type,
  e.display_order,
  p.photo_url
FROM public.app_event_contests c
JOIN public.app_contest_entries e ON e.contest_id = c.id AND e.status = 'active'
LEFT JOIN public.app_event_photos p ON p.id = e.photo_id
WHERE c.deleted_at IS NULL AND c.status <> 'draft';

GRANT SELECT ON public.app_public_contest_entries TO anon, authenticated, service_role;

-- 4. Atualiza a função RPC para salvar foto no tablet com suporte a grupos/casais
DROP FUNCTION IF EXISTS public.kiosk_save_contest_photo(TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.kiosk_save_contest_photo(TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.kiosk_save_contest_photo(
  p_token TEXT,
  p_photo_url TEXT,
  p_storage_path TEXT,
  p_participant_name TEXT DEFAULT NULL,
  p_participant_ticket_id UUID DEFAULT NULL,
  p_participant_person_id UUID DEFAULT NULL,
  p_existing_entry_id UUID DEFAULT NULL,
  p_entry_type TEXT DEFAULT 'individual'
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
  v_entry_type TEXT;
  v_clean_name TEXT;
  v_caption TEXT;
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

  v_entry_type := COALESCE(NULLIF(trim(p_entry_type), ''), 'individual');
  v_clean_name := NULLIF(trim(p_participant_name), '');

  v_caption := COALESCE(
    v_clean_name,
    CASE
      WHEN v_entry_type = 'group' THEN 'Grupo'
      WHEN v_entry_type = 'couple' THEN 'Casal'
      ELSE 'Candidato'
    END
  );

  -- 1. Insere a foto como aprovada no mural
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
    submitted_by_person_id,
    caption
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
    p_participant_person_id,
    v_caption
  )
  RETURNING id INTO v_photo_id;

  -- 2. Atualiza ou insere a candidatura no concurso
  IF p_existing_entry_id IS NOT NULL THEN
    UPDATE public.app_contest_entries e
    SET photo_id = v_photo_id,
        participant_name = COALESCE(v_clean_name, e.participant_name),
        entry_type = COALESCE(v_entry_type, e.entry_type)
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
      participant_ticket_id,
      entry_type
    ) VALUES (
      v_share.contest_id,
      v_photo_id,
      v_clean_name,
      p_participant_person_id,
      p_participant_ticket_id,
      v_entry_type
    )
    RETURNING id, contest_id, photo_id INTO v_entry;
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'entry_id', v_entry.id,
    'photo_id', v_photo_id,
    'photo_url', p_photo_url,
    'contest_id', v_share.contest_id,
    'entry_type', v_entry_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_save_contest_photo(TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, TEXT) TO anon, authenticated, service_role;

-- 5. Atualiza a função kiosk_get_results para incluir entry_type
DROP FUNCTION IF EXISTS public.kiosk_get_results(TEXT);

CREATE OR REPLACE FUNCTION public.kiosk_get_results(p_token TEXT)
RETURNS TABLE (
  contest_id UUID,
  entry_id UUID,
  participant_name TEXT,
  participant_person_id UUID,
  photo_id UUID,
  entry_status TEXT,
  vote_count BIGINT,
  first_vote_at TIMESTAMPTZ,
  entry_type TEXT
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
    r.first_vote_at,
    r.entry_type
  FROM public.app_contest_results r
  WHERE r.contest_id = v_target_contest_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_get_results(TEXT) TO anon, authenticated, service_role;
