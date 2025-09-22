-- Verificar saúde do banco de dados e configurações

-- 1. Verificar se as tabelas existem
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admin_users', 'users');

-- 2. Verificar estrutura da tabela admin_users
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'admin_users'
ORDER BY ordinal_position;

-- 3. Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'admin_users';

-- 4. Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'admin_users';

-- 5. Verificar permissões da tabela
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
AND table_name = 'admin_users'
AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;

-- 6. Verificar dados na tabela
SELECT id, email, role, created_at
FROM admin_users
LIMIT 5;

-- 7. Verificar configurações do auth schema
SELECT count(*) as total_users
FROM auth.users;

-- 8. Verificar se existe o usuário específico no auth
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'betternow@cesire.com.br';