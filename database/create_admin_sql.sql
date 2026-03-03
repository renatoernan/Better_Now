-- =========================================================================
-- SCRIPT DE CRIAÇÃO DO PRIMEIRO ADMINISTRADOR (SQL PURo)
-- Execute este script no SQL Editor do Supabase
-- =========================================================================

-- ATENÇÃO: Substitua 'seuemail@exemplo.com' e 'SuaSenhaForte123' abaixo
-- pelas credenciais REAIS que você quer usar para logar no sistema.

DO $$
DECLARE
  v_email VARCHAR(255) := 'admin@betternow.com'; -- MUDE SEU EMAIL AQUI
  v_password VARCHAR(255) := 'admin123456'; -- MUDE SUA SENHA AQUI
  v_user_id UUID := gen_random_uuid();
  v_encrypted_password VARCHAR;
BEGIN

  -- 1. Gerar o hash da senha (criptografia própria do Supabase/GoTrue)
  v_encrypted_password := crypt(v_password, gen_salt('bf'));

  -- 2. Inserir na tabela de autenticação oficial do Supabase (auth.users)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
    recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_email, v_encrypted_password, now(), 
    now(), now(), '{"provider":"email","providers":["email"]}', '{}', 
    now(), now(), '', '', '', ''
  );

  -- 3. Inserir a mesma identidade (UUID) no registro de Administradores Autorizados
  INSERT INTO public.app_admin_users (id, email, role, active)
  VALUES (v_user_id, v_email, 'admin', true);

END $$;

-- Verificar o usuário inserido
SELECT email, role, active FROM public.app_admin_users;
