-- =========================================================================
-- SCRIPT DE CORREÇÃO: REGISTRO DE ADMINISTRADORES (PROJETO waeyfj)
-- Execute este script no SQL Editor do Supabase para autorizar seus usuários
-- =========================================================================

-- Este script pega os usuários que você já cadastrou na tela de Authentication
-- do Supabase e os insere na tabela app_admin_users, garantindo
-- as permissões da política RLS que aplicamos.

INSERT INTO public.app_admin_users (id, email, role, active)
SELECT 
    id, 
    email, 
    'admin' as role, 
    true as active
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET 
    role = 'admin',
    active = true;

-- Retorna a lista de administradores configurados para conferência
SELECT email, role, active FROM public.app_admin_users;
