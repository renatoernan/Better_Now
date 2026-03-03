-- =========================================================================
-- CORREÇÃO: RLS DA TABELA app_admin_users
-- O problema: a tabela tem RLS ativado mas NENHUMA política de leitura,
-- então o sistema não consegue verificar se o usuário logado é admin.
-- =========================================================================

-- 1. Garantir RLS habilitado
ALTER TABLE app_admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas
DROP POLICY IF EXISTS "Allow authenticated read own admin" ON app_admin_users;
DROP POLICY IF EXISTS "Allow admin full access" ON app_admin_users;
DROP POLICY IF EXISTS "Admin users are viewable by authenticated users" ON app_admin_users;

-- 3. Permitir que usuários autenticados LEIAM seu próprio registro
-- (necessário para o login verificar se é admin)
CREATE POLICY "Allow authenticated read own admin"
ON app_admin_users FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 4. Permitir que admins façam UPDATE no seu próprio registro
-- (necessário para atualizar o last_login)
CREATE POLICY "Allow admin update own record"
ON app_admin_users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
