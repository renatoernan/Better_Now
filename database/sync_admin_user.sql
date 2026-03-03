-- =========================================================================
-- SCRIPT DE CORREÇÃO: SINCRONIZAR ADMINISTRADOR EXISTENTE
-- Execute este script no SQL Editor do Supabase
-- =========================================================================

-- Como você conseguiu fazer o login no painel (mas recebeu "User is not an admin"),
-- significa que o seu usuário "renato@cesire.com.br" JÁ ESTAVA CRIADO 
-- e a senha funcionou perfeitamente.
-- O problema é que o seu ID não estava na tabela "app_admin_users" ainda.

-- Este comando copia a sua conta oficial do Supabase Auth para a tabela de Admins:
INSERT INTO public.app_admin_users (id, email, role, active)
SELECT id, email, 'admin', true 
FROM auth.users 
WHERE email = 'renato@cesire.com.br'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', active = true;

-- Retorna a tabela para que você possa visualmente confirmar que seu email está lá:
SELECT email, role, active FROM public.app_admin_users;
