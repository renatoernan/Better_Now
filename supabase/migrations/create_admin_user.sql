-- Criar usuário admin na tabela admin_users
-- Este usuário deve ser criado no Supabase Auth Dashboard primeiro

-- Inserir usuário admin (substitua o UUID pelo ID real do usuário criado no Auth)
INSERT INTO admin_users (id, email, role, created_at, last_login)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- Substitua pelo UUID real
  'betternow@cesire.com.br',
  'admin',
  NOW(),
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Garantir que as permissões estão corretas
GRANT SELECT, INSERT, UPDATE ON admin_users TO authenticated;
GRANT SELECT ON admin_users TO anon;

-- Verificar se RLS está habilitado
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários autenticados vejam apenas seus próprios dados
CREATE POLICY "Users can view their own admin record" ON admin_users
  FOR SELECT USING (auth.uid() = id);

-- Política para permitir inserção de novos admins (apenas para admins existentes)
CREATE POLICY "Admins can insert new admins" ON admin_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para permitir atualização do last_login
CREATE POLICY "Users can update their own last_login" ON admin_users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);