-- Criar usuário diretamente no auth.users e admin_users (versão simplificada)

-- 1. Verificar se o usuário já existe no auth
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'betternow@cesire.com.br';

-- 2. Verificar se o usuário já existe na tabela admin_users
SELECT id, email, role FROM admin_users WHERE email = 'betternow@cesire.com.br';

-- 3. Criar um usuário temporário para teste (se não existir)
DO $$
DECLARE
    user_uuid uuid;
    user_exists boolean := false;
BEGIN
    -- Verificar se o usuário já existe
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'betternow@cesire.com.br') INTO user_exists;
    
    IF NOT user_exists THEN
        -- Gerar um UUID para o usuário
        user_uuid := gen_random_uuid();
        
        -- Inserir no auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role
        ) VALUES (
            user_uuid,
            '00000000-0000-0000-0000-000000000000',
            'betternow@cesire.com.br',
            crypt('admin123', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider": "email", "providers": ["email"]}',
            '{}',
            false,
            'authenticated'
        );
        
        RAISE NOTICE 'Usuário criado no auth.users com ID: %', user_uuid;
    ELSE
        -- Obter o ID do usuário existente
        SELECT id INTO user_uuid FROM auth.users WHERE email = 'betternow@cesire.com.br';
        RAISE NOTICE 'Usuário já existe no auth.users com ID: %', user_uuid;
    END IF;
    
    -- Verificar se já existe na tabela admin_users
    IF NOT EXISTS(SELECT 1 FROM admin_users WHERE id = user_uuid) THEN
        -- Inserir na tabela admin_users
        INSERT INTO admin_users (id, email, role, created_at, updated_at)
        VALUES (user_uuid, 'betternow@cesire.com.br', 'admin', now(), now());
        
        RAISE NOTICE 'Usuário inserido na tabela admin_users';
    ELSE
        RAISE NOTICE 'Usuário já existe na tabela admin_users';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro: %', SQLERRM;
END $$;

-- 4. Confirmar o email do usuário
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'betternow@cesire.com.br';

-- 5. Verificar resultado final
SELECT 
    'auth.users' as tabela,
    u.id,
    u.email,
    u.email_confirmed_at,
    u.created_at
FROM auth.users u
WHERE u.email = 'betternow@cesire.com.br'

UNION ALL

SELECT 
    'admin_users' as tabela,
    au.id,
    au.email,
    au.created_at::timestamptz as email_confirmed_at,
    au.created_at
FROM admin_users au
WHERE au.email = 'betternow@cesire.com.br';