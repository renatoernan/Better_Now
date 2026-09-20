-- 042_create_order_share_links.sql
-- Links de consulta somente-leitura dos pedidos de um evento.
--
-- O link é /pedidos/<token> e exige senha. Nada aqui é legível pelo anon: a
-- verificação acontece dentro da Edge Function view-event-orders, que roda com
-- service_role. Verificar senha no navegador não protegeria nada, já que a
-- resposta viria do próprio cliente.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
  IF to_regclass('public.app_event_orders') IS NULL THEN
    RAISE EXCEPTION 'app_event_orders não existe.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.app_event_order_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.app_events(id) ON DELETE CASCADE,

  token TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  label TEXT,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,

  -- Freio de força bruta: a Edge Function é o único caminho de verificação,
  -- então contar aqui basta para travar tentativas repetidas.
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,

  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_order_shares_event
  ON public.app_event_order_shares (event_id) WHERE revoked_at IS NULL;

ALTER TABLE public.app_event_order_shares ENABLE ROW LEVEL SECURITY;

-- Nenhuma política para anon: a tabela é invisível fora do service_role.
DROP POLICY IF EXISTS "order_shares_admin_all" ON public.app_event_order_shares;
CREATE POLICY "order_shares_admin_all" ON public.app_event_order_shares
  FOR ALL TO authenticated
  USING (public.is_mural_admin()) WITH CHECK (public.is_mural_admin());

REVOKE ALL ON public.app_event_order_shares FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_event_order_shares TO authenticated;
GRANT ALL PRIVILEGES ON public.app_event_order_shares TO service_role;

-- Criação do link. A senha é transformada em hash bcrypt aqui dentro e nunca
-- é gravada em claro nem devolvida.
CREATE OR REPLACE FUNCTION public.create_event_order_share(
  p_event_id UUID,
  p_password TEXT,
  p_label TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (share_id UUID, share_token TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT;
  v_id UUID;
BEGIN
  IF NOT public.is_mural_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem criar link de pedidos.';
  END IF;

  IF p_password IS NULL OR length(trim(p_password)) < 4 THEN
    RAISE EXCEPTION 'A senha precisa ter ao menos 4 caracteres.';
  END IF;

  -- 32 caracteres hexadecimais: não derivável do id do evento, que é público.
  v_token := encode(extensions.gen_random_bytes(16), 'hex');

  INSERT INTO public.app_event_order_shares
    (event_id, token, password_hash, label, expires_at, created_by)
  VALUES
    (p_event_id, v_token, extensions.crypt(p_password, extensions.gen_salt('bf')),
     nullif(trim(coalesce(p_label, '')), ''), p_expires_at, auth.uid())
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_event_order_share(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_event_order_share(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- Verificação usada pela Edge Function. Fica fora do alcance de anon e
-- authenticated de propósito: exposta, seria um oráculo de senha.
CREATE OR REPLACE FUNCTION public.verify_event_order_share(
  p_token TEXT,
  p_password TEXT
)
RETURNS TABLE (event_id UUID, label TEXT, reason TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  s RECORD;
BEGIN
  SELECT * INTO s FROM public.app_event_order_shares WHERE token = p_token;

  IF s IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'NOT_FOUND'::TEXT;
    RETURN;
  END IF;

  IF s.revoked_at IS NOT NULL OR NOT s.is_active THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'REVOKED'::TEXT;
    RETURN;
  END IF;

  IF s.expires_at IS NOT NULL AND NOW() > s.expires_at THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'EXPIRED'::TEXT;
    RETURN;
  END IF;

  IF s.locked_until IS NOT NULL AND NOW() < s.locked_until THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'LOCKED'::TEXT;
    RETURN;
  END IF;

  IF s.password_hash <> extensions.crypt(p_password, s.password_hash) THEN
    UPDATE public.app_event_order_shares
       SET failed_attempts = failed_attempts + 1,
           locked_until = CASE WHEN failed_attempts + 1 >= 5
                               THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END
     WHERE id = s.id;
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'BAD_PASSWORD'::TEXT;
    RETURN;
  END IF;

  UPDATE public.app_event_order_shares
     SET failed_attempts = 0, locked_until = NULL,
         access_count = access_count + 1, last_accessed_at = NOW()
   WHERE id = s.id;

  RETURN QUERY SELECT s.event_id, s.label, 'OK'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_event_order_share(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_event_order_share(TEXT, TEXT) TO service_role;

COMMENT ON TABLE public.app_event_order_shares IS
  'Links somente-leitura dos pedidos, protegidos por token e senha. Lidos apenas pela Edge Function view-event-orders.';
COMMENT ON FUNCTION public.verify_event_order_share(TEXT, TEXT) IS
  'Restrita ao service_role: exposta ao cliente viraria oráculo de força bruta de senha.';
