-- Verificar e corrigir problemas de schema (versão simplificada)

-- 1. Verificar extensões necessárias
SELECT name, installed_version 
FROM pg_available_extensions 
WHERE name IN ('pgcrypto', 'uuid-ossp')
AND installed_version IS NOT NULL
ORDER BY name;

-- 2. Instalar extensões se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Verificar se o schema auth existe
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'auth';

-- 4. Verificar tabelas no schema auth
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'auth'
ORDER BY table_name;

-- 5. Verificar se a tabela users no schema auth existe e tem as colunas necessárias
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 6. Verificar se há dados na tabela auth.users
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN email IS NULL THEN 1 END) as users_without_email,
    COUNT(CASE WHEN encrypted_password IS NULL THEN 1 END) as users_without_password
FROM auth.users;

-- 7. Verificar o usuário específico
SELECT 
    id,
    email,
    encrypted_password IS NOT NULL as has_password,
    email_confirmed_at IS NOT NULL as email_confirmed,
    created_at,
    updated_at
FROM auth.users 
WHERE email = 'betternow@cesire.com.br';

-- 8. Verificar dados na tabela admin_users
SELECT 
    id,
    email,
    role,
    created_at
FROM admin_users 
WHERE email = 'betternow@cesire.com.br';

-- 9. Verificar se RLS está funcionando corretamente
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'admin_users';

-- 10. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'admin_users';