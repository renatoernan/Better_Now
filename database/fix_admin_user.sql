-- Temporariamente desabilitar RLS para inserir o usuário admin
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Inserir o usuário admin com o role correto
INSERT INTO admin_users (id, email, role, created_at, last_login)
VALUES (
    gen_random_uuid(),
    'betternow@cesire.com.br',
    'admin',
    NOW(),
    NULL
)
ON CONFLICT (email) DO NOTHING;

-- Reabilitar RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Garantir permissões para os roles anon e authenticated
GRANT SELECT, INSERT, UPDATE ON admin_users TO anon;
GRANT SELECT, INSERT, UPDATE ON admin_users TO authenticated;

-- Verificar se o usuário foi inserido
SELECT * FROM admin_users WHERE email = 'betternow@cesire.com.br';