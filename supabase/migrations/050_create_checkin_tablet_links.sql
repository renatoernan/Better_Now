-- 050_create_checkin_tablet_links.sql
-- Links de acesso direto e seguro para Portaria & Check-in.
--
-- Permite que dispositivos da recepção (tablets/celulares) operem a portaria
-- (leitura de QR Code, busca nominal de convidados e validação de ingressos)
-- via token dedicado, sem necessidade de login na conta administrativa
-- e sem acesso aos dados confidenciais (pedidos, valores, relatórios, configurações).

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
  IF to_regclass('public.app_events') IS NULL THEN
    RAISE EXCEPTION 'app_events não existe.';
  END IF;
  IF to_regclass('public.app_event_tickets') IS NULL THEN
    RAISE EXCEPTION 'app_event_tickets não existe.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.app_event_checkin_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.app_events(id) ON DELETE CASCADE,

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

CREATE INDEX IF NOT EXISTS idx_checkin_shares_event
  ON public.app_event_checkin_shares (event_id) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_checkin_shares_token
  ON public.app_event_checkin_shares (token);

-- RLS: Apenas administradores autenticados podem listar, criar e revogar links na tabela
ALTER TABLE public.app_event_checkin_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkin_shares_admin_all" ON public.app_event_checkin_shares;
CREATE POLICY "checkin_shares_admin_all" ON public.app_event_checkin_shares
  FOR ALL TO authenticated
  USING (public.is_mural_admin()) WITH CHECK (public.is_mural_admin());

REVOKE ALL ON public.app_event_checkin_shares FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_event_checkin_shares TO authenticated;
GRANT ALL PRIVILEGES ON public.app_event_checkin_shares TO service_role;

-- 1. Criação do link da portaria pelo administrador
CREATE OR REPLACE FUNCTION public.create_checkin_share(
  p_event_id UUID,
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
  v_exists BOOLEAN;
BEGIN
  IF NOT public.is_mural_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem criar links para portaria.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.app_events e WHERE e.id = p_event_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'Evento não encontrado.';
  END IF;

  v_token := encode(extensions.gen_random_bytes(16), 'hex');

  INSERT INTO public.app_event_checkin_shares
    (event_id, token, label, expires_at, created_by)
  VALUES
    (p_event_id, v_token, nullif(trim(coalesce(p_label, '')), ''), p_expires_at, auth.uid())
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_checkin_share(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_checkin_share(UUID, TEXT, TIMESTAMPTZ) TO authenticated, service_role;

-- 2. Revogação de link de portaria pelo administrador
CREATE OR REPLACE FUNCTION public.revoke_checkin_share(p_share_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.is_mural_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem revogar links de portaria.';
  END IF;

  UPDATE public.app_event_checkin_shares s
  SET is_active = FALSE, revoked_at = NOW()
  WHERE s.id = p_share_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_checkin_share(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_checkin_share(UUID) TO authenticated, service_role;

-- 3. Verificação do token de portaria (chamada pelo tablet/celular ao abrir a página)
DROP FUNCTION IF EXISTS public.verify_checkin_token(TEXT);

CREATE OR REPLACE FUNCTION public.verify_checkin_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_share RECORD;
  v_event RECORD;
BEGIN
  -- 1. Localiza o share ativo e não expirado
  SELECT s.id, s.token, s.label, s.event_id INTO v_share
  FROM public.app_event_checkin_shares s
  WHERE s.token = p_token
    AND s.is_active = TRUE
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > NOW());

  IF v_share.id IS NULL THEN
    RETURN jsonb_build_object('valid', FALSE, 'error', 'Link de portaria inválido, expirado ou revogado.');
  END IF;

  -- 2. Atualiza contagem de acesso e data
  UPDATE public.app_event_checkin_shares s
  SET access_count = s.access_count + 1,
      last_accessed_at = NOW()
  WHERE s.id = v_share.id;

  -- 3. Metadados do evento
  SELECT e.id, e.title, e.date, e.time, e.location
  INTO v_event
  FROM public.app_events e
  WHERE e.id = v_share.event_id;

  RETURN jsonb_build_object(
    'valid', TRUE,
    'share_id', v_share.id,
    'token', v_share.token,
    'label', coalesce(v_share.label, 'Portaria'),
    'event_id', v_share.event_id,
    'event_title', coalesce(v_event.title, 'Evento'),
    'event_date', v_event.date,
    'event_time', v_event.time,
    'event_location', coalesce(v_event.location, '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_checkin_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_checkin_token(TEXT) TO anon, authenticated, service_role;

-- 4. Check-in seguro de ingresso validado via token da portaria
CREATE OR REPLACE FUNCTION public.kiosk_checkin_ticket(
  p_token TEXT,
  p_ticket_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_share RECORD;
  v_ticket RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Valida o token da portaria
  SELECT s.id, s.event_id INTO v_share
  FROM public.app_event_checkin_shares s
  WHERE s.token = p_token
    AND s.is_active = TRUE
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > NOW());

  IF v_share.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Sessão de portaria inválida ou expirada.');
  END IF;

  -- Localiza o ingresso
  SELECT t.id, t.event_id, t.status, t.used_at INTO v_ticket
  FROM public.app_event_tickets t
  WHERE t.id = p_ticket_id;

  IF v_ticket.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Ingresso não encontrado.');
  END IF;

  IF v_ticket.event_id <> v_share.event_id THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Ingresso não pertence a este evento.');
  END IF;

  IF v_ticket.status = 'used' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'already_used', TRUE,
      'error', 'Ingresso já foi utilizado anteriormente.',
      'used_at', v_ticket.used_at
    );
  END IF;

  -- Efetua o check-in
  UPDATE public.app_event_tickets t
  SET status = 'used', used_at = v_now
  WHERE t.id = p_ticket_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'ticket_id', p_ticket_id,
    'used_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.kiosk_checkin_ticket(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_checkin_ticket(TEXT, UUID) TO anon, authenticated, service_role;

-- 5. Desfazer check-in seguro via token da portaria
CREATE OR REPLACE FUNCTION public.kiosk_undo_checkin_ticket(
  p_token TEXT,
  p_ticket_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_share RECORD;
  v_ticket RECORD;
BEGIN
  SELECT s.id, s.event_id INTO v_share
  FROM public.app_event_checkin_shares s
  WHERE s.token = p_token
    AND s.is_active = TRUE
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > NOW());

  IF v_share.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Sessão de portaria inválida ou expirada.');
  END IF;

  SELECT t.id, t.event_id INTO v_ticket
  FROM public.app_event_tickets t
  WHERE t.id = p_ticket_id;

  IF v_ticket.id IS NULL OR v_ticket.event_id <> v_share.event_id THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Ingresso não pertence a este evento.');
  END IF;

  UPDATE public.app_event_tickets t
  SET status = 'valid', used_at = NULL
  WHERE t.id = p_ticket_id;

  RETURN jsonb_build_object('success', TRUE, 'ticket_id', p_ticket_id);
END;
$$;

REVOKE ALL ON FUNCTION public.kiosk_undo_checkin_ticket(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_undo_checkin_ticket(TEXT, UUID) TO anon, authenticated, service_role;

-- 6. Garantir permissões de leitura nos cadastros necessários para portaria
GRANT SELECT ON public.app_people TO anon;
