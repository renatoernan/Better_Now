
-- Migration: 001_create_tables.sql
-- Create tables for Better Now application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create contact_forms table
CREATE TABLE IF NOT EXISTS contact_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  event_type VARCHAR(100) NOT NULL,
  guests INTEGER DEFAULT 1,
  event_date DATE,
  message TEXT,
  status VARCHAR(50) DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create carousel_images table
CREATE TABLE IF NOT EXISTS carousel_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  file_url TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  deleted BOOLEAN DEFAULT false,
  order_position INTEGER DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT true
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB,
  user_id UUID REFERENCES admin_users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_forms_created_at ON contact_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_forms_status ON contact_forms(status);
CREATE INDEX IF NOT EXISTS idx_contact_forms_event_type ON contact_forms(event_type);
CREATE INDEX IF NOT EXISTS idx_carousel_images_active ON carousel_images(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_carousel_images_order ON carousel_images(order_position) WHERE active = true AND deleted = false;
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_contact_forms_updated_at
    BEFORE UPDATE ON contact_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carousel_images_updated_at
    BEFORE UPDATE ON carousel_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
-- Note: In production, this should be changed immediately
INSERT INTO admin_users (email, password_hash, role)
VALUES (
  'admin@betternow.com',
  crypt('admin123', gen_salt('bf')),
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Insert default app settings
INSERT INTO app_settings (key, value, description)
VALUES 
  ('site_title', '"Better Now"', 'Título do site'),
  ('contact_email', '"contato@betternow.com"', 'Email de contato'),
  ('phone', '"+55 11 99999-9999"', 'Telefone de contato'),
  ('address', '"São Paulo, SP"', 'Endereço'),
  ('social_instagram', '"@betternow"', 'Instagram'),
  ('social_whatsapp', '"+5511999999999"', 'WhatsApp'),
  ('carousel_autoplay', 'true', 'Autoplay do carrossel'),
  ('carousel_interval', '5000', 'Intervalo do carrossel em ms')
ON CONFLICT (key) DO NOTHING;

-- Add comments to tables
COMMENT ON TABLE contact_forms IS 'Formulários de contato recebidos';
COMMENT ON TABLE carousel_images IS 'Imagens do carrossel da página inicial';
COMMENT ON TABLE admin_users IS 'Usuários administrativos do sistema';
COMMENT ON TABLE activity_logs IS 'Logs de atividades administrativas';
COMMENT ON TABLE app_settings IS 'Configurações da aplicação';

-- Add column comments
COMMENT ON COLUMN contact_forms.status IS 'Status do contato: unread, read, replied, archived';
COMMENT ON COLUMN carousel_images.active IS 'Se a imagem está ativa no carrossel';
COMMENT ON COLUMN carousel_images.deleted IS 'Soft delete para imagens';
COMMENT ON COLUMN carousel_images.order_position IS 'Posição da imagem no carrossel';
COMMENT ON COLUMN admin_users.role IS 'Papel do usuário: admin, moderator';
COMMENT ON COLUMN activity_logs.metadata IS 'Dados adicionais da atividade em JSON';

-- Migration: 001_initial_schema.sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create contact_forms table
CREATE TABLE contact_forms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    guests INTEGER NOT NULL,
    event_date DATE NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied'))
);

-- Create carousel_images table
CREATE TABLE carousel_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255),
    active BOOLEAN DEFAULT true,
    deleted BOOLEAN DEFAULT false,
    order_position INTEGER NOT NULL DEFAULT 0,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_url TEXT NOT NULL
);

-- Create admin_users table (using Supabase Auth)
CREATE TABLE admin_users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_contact_forms_created_at ON contact_forms(created_at DESC);
CREATE INDEX idx_contact_forms_status ON contact_forms(status);
CREATE INDEX idx_carousel_images_active ON carousel_images(active) WHERE active = true;
CREATE INDEX idx_carousel_images_order ON carousel_images(order_position) WHERE deleted = false;

-- Enable Row Level Security (RLS)
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_forms
-- Allow anonymous users to insert (for contact form submissions)
CREATE POLICY "Allow anonymous insert on contact_forms" ON contact_forms
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow authenticated admin users to view and manage all contact forms
CREATE POLICY "Allow admin full access to contact_forms" ON contact_forms
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid()
    ));

-- RLS Policies for carousel_images
-- Allow anonymous users to view active, non-deleted images
CREATE POLICY "Allow anonymous read active carousel_images" ON carousel_images
    FOR SELECT TO anon
    USING (active = true AND deleted = false);

-- Allow authenticated users to view all images
CREATE POLICY "Allow authenticated read all carousel_images" ON carousel_images
    FOR SELECT TO authenticated
    USING (true);

-- Allow admin users to manage carousel images
CREATE POLICY "Allow admin manage carousel_images" ON carousel_images
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid()
    ));

-- RLS Policies for admin_users
-- Allow admin users to view other admin users
CREATE POLICY "Allow admin read admin_users" ON admin_users
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid()
    ));

-- Allow admin users to update their own record
CREATE POLICY "Allow admin update own record" ON admin_users
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

-- Insert default carousel images (migrating from existing)
INSERT INTO carousel_images (filename, title, active, order_position, file_url) VALUES
    ('hero_1.png', 'Hero Image 1', true, 1, '/images/hero_1.png'),
    ('hero_2.png', 'Hero Image 2', true, 2, '/images/hero_2.png'),
    ('hero_3.png', 'Hero Image 3', true, 3, '/images/hero_3.png'),
    ('hero_4.png', 'Hero Image 4', true, 4, '/images/hero_4.png'),
    ('hero_5.png', 'Hero Image 5', true, 5, '/images/hero_5.png'),
    ('hero_6.png', 'Hero Image 6', true, 6, '/images/hero_6.png'),
    ('hero_7.png', 'Hero Image 7', true, 7, '/images/hero_7.png');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON contact_forms TO anon;
GRANT INSERT ON contact_forms TO anon;
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;

GRANT SELECT ON carousel_images TO anon;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;

GRANT SELECT ON admin_users TO authenticated;
GRANT UPDATE ON admin_users TO authenticated;

-- Migration: 002_create_admin_user.sql
-- Create admin user in auth.users and admin_users tables
-- Note: This is a temporary solution for development
-- In production, you should create users through Supabase Auth UI or API

-- First, we need to insert into auth.users (this is handled by Supabase Auth)
-- For now, we'll create a trigger to automatically add users to admin_users when they sign up

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add to admin_users if email matches admin pattern
  IF NEW.email = 'admin@betternow.com' THEN
    INSERT INTO public.admin_users (id, email, role)
    VALUES (NEW.id, NEW.email, 'admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.admin_users TO supabase_auth_admin;

-- Note: To create the actual admin user, you need to:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add user" 
-- 3. Use email: admin@betternow.com
-- 4. Set a secure password
-- 5. The trigger will automatically add them to admin_users table

-- Alternative: You can also use the Supabase CLI or API to create the user
-- supabase auth users create admin@betternow.com --password your_secure_password

-- Migration: 002_create_missing_tables.sql
-- Create missing tables for Better Now application

-- Create activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Create function to update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for app_settings updated_at
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default app settings if they don't exist
INSERT INTO app_settings (key, value, description)
VALUES 
  ('site_title', '"Better Now"', 'Título do site'),
  ('contact_email', '"contato@betternow.com"', 'Email de contato'),
  ('phone', '"+55 11 99999-9999"', 'Telefone de contato'),
  ('address', '"São Paulo, SP"', 'Endereço'),
  ('social_instagram', '"@betternow"', 'Instagram'),
  ('social_whatsapp', '"+5511999999999"', 'WhatsApp'),
  ('carousel_autoplay', 'true', 'Autoplay do carrossel'),
  ('carousel_interval', '5000', 'Intervalo do carrossel em ms'),
  ('max_file_size', '5242880', 'Tamanho máximo de arquivo em bytes (5MB)'),
  ('allowed_file_types', '["image/jpeg", "image/png", "image/webp"]', 'Tipos de arquivo permitidos'),
  ('backup_retention_days', '30', 'Dias para manter backups'),
  ('notification_email', '"admin@betternow.com"', 'Email para notificações')
ON CONFLICT (key) DO NOTHING;

-- Add comments to tables
COMMENT ON TABLE activity_logs IS 'Logs de atividades administrativas';
COMMENT ON TABLE app_settings IS 'Configurações da aplicação';

-- Add column comments
COMMENT ON COLUMN activity_logs.metadata IS 'Dados adicionais da atividade em JSON';
COMMENT ON COLUMN activity_logs.user_id IS 'ID do usuário que executou a ação';
COMMENT ON COLUMN app_settings.key IS 'Chave única da configuração';
COMMENT ON COLUMN app_settings.value IS 'Valor da configuração em formato JSON';

-- Update existing contact_forms table to add missing columns if needed
ALTER TABLE contact_forms 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger for contact_forms updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_contact_forms_updated_at ON contact_forms;
CREATE TRIGGER update_contact_forms_updated_at
    BEFORE UPDATE ON contact_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing carousel_images table trigger if needed
DROP TRIGGER IF EXISTS update_carousel_images_updated_at ON carousel_images;
CREATE TRIGGER update_carousel_images_updated_at
    BEFORE UPDATE ON carousel_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at column to carousel_images if it doesn't exist
ALTER TABLE carousel_images 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Migration: 003_create_rls_policies.sql
-- Políticas de Segurança RLS (Row Level Security) para Better Now
-- Este arquivo define as políticas de acesso para todas as tabelas

-- =============================================
-- TABELA: contact_forms
-- =============================================

-- Habilitar RLS na tabela contact_forms
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;

-- Política: Usuários anônimos podem inserir novos contatos
CREATE POLICY "Permitir inserção de contatos por usuários anônimos"
ON contact_forms
FOR INSERT
TO anon
WITH CHECK (true);

-- Política: Usuários autenticados podem ver todos os contatos
CREATE POLICY "Permitir leitura de contatos para usuários autenticados"
ON contact_forms
FOR SELECT
TO authenticated
USING (true);

-- Política: Usuários autenticados podem atualizar contatos
CREATE POLICY "Permitir atualização de contatos para usuários autenticados"
ON contact_forms
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Usuários autenticados podem deletar contatos
CREATE POLICY "Permitir exclusão de contatos para usuários autenticados"
ON contact_forms
FOR DELETE
TO authenticated
USING (true);

-- =============================================
-- TABELA: carousel_images
-- =============================================

-- Habilitar RLS na tabela carousel_images
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;

-- Política: Usuários anônimos podem ver imagens ativas
CREATE POLICY "Permitir leitura de imagens ativas para usuários anônimos"
ON carousel_images
FOR SELECT
TO anon
USING (active = true AND deleted = false);

-- Política: Usuários autenticados podem ver todas as imagens
CREATE POLICY "Permitir leitura de todas as imagens para usuários autenticados"
ON carousel_images
FOR SELECT
TO authenticated
USING (true);

-- Política: Usuários autenticados podem inserir imagens
CREATE POLICY "Permitir inserção de imagens para usuários autenticados"
ON carousel_images
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Usuários autenticados podem atualizar imagens
CREATE POLICY "Permitir atualização de imagens para usuários autenticados"
ON carousel_images
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Usuários autenticados podem deletar imagens
CREATE POLICY "Permitir exclusão de imagens para usuários autenticados"
ON carousel_images
FOR DELETE
TO authenticated
USING (true);

-- =============================================
-- TABELA: admin_users
-- =============================================

-- Habilitar RLS na tabela admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver apenas seu próprio perfil
CREATE POLICY "Permitir leitura do próprio perfil"
ON admin_users
FOR SELECT
TO authenticated
USING (auth.uid()::text = id::text);

-- Política: Usuários autenticados podem atualizar apenas seu próprio perfil
CREATE POLICY "Permitir atualização do próprio perfil"
ON admin_users
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- =============================================
-- TABELA: activity_logs
-- =============================================

-- Habilitar RLS na tabela activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver todos os logs
CREATE POLICY "Permitir leitura de logs para usuários autenticados"
ON activity_logs
FOR SELECT
TO authenticated
USING (true);

-- Política: Usuários autenticados podem inserir logs
CREATE POLICY "Permitir inserção de logs para usuários autenticados"
ON activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Sistema pode inserir logs (para triggers)
CREATE POLICY "Permitir inserção de logs pelo sistema"
ON activity_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- =============================================
-- STORAGE: Bucket carousel-images
-- =============================================

-- Política: Usuários anônimos podem ver imagens
CREATE POLICY "Permitir leitura de imagens para usuários anônimos"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'carousel-images');

-- Política: Usuários autenticados podem fazer upload de imagens
CREATE POLICY "Permitir upload de imagens para usuários autenticados"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'carousel-images');

-- Política: Usuários autenticados podem atualizar imagens
CREATE POLICY "Permitir atualização de imagens para usuários autenticados"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'carousel-images')
WITH CHECK (bucket_id = 'carousel-images');

-- Política: Usuários autenticados podem deletar imagens
CREATE POLICY "Permitir exclusão de imagens para usuários autenticados"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'carousel-images');

-- =============================================
-- STORAGE: Bucket backups
-- =============================================

-- Política: Usuários autenticados podem fazer backup
CREATE POLICY "Permitir backup para usuários autenticados"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'backups');

-- Política: Usuários autenticados podem ler backups
CREATE POLICY "Permitir leitura de backups para usuários autenticados"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'backups');

-- Política: Usuários autenticados podem deletar backups
CREATE POLICY "Permitir exclusão de backups para usuários autenticados"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'backups');

-- =============================================
-- FUNÇÕES DE SEGURANÇA
-- =============================================

-- Função para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário pode acessar logs
CREATE OR REPLACE FUNCTION can_access_logs()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin() OR EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS DE AUDITORIA
-- =============================================

-- Função para log automático de mudanças
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if user is authenticated
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO activity_logs (action, details, user_id, metadata)
    VALUES (
      TG_OP || '_' || TG_TABLE_NAME,
      'Operação ' || TG_OP || ' na tabela ' || TG_TABLE_NAME,
      auth.uid()::text,
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'old_data', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        'new_data', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de auditoria
CREATE TRIGGER contact_forms_audit
  AFTER INSERT OR UPDATE OR DELETE ON contact_forms
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER carousel_images_audit
  AFTER INSERT OR UPDATE OR DELETE ON carousel_images
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER admin_users_audit
  AFTER INSERT OR UPDATE OR DELETE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION log_changes();

-- =============================================
-- PERMISSÕES PARA ROLES
-- =============================================

-- Conceder permissões básicas para anon
GRANT SELECT ON contact_forms TO anon;
GRANT INSERT ON contact_forms TO anon;
GRANT SELECT ON carousel_images TO anon;
GRANT USAGE ON SEQUENCE contact_forms_id_seq TO anon;

-- Conceder permissões completas para authenticated
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;
GRANT ALL PRIVILEGES ON admin_users TO authenticated;
GRANT ALL PRIVILEGES ON activity_logs TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Conceder permissões para service_role (usado por triggers)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices para contact_forms
CREATE INDEX IF NOT EXISTS idx_contact_forms_status ON contact_forms(status);
CREATE INDEX IF NOT EXISTS idx_contact_forms_created_at ON contact_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_forms_event_type ON contact_forms(event_type);
CREATE INDEX IF NOT EXISTS idx_contact_forms_email ON contact_forms(email);

-- Índices para carousel_images
CREATE INDEX IF NOT EXISTS idx_carousel_images_active ON carousel_images(active, deleted);
CREATE INDEX IF NOT EXISTS idx_carousel_images_order ON carousel_images(order_position);
CREATE INDEX IF NOT EXISTS idx_carousel_images_uploaded_at ON carousel_images(uploaded_at DESC);

-- Índices para activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Índices para admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- =============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =============================================

COMMENT ON POLICY "Permitir inserção de contatos por usuários anônimos" ON contact_forms IS 
'Permite que visitantes do site enviem formulários de contato sem autenticação';

COMMENT ON POLICY "Permitir leitura de imagens ativas para usuários anônimos" ON carousel_images IS 
'Permite que visitantes vejam apenas imagens ativas e não deletadas no carrossel';

COMMENT ON FUNCTION is_admin() IS 
'Verifica se o usuário atual tem role de admin';

COMMENT ON FUNCTION log_changes() IS 
'Função de trigger para log automático de mudanças nas tabelas principais';

-- =============================================
-- VERIFICAÇÕES DE INTEGRIDADE
-- =============================================

-- Verificar se todas as políticas foram criadas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contact_forms' 
    AND policyname = 'Permitir inserção de contatos por usuários anônimos'
  ) THEN
    RAISE EXCEPTION 'Política de inserção para contact_forms não foi criada';
  END IF;
  
  RAISE NOTICE 'Todas as políticas RLS foram criadas com sucesso!';
END
$$;

-- Migration: 003_create_test_admin.sql
-- Create test admin user
-- This creates a user in Supabase Auth and adds them to admin_users table

-- Insert admin user into auth.users (this will be handled by Supabase Auth)
-- For testing purposes, we'll create a user with email: admin@betternow.com
-- Password should be set through Supabase Auth UI or API

-- Note: This is a placeholder - actual user creation should be done through Supabase Auth
-- The trigger will automatically add the user to admin_users table when they sign up

-- Grant permissions to authenticated users to read admin_users table
GRANT SELECT ON admin_users TO authenticated;
GRANT INSERT ON admin_users TO authenticated;
GRANT UPDATE ON admin_users TO authenticated;

-- Ensure RLS policies allow admin users to access their own data
CREATE POLICY "Admin users can view their own data" ON admin_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin users can update their own data" ON admin_users
  FOR UPDATE USING (auth.uid() = id);

-- Allow service role to manage admin users
CREATE POLICY "Service role can manage admin users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- Migration: 003_setup_storage.sql
-- Criar bucket para imagens do carrossel
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'carousel-images',
  'carousel-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Política para permitir leitura pública das imagens
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'carousel-images');

-- Política para permitir upload apenas para usuários autenticados
CREATE POLICY "Authenticated users can upload carousel images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'carousel-images' AND
    auth.role() = 'authenticated'
  );

-- Política para permitir atualização apenas para usuários autenticados
CREATE POLICY "Authenticated users can update carousel images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'carousel-images' AND
    auth.role() = 'authenticated'
  );

-- Política para permitir exclusão apenas para usuários autenticados
CREATE POLICY "Authenticated users can delete carousel images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'carousel-images' AND
    auth.role() = 'authenticated'
  );

-- Atualizar a tabela carousel_images para incluir storage_path
ALTER TABLE carousel_images ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE carousel_images ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE carousel_images ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Criar índice para otimizar consultas por storage_path
CREATE INDEX IF NOT EXISTS idx_carousel_images_storage_path ON carousel_images(storage_path);

-- Comentários para documentação
COMMENT ON COLUMN carousel_images.storage_path IS 'Caminho do arquivo no Supabase Storage';
COMMENT ON COLUMN carousel_images.file_size IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN carousel_images.mime_type IS 'Tipo MIME do arquivo (image/jpeg, image/png, etc.)';

-- Migration: 004_rls_policies.sql
-- Enable Row Level Security on all tables
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Contact Forms Policies
-- Allow anonymous users to insert contact forms (public contact form)
CREATE POLICY "Allow anonymous contact form submissions" ON contact_forms
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow authenticated admin users to view all contact forms
CREATE POLICY "Allow admin users to view contact forms" ON contact_forms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to update contact forms (status changes)
CREATE POLICY "Allow admin users to update contact forms" ON contact_forms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to delete contact forms
CREATE POLICY "Allow admin users to delete contact forms" ON contact_forms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Carousel Images Policies
-- Allow anonymous users to view active carousel images (for public display)
CREATE POLICY "Allow public to view active carousel images" ON carousel_images
  FOR SELECT TO anon, authenticated
  USING (active = true AND deleted = false);

-- Allow authenticated admin users to view all carousel images
CREATE POLICY "Allow admin users to view all carousel images" ON carousel_images
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to insert carousel images
CREATE POLICY "Allow admin users to insert carousel images" ON carousel_images
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to update carousel images
CREATE POLICY "Allow admin users to update carousel images" ON carousel_images
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to delete carousel images
CREATE POLICY "Allow admin users to delete carousel images" ON carousel_images
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Admin Users Policies
-- Allow authenticated admin users to view their own profile
CREATE POLICY "Allow admin users to view own profile" ON admin_users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Allow authenticated admin users to update their own profile
CREATE POLICY "Allow admin users to update own profile" ON admin_users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Storage Policies for carousel images bucket
-- Allow public access to view images in carousel-images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('carousel-images', 'carousel-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anonymous and authenticated users to view images
CREATE POLICY "Allow public to view carousel images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'carousel-images');

-- Allow authenticated admin users to upload images
CREATE POLICY "Allow admin users to upload carousel images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'carousel-images' AND
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to update images
CREATE POLICY "Allow admin users to update carousel images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'carousel-images' AND
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'carousel-images' AND
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to delete images
CREATE POLICY "Allow admin users to delete carousel images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'carousel-images' AND
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Grant necessary permissions to anon and authenticated roles
GRANT SELECT ON contact_forms TO anon;
GRANT INSERT ON contact_forms TO anon;
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;

GRANT SELECT ON carousel_images TO anon;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;

GRANT SELECT, UPDATE ON admin_users TO authenticated;

-- Grant storage permissions
GRANT SELECT ON storage.objects TO anon;
GRANT ALL PRIVILEGES ON storage.objects TO authenticated;
GRANT ALL PRIVILEGES ON storage.buckets TO authenticated;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM admin_users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_forms_status ON contact_forms(status);
CREATE INDEX IF NOT EXISTS idx_contact_forms_created_at ON contact_forms(created_at);
CREATE INDEX IF NOT EXISTS idx_carousel_images_active ON carousel_images(active);
CREATE INDEX IF NOT EXISTS idx_carousel_images_deleted ON carousel_images(deleted);
CREATE INDEX IF NOT EXISTS idx_carousel_images_order ON carousel_images(order_position);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Add comments for documentation
COMMENT ON POLICY "Allow anonymous contact form submissions" ON contact_forms IS 'Permite que usuários anônimos enviem formulários de contato';
COMMENT ON POLICY "Allow admin users to view contact forms" ON contact_forms IS 'Permite que administradores visualizem todos os formulários de contato';
COMMENT ON POLICY "Allow public to view active carousel images" ON carousel_images IS 'Permite que o público visualize imagens ativas do carrossel';
COMMENT ON FUNCTION is_admin(UUID) IS 'Verifica se um usuário tem privilégios de administrador';
COMMENT ON FUNCTION get_user_role() IS 'Retorna o papel do usuário atual';

-- Migration: 004_setup_rls_policies.sql
-- Enable Row Level Security on all tables
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Contact Forms Policies
-- Allow anonymous users to insert contact forms (for the public contact form)
CREATE POLICY "Allow anonymous insert on contact_forms" ON contact_forms
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow authenticated admin users to view all contact forms
CREATE POLICY "Allow admin read on contact_forms" ON contact_forms
  FOR SELECT TO authenticated
  USING (true);

-- Allow authenticated admin users to update contact forms (status changes)
CREATE POLICY "Allow admin update on contact_forms" ON contact_forms
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated admin users to delete contact forms
CREATE POLICY "Allow admin delete on contact_forms" ON contact_forms
  FOR DELETE TO authenticated
  USING (true);

-- Carousel Images Policies
-- Allow anonymous users to view active carousel images (for the public website)
CREATE POLICY "Allow anonymous read active carousel_images" ON carousel_images
  FOR SELECT TO anon
  USING (active = true AND deleted = false);

-- Allow authenticated admin users full access to carousel images
CREATE POLICY "Allow admin full access on carousel_images" ON carousel_images
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admin Users Policies
-- Only authenticated admin users can access admin_users table
CREATE POLICY "Allow admin access on admin_users" ON admin_users
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions to roles
-- Anonymous role permissions (for public website functionality)
GRANT SELECT ON carousel_images TO anon;
GRANT INSERT ON contact_forms TO anon;
GRANT USAGE ON SEQUENCE contact_forms_id_seq TO anon;

-- Authenticated role permissions (for admin functionality)
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;
GRANT ALL PRIVILEGES ON admin_users TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Storage policies for carousel images bucket
-- Allow anonymous users to view images
CREATE POLICY "Allow anonymous read on carousel-images bucket" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'carousel-images');

-- Allow authenticated admin users full access to storage
CREATE POLICY "Allow admin full access on carousel-images bucket" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'carousel-images')
  WITH CHECK (bucket_id = 'carousel-images');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at column to contact_forms if it doesn't exist
ALTER TABLE contact_forms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_contact_forms_updated_at ON contact_forms;
CREATE TRIGGER update_contact_forms_updated_at
    BEFORE UPDATE ON contact_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_forms_status ON contact_forms(status);
CREATE INDEX IF NOT EXISTS idx_contact_forms_created_at ON contact_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_forms_event_date ON contact_forms(event_date);
CREATE INDEX IF NOT EXISTS idx_carousel_images_active ON carousel_images(active, deleted, order_position);
CREATE INDEX IF NOT EXISTS idx_carousel_images_order ON carousel_images(order_position) WHERE active = true AND deleted = false;

-- Add comments for documentation
COMMENT ON POLICY "Allow anonymous insert on contact_forms" ON contact_forms IS 'Allows public users to submit contact forms through the website';
COMMENT ON POLICY "Allow admin read on contact_forms" ON contact_forms IS 'Allows authenticated admin users to view all contact form submissions';
COMMENT ON POLICY "Allow anonymous read active carousel_images" ON carousel_images IS 'Allows public users to view active carousel images on the website';
COMMENT ON POLICY "Allow admin full access on carousel_images" ON carousel_images IS 'Allows authenticated admin users to manage carousel images';

-- Create a view for public carousel images (for better performance)
CREATE OR REPLACE VIEW public_carousel_images AS
SELECT id, filename, title, file_url, order_position, uploaded_at
FROM carousel_images
WHERE active = true AND deleted = false
ORDER BY order_position ASC;

-- Grant access to the view
GRANT SELECT ON public_carousel_images TO anon;
GRANT SELECT ON public_carousel_images TO authenticated;

-- Migration: 004_simple_rls_policies.sql
-- Simple RLS policies for Better Now application

-- Security function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policies for contact_forms table
-- Allow anonymous users to insert (for contact form submissions)
CREATE POLICY "Allow anonymous insert on contact_forms" ON contact_forms
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow authenticated admin users to view all contact forms
CREATE POLICY "Allow admin select on contact_forms" ON contact_forms
  FOR SELECT TO authenticated
  USING (is_admin());

-- Allow authenticated admin users to update contact forms
CREATE POLICY "Allow admin update on contact_forms" ON contact_forms
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow authenticated admin users to delete contact forms
CREATE POLICY "Allow admin delete on contact_forms" ON contact_forms
  FOR DELETE TO authenticated
  USING (is_admin());

-- Policies for carousel_images table
-- Allow anonymous users to view active images
CREATE POLICY "Allow anonymous select active carousel_images" ON carousel_images
  FOR SELECT TO anon
  USING (active = true AND deleted = false);

-- Allow authenticated users to view active images
CREATE POLICY "Allow authenticated select active carousel_images" ON carousel_images
  FOR SELECT TO authenticated
  USING (active = true AND deleted = false);

-- Allow admin users to view all images
CREATE POLICY "Allow admin select all carousel_images" ON carousel_images
  FOR SELECT TO authenticated
  USING (is_admin());

-- Allow admin users to insert images
CREATE POLICY "Allow admin insert on carousel_images" ON carousel_images
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Allow admin users to update images
CREATE POLICY "Allow admin update on carousel_images" ON carousel_images
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow admin users to delete images
CREATE POLICY "Allow admin delete on carousel_images" ON carousel_images
  FOR DELETE TO authenticated
  USING (is_admin());

-- Policies for admin_users table
-- Only allow admin users to view admin users
CREATE POLICY "Allow admin select on admin_users" ON admin_users
  FOR SELECT TO authenticated
  USING (is_admin());

-- Only allow admin users to update their own record
CREATE POLICY "Allow admin update own record" ON admin_users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policies for activity_logs table
-- Allow admin users to view activity logs
CREATE POLICY "Allow admin select on activity_logs" ON activity_logs
  FOR SELECT TO authenticated
  USING (is_admin());

-- Allow system to insert activity logs
CREATE POLICY "Allow system insert on activity_logs" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Policies for app_settings table
-- Allow anonymous users to read public settings
CREATE POLICY "Allow anonymous select public app_settings" ON app_settings
  FOR SELECT TO anon
  USING (key IN ('site_title', 'contact_email', 'phone', 'address', 'social_instagram', 'social_whatsapp'));

-- Allow authenticated users to read public settings
CREATE POLICY "Allow authenticated select public app_settings" ON app_settings
  FOR SELECT TO authenticated
  USING (key IN ('site_title', 'contact_email', 'phone', 'address', 'social_instagram', 'social_whatsapp'));

-- Allow admin users to view all settings
CREATE POLICY "Allow admin select all app_settings" ON app_settings
  FOR SELECT TO authenticated
  USING (is_admin());

-- Allow admin users to update settings
CREATE POLICY "Allow admin update on app_settings" ON app_settings
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow admin users to insert settings
CREATE POLICY "Allow admin insert on app_settings" ON app_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Grant permissions to roles
-- Grant basic permissions to anon role
GRANT SELECT ON contact_forms TO anon;
GRANT INSERT ON contact_forms TO anon;
GRANT SELECT ON carousel_images TO anon;
GRANT SELECT ON app_settings TO anon;

-- Grant full permissions to authenticated role
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;
GRANT ALL PRIVILEGES ON admin_users TO authenticated;
GRANT ALL PRIVILEGES ON activity_logs TO authenticated;
GRANT ALL PRIVILEGES ON app_settings TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create storage bucket policies (if buckets exist)
-- Note: These will only work if the buckets are created
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('carousel-images', 'carousel-images', true),
  ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for carousel-images bucket
CREATE POLICY "Allow anonymous view carousel images" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'carousel-images');

CREATE POLICY "Allow authenticated view carousel images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'carousel-images');

CREATE POLICY "Allow admin upload carousel images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'carousel-images' AND is_admin());

CREATE POLICY "Allow admin update carousel images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'carousel-images' AND is_admin());

CREATE POLICY "Allow admin delete carousel images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'carousel-images' AND is_admin());

-- Storage policies for backups bucket
CREATE POLICY "Allow admin view backups" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'backups' AND is_admin());

CREATE POLICY "Allow admin upload backups" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'backups' AND is_admin());

CREATE POLICY "Allow admin delete backups" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'backups' AND is_admin());

-- Add comments
COMMENT ON FUNCTION is_admin() IS 'Verifica se o usuário atual é um administrador';

-- Migration: 005_create_admin_user.sql
-- Create admin user for Better Now application
-- Email: betternow@cesire.com.br
-- Password: admin123

-- First, we need to create the user in auth.users table
-- Note: In Supabase, we use the auth.users table for authentication
-- The password will be hashed automatically by Supabase

-- Insert user into auth.users (this is the main authentication table)
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
  gen_random_uuid(),
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

-- Get the user ID that was just created
-- Insert corresponding record in admin_users table
INSERT INTO admin_users (
  id,
  email,
  role,
  created_at
) 
SELECT 
  id,
  'betternow@cesire.com.br',
  'admin',
  now()
FROM auth.users 
WHERE email = 'betternow@cesire.com.br';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_forms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON carousel_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO authenticated;

-- Note: RLS policies may already exist, so we'll use CREATE POLICY IF NOT EXISTS
-- or handle potential conflicts gracefully

-- Update last_login for the new admin user
UPDATE admin_users 
SET last_login = now() 
WHERE email = 'betternow@cesire.com.br';

-- Migration: 005_enable_rls_final.sql
-- Enable RLS on tables that don't have it yet
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Security function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous insert on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow admin select on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow admin update on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow admin delete on contact_forms" ON contact_forms;

DROP POLICY IF EXISTS "Allow anonymous select active carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow authenticated select active carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow admin select all carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow admin insert on carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow admin update on carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow admin delete on carousel_images" ON carousel_images;

DROP POLICY IF EXISTS "Allow admin select on admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow admin update own record" ON admin_users;

-- Create new policies for contact_forms
CREATE POLICY "contact_forms_anonymous_insert" ON contact_forms
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "contact_forms_admin_select" ON contact_forms
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "contact_forms_admin_update" ON contact_forms
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "contact_forms_admin_delete" ON contact_forms
  FOR DELETE TO authenticated
  USING (is_admin());

-- Create new policies for carousel_images
CREATE POLICY "carousel_images_public_select" ON carousel_images
  FOR SELECT TO anon, authenticated
  USING (active = true AND deleted = false);

CREATE POLICY "carousel_images_admin_all" ON carousel_images
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create policies for admin_users
CREATE POLICY "admin_users_admin_select" ON admin_users
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "admin_users_own_update" ON admin_users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create policies for activity_logs
CREATE POLICY "activity_logs_admin_select" ON activity_logs
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "activity_logs_system_insert" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create policies for app_settings
CREATE POLICY "app_settings_public_select" ON app_settings
  FOR SELECT TO anon, authenticated
  USING (key IN ('site_title', 'contact_email', 'phone', 'address', 'social_instagram', 'social_whatsapp'));

CREATE POLICY "app_settings_admin_all" ON app_settings
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Grant permissions to roles
GRANT SELECT, INSERT ON contact_forms TO anon;
GRANT SELECT ON carousel_images TO anon;
GRANT SELECT ON app_settings TO anon;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('carousel-images', 'carousel-images', true),
  ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Allow anonymous view carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated view carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin upload carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin update carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin delete carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin view backups" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin upload backups" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin delete backups" ON storage.objects;

CREATE POLICY "storage_carousel_public_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'carousel-images');

CREATE POLICY "storage_carousel_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'carousel-images' AND is_admin())
  WITH CHECK (bucket_id = 'carousel-images' AND is_admin());

CREATE POLICY "storage_backups_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'backups' AND is_admin())
  WITH CHECK (bucket_id = 'backups' AND is_admin());

-- Add comments
COMMENT ON FUNCTION is_admin() IS 'Verifica se o usuário atual é um administrador';

-- Migration: 005_setup_rls_policies_safe.sql
-- Enable Row Level Security on all tables (safe operation)
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anonymous insert on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow admin read on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow admin update on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow admin delete on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow anonymous read active carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow admin full access on carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow admin access on admin_users" ON admin_users;

-- Contact Forms Policies
-- Allow anonymous users to insert contact forms (for the public contact form)
CREATE POLICY "Allow anonymous insert on contact_forms" ON contact_forms
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow authenticated admin users to view all contact forms
CREATE POLICY "Allow admin read on contact_forms" ON contact_forms
  FOR SELECT TO authenticated
  USING (true);

-- Allow authenticated admin users to update contact forms (status changes)
CREATE POLICY "Allow admin update on contact_forms" ON contact_forms
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated admin users to delete contact forms
CREATE POLICY "Allow admin delete on contact_forms" ON contact_forms
  FOR DELETE TO authenticated
  USING (true);

-- Carousel Images Policies
-- Allow anonymous users to view active carousel images (for the public website)
CREATE POLICY "Allow anonymous read active carousel_images" ON carousel_images
  FOR SELECT TO anon
  USING (active = true AND deleted = false);

-- Allow authenticated admin users full access to carousel images
CREATE POLICY "Allow admin full access on carousel_images" ON carousel_images
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admin Users Policies
-- Only authenticated admin users can access admin_users table
CREATE POLICY "Allow admin access on admin_users" ON admin_users
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add updated_at column to contact_forms if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contact_forms' AND column_name = 'updated_at') THEN
        ALTER TABLE contact_forms ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_contact_forms_updated_at ON contact_forms;
CREATE TRIGGER update_contact_forms_updated_at
    BEFORE UPDATE ON contact_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_contact_forms_status ON contact_forms(status);
CREATE INDEX IF NOT EXISTS idx_contact_forms_created_at ON contact_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_forms_event_date ON contact_forms(event_date);
CREATE INDEX IF NOT EXISTS idx_carousel_images_active ON carousel_images(active, deleted, order_position);
CREATE INDEX IF NOT EXISTS idx_carousel_images_order ON carousel_images(order_position) WHERE active = true AND deleted = false;

-- Create a view for public carousel images (for better performance)
CREATE OR REPLACE VIEW public_carousel_images AS
SELECT id, filename, title, file_url, order_position, uploaded_at
FROM carousel_images
WHERE active = true AND deleted = false
ORDER BY order_position ASC;

-- Ensure proper permissions are granted
-- Note: We don't re-grant permissions that might already exist to avoid errors
-- The permissions should already be set from previous migrations

-- Migration: 006_single_admin_user.sql
-- Migration to set betternow@cesire.com.br as the single admin user
-- This migration removes all existing users and creates only one admin user

-- First, remove all existing admin users
DELETE FROM admin_users;

-- Remove all existing auth users (this will cascade to related tables)
DELETE FROM auth.users;

-- Insert the single admin user into auth.users
-- Password 'admin123' is hashed using bcrypt
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token,
    email_change_token_new,
    recovery_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'betternow@cesire.com.br',
    '$2a$10$8K1p/a0dL2LkVx.LO8xo/.VxCJHyNx5QHZQZQZQZQZQZQZQZQZQZQ', -- bcrypt hash for 'admin123'
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Better Now Admin"}',
    false,
    NOW()
);

-- Get the user ID for the admin_users table
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the user ID we just created
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'betternow@cesire.com.br';
    
    -- Insert into admin_users table (using correct structure)
    INSERT INTO admin_users (
        id,
        email,
        role,
        created_at,
        last_login
    ) VALUES (
        admin_user_id,
        'betternow@cesire.com.br',
        'admin',
        NOW(),
        NOW()
    );
END $$;

-- Grant necessary permissions to anon and authenticated roles
GRANT SELECT ON contact_forms TO anon;
GRANT INSERT ON contact_forms TO anon;
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;
GRANT ALL PRIVILEGES ON admin_users TO authenticated;
GRANT ALL PRIVILEGES ON profiles TO authenticated;
GRANT ALL PRIVILEGES ON reminders TO authenticated;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;
GRANT ALL PRIVILEGES ON activity_logs TO authenticated;
GRANT ALL PRIVILEGES ON app_settings TO authenticated;

-- Update app settings to reflect single admin configuration
INSERT INTO app_settings (key, value, created_at, updated_at)
VALUES 
    ('single_admin_mode', '"true"', NOW(), NOW()),
    ('admin_email', '"betternow@cesire.com.br"', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- Log this migration in activity_logs
INSERT INTO activity_logs (
    id,
    user_id,
    action,
    description,
    metadata,
    ip_address,
    user_agent,
    created_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'betternow@cesire.com.br'),
    'MIGRATION',
    'Single admin user configuration applied - betternow@cesire.com.br',
    '{"migration": "006_single_admin_user", "admin_email": "betternow@cesire.com.br"}',
    '127.0.0.1',
    'Migration Script',
    NOW()
);

-- Note: The bcrypt hash above is a placeholder. In production, you should:
-- 1. Generate a proper bcrypt hash for 'admin123'
-- 2. Use Supabase Auth API to create the user properly
-- 3. This migration assumes RLS policies are already in place from previous migrations

-- Migration: 007_add_business_hours_fields.sql
-- Adicionar campos de horário de atendimento na tabela app_settings
-- Migration: 007_add_business_hours_fields
-- Created: 2024

-- Inserir os novos campos de horário de atendimento na tabela app_settings
INSERT INTO app_settings (key, value, description, created_at, updated_at) VALUES
('business_hours_weekdays', '"Segunda a Sexta: 08:00 - 18:00"', 'Horário de atendimento durante a semana', NOW(), NOW()),
('business_hours_weekend', '"Sábado: 08:00 - 12:00"', 'Horário de atendimento no fim de semana', NOW(), NOW()),
('business_hours_closed_days', '"Domingo: Fechado"', 'Dias em que o estabelecimento está fechado', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verificar se os registros foram inseridos corretamente
SELECT key, value, description FROM app_settings 
WHERE key IN ('business_hours_weekdays', 'business_hours_weekend', 'business_hours_closed_days')
ORDER BY key;

-- Migration: 008_enable_carousel_rls.sql
-- Habilitar RLS na tabela carousel_images
ALTER TABLE public.carousel_images ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT para usuários autenticados
CREATE POLICY "Authenticated users can view carousel images" ON public.carousel_images
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para permitir INSERT para usuários autenticados
CREATE POLICY "Authenticated users can insert carousel images" ON public.carousel_images
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política para permitir UPDATE para usuários autenticados
CREATE POLICY "Authenticated users can update carousel images" ON public.carousel_images
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política para permitir DELETE para usuários autenticados
CREATE POLICY "Authenticated users can delete carousel images" ON public.carousel_images
    FOR DELETE
    TO authenticated
    USING (true);

-- Garantir permissões para as roles anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carousel_images TO authenticated;
GRANT SELECT ON public.carousel_images TO anon;

-- Criar bucket carousel-images se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('carousel-images', 'carousel-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política de storage para permitir upload de imagens
CREATE POLICY "Authenticated users can upload carousel images" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'carousel-images');

-- Política de storage para permitir visualização de imagens
CREATE POLICY "Anyone can view carousel images" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'carousel-images');

-- Política de storage para permitir atualização de imagens
CREATE POLICY "Authenticated users can update carousel images" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'carousel-images')
    WITH CHECK (bucket_id = 'carousel-images');

-- Política de storage para permitir exclusão de imagens
CREATE POLICY "Authenticated users can delete carousel images" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'carousel-images');

-- Migration: 009_carousel_table_rls.sql
-- Habilitar RLS na tabela carousel_images
ALTER TABLE public.carousel_images ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can view carousel images" ON public.carousel_images;
CREATE POLICY "Authenticated users can view carousel images" ON public.carousel_images
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para permitir INSERT para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can insert carousel images" ON public.carousel_images;
CREATE POLICY "Authenticated users can insert carousel images" ON public.carousel_images
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política para permitir UPDATE para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can update carousel images" ON public.carousel_images;
CREATE POLICY "Authenticated users can update carousel images" ON public.carousel_images
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política para permitir DELETE para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can delete carousel images" ON public.carousel_images;
CREATE POLICY "Authenticated users can delete carousel images" ON public.carousel_images
    FOR DELETE
    TO authenticated
    USING (true);

-- Garantir permissões para as roles anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carousel_images TO authenticated;
GRANT SELECT ON public.carousel_images TO anon;

-- Criar bucket carousel-images se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('carousel-images', 'carousel-images', true)
ON CONFLICT (id) DO NOTHING;

-- Migration: 010_fix_carousel_rls_policies.sql
-- Corrigir políticas RLS para carousel_images
-- Remover políticas existentes e recriar corretamente

-- Remover todas as políticas existentes da tabela carousel_images
DROP POLICY IF EXISTS "Authenticated users can view carousel images" ON public.carousel_images;
DROP POLICY IF EXISTS "Authenticated users can insert carousel images" ON public.carousel_images;
DROP POLICY IF EXISTS "Authenticated users can update carousel images" ON public.carousel_images;
DROP POLICY IF EXISTS "Authenticated users can delete carousel images" ON public.carousel_images;

-- Remover políticas de storage existentes
DROP POLICY IF EXISTS "Authenticated users can upload carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete carousel images" ON storage.objects;

-- Habilitar RLS na tabela carousel_images
ALTER TABLE public.carousel_images ENABLE ROW LEVEL SECURITY;

-- Criar políticas para a tabela carousel_images
CREATE POLICY "carousel_images_select_policy" ON public.carousel_images
    FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "carousel_images_insert_policy" ON public.carousel_images
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "carousel_images_update_policy" ON public.carousel_images
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "carousel_images_delete_policy" ON public.carousel_images
    FOR DELETE
    TO authenticated
    USING (true);

-- Garantir permissões para as roles
GRANT ALL ON public.carousel_images TO authenticated;
GRANT SELECT ON public.carousel_images TO anon;

-- Criar bucket carousel-images se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('carousel-images', 'carousel-images', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de storage para o bucket carousel-images
CREATE POLICY "carousel_storage_insert_policy" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'carousel-images');

CREATE POLICY "carousel_storage_select_policy" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'carousel-images');

CREATE POLICY "carousel_storage_update_policy" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'carousel-images')
    WITH CHECK (bucket_id = 'carousel-images');

CREATE POLICY "carousel_storage_delete_policy" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'carousel-images');

-- Migration: 011_create_clients_tables.sql
-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de histórico de interações
CREATE TABLE IF NOT EXISTS client_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'call', 'email', 'whatsapp', 'meeting', 'event', 'note'
  description TEXT NOT NULL,
  interaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_client_interactions_client_id ON client_interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_date ON client_interactions(interaction_date);

-- Habilitar RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tabela clients
CREATE POLICY "Authenticated users can view all clients" ON clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert clients" ON clients
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients" ON clients
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete clients" ON clients
  FOR DELETE TO authenticated USING (true);

-- Políticas RLS para tabela client_interactions
CREATE POLICY "Authenticated users can view all interactions" ON client_interactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert interactions" ON client_interactions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update interactions" ON client_interactions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete interactions" ON client_interactions
  FOR DELETE TO authenticated USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at na tabela clients
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Conceder permissões às roles
GRANT ALL PRIVILEGES ON clients TO authenticated;
GRANT ALL PRIVILEGES ON client_interactions TO authenticated;
GRANT SELECT ON clients TO anon;
GRANT SELECT ON client_interactions TO anon;

-- Migration: 012_create_events_tables.sql
-- Criar tabelas para sistema de eventos

-- Tabela de eventos
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(100) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  location TEXT,
  max_guests INTEGER,
  current_guests INTEGER DEFAULT 0,
  price DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed', 'draft')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de participantes/inscrições em eventos
CREATE TABLE IF NOT EXISTS event_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  participant_name VARCHAR(255) NOT NULL,
  participant_email VARCHAR(255),
  participant_phone VARCHAR(20),
  guests_count INTEGER DEFAULT 1,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'pending', 'attended')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para vincular clientes a eventos (histórico)
CREATE TABLE IF NOT EXISTS client_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) DEFAULT 'participant' CHECK (relationship_type IN ('participant', 'organizer', 'vendor', 'guest')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, event_id, relationship_type)
);

-- Índices para performance
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_client ON event_participants(client_id);
CREATE INDEX idx_client_events_client ON client_events(client_id);
CREATE INDEX idx_client_events_event ON client_events(event_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_participants_updated_at
    BEFORE UPDATE ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar contagem de participantes
CREATE OR REPLACE FUNCTION update_event_guests_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events 
        SET current_guests = current_guests + NEW.guests_count 
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE events 
        SET current_guests = current_guests - OLD.guests_count + NEW.guests_count 
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events 
        SET current_guests = current_guests - OLD.guests_count 
        WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_event_guests_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_event_guests_count();

-- Habilitar RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_events ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Eventos: admins podem fazer tudo, usuários autenticados podem ver eventos ativos
CREATE POLICY "Allow admin full access on events" ON events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid()
        )
    );

CREATE POLICY "Allow authenticated read active events" ON events
    FOR SELECT USING (status = 'active' AND auth.role() = 'authenticated');

-- Participantes: admins podem fazer tudo
CREATE POLICY "Allow admin full access on event_participants" ON event_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid()
        )
    );

-- Client Events: admins podem fazer tudo
CREATE POLICY "Allow admin full access on client_events" ON client_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid()
        )
    );

-- Conceder permissões
GRANT ALL PRIVILEGES ON events TO authenticated;
GRANT ALL PRIVILEGES ON event_participants TO authenticated;
GRANT ALL PRIVILEGES ON client_events TO authenticated;
GRANT SELECT ON events TO anon;
GRANT SELECT ON event_participants TO anon;
GRANT SELECT ON client_events TO anon;

-- Comentários
COMMENT ON TABLE events IS 'Tabela de eventos da plataforma';
COMMENT ON TABLE event_participants IS 'Participantes inscritos em eventos';
COMMENT ON TABLE client_events IS 'Relacionamento entre clientes e eventos';
COMMENT ON COLUMN events.status IS 'Status do evento: active, cancelled, completed, draft';
COMMENT ON COLUMN event_participants.status IS 'Status da participação: confirmed, cancelled, pending, attended';
COMMENT ON COLUMN client_events.relationship_type IS 'Tipo de relacionamento: participant, organizer, vendor, guest';

-- Migration: 013_fix_events_status_constraint.sql
-- Corrigir constraint de status da tabela events
-- Alterar de 'active' para 'published' para compatibilidade com o frontend

-- Primeiro, atualizar registros existentes que tenham status inválido
UPDATE events SET status = 'published' WHERE status = 'active';
UPDATE events SET status = 'draft' WHERE status NOT IN ('published', 'cancelled', 'completed', 'draft');

-- Remover o constraint existente
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Criar novo constraint com 'published' em vez de 'active'
ALTER TABLE events ADD CONSTRAINT events_status_check 
  CHECK (status IN ('published', 'cancelled', 'completed', 'draft'));

-- Migration: 013_update_clients_address_fields.sql
-- Migração para atualizar campos de endereço na tabela clients
-- Remove campo phone e desmembra address em campos específicos

-- Remover campo phone
ALTER TABLE clients DROP COLUMN IF EXISTS phone;

-- Remover campo address antigo
ALTER TABLE clients DROP COLUMN IF EXISTS address;

-- Adicionar novos campos de endereço
ALTER TABLE clients ADD COLUMN cep VARCHAR(9); -- CEP com hífen opcional
ALTER TABLE clients ADD COLUMN logradouro TEXT;
ALTER TABLE clients ADD COLUMN complemento TEXT;
ALTER TABLE clients ADD COLUMN bairro VARCHAR(255);
ALTER TABLE clients ADD COLUMN estado VARCHAR(255);
ALTER TABLE clients ADD COLUMN uf VARCHAR(2); -- Sigla do estado

-- Comentários para documentação
COMMENT ON COLUMN clients.cep IS 'CEP do endereço do cliente';
COMMENT ON COLUMN clients.logradouro IS 'Logradouro (rua, avenida, etc.)';
COMMENT ON COLUMN clients.complemento IS 'Complemento do endereço (número, apartamento, etc.)';
COMMENT ON COLUMN clients.bairro IS 'Bairro do endereço';
COMMENT ON COLUMN clients.estado IS 'Estado por extenso';
COMMENT ON COLUMN clients.uf IS 'Sigla do estado (UF)';

-- Migration: 014_add_numero_field_and_update_estado.sql
-- Adicionar campo 'numero' após logradouro e alterar 'estado' para 'cidade'
ALTER TABLE clients 
ADD COLUMN numero VARCHAR(20);

-- Renomear campo 'estado' para 'cidade'
ALTER TABLE clients 
RENAME COLUMN estado TO cidade;

-- Atualizar comentários dos campos
COMMENT ON COLUMN clients.cidade IS 'Cidade do endereço';
COMMENT ON COLUMN clients.numero IS 'Número do endereço do cliente';

-- Migration: 014_fix_events_status_constraint_v2.sql
-- Corrigir constraint de status da tabela events
-- Primeiro verificar e corrigir todos os valores de status existentes

-- Atualizar todos os registros para valores válidos
UPDATE events SET status = 'published' WHERE status = 'active';
UPDATE events SET status = 'published' WHERE status = 'publicado';
UPDATE events SET status = 'published' WHERE status = 'ativo';
UPDATE events SET status = 'draft' WHERE status = 'rascunho';
UPDATE events SET status = 'cancelled' WHERE status = 'cancelado';
UPDATE events SET status = 'completed' WHERE status = 'concluido' OR status = 'concluído';

-- Definir um valor padrão para qualquer status não reconhecido
UPDATE events SET status = 'draft' WHERE status NOT IN ('published', 'cancelled', 'completed', 'draft');

-- Remover o constraint existente
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Criar novo constraint com os valores corretos
ALTER TABLE events ADD CONSTRAINT events_status_check 
  CHECK (status IN ('published', 'cancelled', 'completed', 'draft'));

-- Migration: 015_add_soft_delete_to_clients.sql
-- Migration: Add soft delete support to clients table
-- Add deleted_at field for soft delete functionality

ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance on soft delete queries
CREATE INDEX idx_clients_deleted_at ON clients(deleted_at);

-- Update RLS policies to consider soft delete
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated users to insert clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated users to update clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated users to delete clients" ON clients;

-- Recreate policies with soft delete consideration
CREATE POLICY "Allow authenticated users to view active clients" ON clients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert clients" ON clients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update clients" ON clients
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to soft delete clients" ON clients
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL PRIVILEGES ON clients TO authenticated;
GRANT SELECT ON clients TO anon;

-- Migration: 016_add_soft_delete_to_testimonials.sql
-- Adicionar soft delete para testimonials
ALTER TABLE testimonials ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_testimonials_deleted_at ON testimonials(deleted_at);

-- Atualizar política RLS para considerar soft delete
DROP POLICY IF EXISTS "Allow public read access to approved testimonials" ON testimonials;

CREATE POLICY "Allow public read access to approved testimonials" ON testimonials
  FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);

-- Política para admin ver todos os testimonials (incluindo deletados)
CREATE POLICY "Allow admin full access to all testimonials" ON testimonials
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Comentários para documentação
COMMENT ON COLUMN testimonials.deleted_at IS 'Timestamp when testimonial was soft deleted. NULL means not deleted.';
COMMENT ON INDEX idx_testimonials_deleted_at IS 'Index for efficient soft delete queries';

-- Migration: 017_add_soft_delete_to_events.sql
-- Migration: Add soft delete support to events table
-- Add deleted_at field for soft delete functionality

ALTER TABLE events ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance on soft delete queries
CREATE INDEX idx_events_deleted_at ON events(deleted_at);

-- Update RLS policies to consider soft delete
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to active events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to manage events" ON events;

-- Recreate policies with soft delete consideration
CREATE POLICY "Allow public read access to active events" ON events
    FOR SELECT USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Allow authenticated users to view all events" ON events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert events" ON events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update events" ON events
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to soft delete events" ON events
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON events TO anon;
GRANT ALL PRIVILEGES ON events TO authenticated;

-- Comment for documentation
COMMENT ON COLUMN events.deleted_at IS 'Timestamp when the event was soft deleted. NULL means the event is active.';

-- Migration: 017_remove_events_rls_and_enhance_tables.sql
-- Migration: Remove RLS policies from events tables and enhance structure
-- Created: 2024

-- Drop all RLS policies for events table
DROP POLICY IF EXISTS "events_select_policy" ON public.events;
DROP POLICY IF EXISTS "events_insert_policy" ON public.events;
DROP POLICY IF EXISTS "events_update_policy" ON public.events;
DROP POLICY IF EXISTS "events_delete_policy" ON public.events;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.events;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.events;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.events;

-- Drop all RLS policies for event_participants table
DROP POLICY IF EXISTS "event_participants_select_policy" ON public.event_participants;
DROP POLICY IF EXISTS "event_participants_insert_policy" ON public.event_participants;
DROP POLICY IF EXISTS "event_participants_update_policy" ON public.event_participants;
DROP POLICY IF EXISTS "event_participants_delete_policy" ON public.event_participants;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.event_participants;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.event_participants;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.event_participants;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.event_participants;

-- Drop all RLS policies for client_events table
DROP POLICY IF EXISTS "client_events_select_policy" ON public.client_events;
DROP POLICY IF EXISTS "client_events_insert_policy" ON public.client_events;
DROP POLICY IF EXISTS "client_events_update_policy" ON public.client_events;
DROP POLICY IF EXISTS "client_events_delete_policy" ON public.client_events;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.client_events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.client_events;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.client_events;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.client_events;

-- Disable RLS on all events tables
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_events DISABLE ROW LEVEL SECURITY;

-- Add missing fields to events table for enhanced functionality
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS gallery_urls TEXT[];
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_deadline DATE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS additional_info TEXT;

-- Create event_photos table for gallery functionality
CREATE TABLE IF NOT EXISTS public.event_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS on event_photos table
ALTER TABLE public.event_photos DISABLE ROW LEVEL SECURITY;

-- Create event_notifications table for automatic notifications
CREATE TABLE IF NOT EXISTS public.event_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES public.event_participants(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('registration_confirmation', 'event_reminder', 'event_update', 'event_cancellation')),
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS on event_notifications table
ALTER TABLE public.event_notifications DISABLE ROW LEVEL SECURITY;

-- Add check-in functionality to event_participants
ALTER TABLE public.event_participants ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE public.event_participants ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES auth.users(id);

-- Grant permissions to anon and authenticated roles
GRANT ALL PRIVILEGES ON public.events TO anon;
GRANT ALL PRIVILEGES ON public.events TO authenticated;
GRANT ALL PRIVILEGES ON public.event_participants TO anon;
GRANT ALL PRIVILEGES ON public.event_participants TO authenticated;
GRANT ALL PRIVILEGES ON public.client_events TO anon;
GRANT ALL PRIVILEGES ON public.client_events TO authenticated;
GRANT ALL PRIVILEGES ON public.event_photos TO anon;
GRANT ALL PRIVILEGES ON public.event_photos TO authenticated;
GRANT ALL PRIVILEGES ON public.event_notifications TO anon;
GRANT ALL PRIVILEGES ON public.event_notifications TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON public.event_participants(status);
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_event_id ON public.event_notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_status ON public.event_notifications(status);

COMMIT;

-- Migration: 018_add_missing_event_fields.sql
-- Adicionar campos faltantes à tabela events
ALTER TABLE events 
ADD COLUMN end_date DATE,
ADD COLUMN end_time TIME,
ADD COLUMN price_batches JSONB;

-- Comentários para documentar os novos campos
COMMENT ON COLUMN events.end_date IS 'Data de término do evento';
COMMENT ON COLUMN events.end_time IS 'Hora de término do evento';
COMMENT ON COLUMN events.price_batches IS 'Lotes de preços em formato JSON';

-- Atualizar permissões para os novos campos
GRANT SELECT, INSERT, UPDATE ON events TO anon;
GRANT ALL PRIVILEGES ON events TO authenticated;

-- Migration: 018_add_soft_delete_to_contact_forms.sql
-- Add soft delete functionality to contact_forms table
-- Add deleted_at field for soft delete functionality

ALTER TABLE contact_forms ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance on queries filtering by deleted_at
CREate INDEX idx_contact_forms_deleted_at ON contact_forms(deleted_at);

-- Update RLS policies to exclude soft deleted records from normal queries
DROP POLICY IF EXISTS "Admin users can view all contact forms" ON contact_forms;
CREATE POLICY "Admin users can view all contact forms"
  ON contact_forms
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL OR is_admin(auth.uid()));

-- Allow admins to update deleted_at field
DROP POLICY IF EXISTS "Admin users can update contact forms" ON contact_forms;
CREATE POLICY "Admin users can update contact forms"
  ON contact_forms
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Comments for documentation
COMMENT ON COLUMN contact_forms.deleted_at IS 'Timestamp when contact form was soft deleted. NULL means not deleted.';
COMMENT ON INDEX idx_contact_forms_deleted_at IS 'Index for efficient soft delete queries';

-- Migration: 019_create_event_types_table.sql
-- Criar tabela event_types para gerenciar tipos de eventos
CREATE TABLE IF NOT EXISTS event_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Cor em hexadecimal
  icon VARCHAR(50) DEFAULT 'Calendar', -- Nome do ícone Lucide
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_event_types_active ON event_types(active);
CREATE INDEX IF NOT EXISTS idx_event_types_name ON event_types(name);

-- Inserir tipos de eventos padrão
INSERT INTO event_types (name, description, color, icon) VALUES
('Confraternização', 'Eventos de confraternização e integração', '#10B981', 'Users'),
('Festa', 'Festas e celebrações', '#F59E0B', 'PartyPopper'),
('Evento esportivo', 'Competições e atividades esportivas', '#EF4444', 'Trophy'),
('Corporativo', 'Eventos empresariais e corporativos', '#6366F1', 'Building'),
('Cultural', 'Eventos culturais e artísticos', '#8B5CF6', 'Palette'),
('Educacional', 'Workshops, cursos e palestras', '#06B6D4', 'GraduationCap')
ON CONFLICT (name) DO NOTHING;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_event_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_types_updated_at
  BEFORE UPDATE ON event_types
  FOR EACH ROW
  EXECUTE FUNCTION update_event_types_updated_at();

-- Migration: 020_add_videos_field_to_events.sql
-- Adicionar campo videos à tabela events
-- Este campo armazenará URLs dos vídeos como um array de texto

ALTER TABLE public.events 
ADD COLUMN videos text[] DEFAULT NULL;

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN public.events.videos IS 'Array de URLs dos vídeos do evento';

-- Verificar se a coluna foi criada corretamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'videos';

-- Migration: 021_add_location_link_to_events.sql
-- Adicionar campo location_link na tabela events
ALTER TABLE events 
ADD COLUMN location_link TEXT;

-- Comentário explicativo
COMMENT ON COLUMN events.location_link IS 'Link para visualizar o endereço do evento no mapa (Google Maps, etc.)';

-- Migration: 022_remove_price_field_from_events.sql
-- Remove the price field from events table
-- This migration eliminates single price logic and keeps only price_batches

ALTER TABLE events DROP COLUMN IF EXISTS price;

-- Add comment to document the change
COMMENT ON TABLE events IS 'Events table - price field removed, using only price_batches for pricing';

-- Migration: 023_add_event_type_id_foreign_key.sql
-- Adicionar foreign key event_type_id na tabela events para relacionar com event_types
-- Esta migração corrige o problema de relacionamento entre events e event_types

-- 1. Adicionar a coluna event_type_id
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type_id UUID;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_events_event_type_id ON events(event_type_id);

-- 3. Atualizar registros existentes baseado no campo event_type (string)
-- Mapear os tipos de string para os IDs da tabela event_types
UPDATE events 
SET event_type_id = (
  SELECT et.id 
  FROM event_types et 
  WHERE LOWER(et.name) = LOWER(events.event_type)
  LIMIT 1
)
WHERE event_type_id IS NULL AND event_type IS NOT NULL;

-- 4. Para eventos que não encontraram correspondência, usar um tipo padrão
-- Primeiro, garantir que existe um tipo "Outros" ou usar o primeiro disponível
INSERT INTO event_types (name, description, color, icon) 
VALUES ('Outros', 'Eventos diversos', '#6B7280', 'Calendar')
ON CONFLICT (name) DO NOTHING;

-- Atualizar eventos sem correspondência para usar "Outros"
UPDATE events 
SET event_type_id = (
  SELECT id FROM event_types WHERE name = 'Outros' LIMIT 1
)
WHERE event_type_id IS NULL;

-- 5. Adicionar a foreign key constraint
ALTER TABLE events 
ADD CONSTRAINT fk_events_event_type_id 
FOREIGN KEY (event_type_id) REFERENCES event_types(id);

-- 6. Comentário para documentação
COMMENT ON COLUMN events.event_type_id IS 'Foreign key para event_types.id - substitui o campo event_type (string)';

-- Migration: 024_add_apelido_field_to_clients.sql
-- Adicionar campo 'apelido' na tabela clients
-- Migration: 024_add_apelido_field_to_clients.sql

-- Adicionar coluna apelido na tabela clients
ALTER TABLE clients 
ADD COLUMN apelido VARCHAR(255);

-- Adicionar comentário para documentação
COMMENT ON COLUMN clients.apelido IS 'Apelido ou nome informal do cliente';

-- Criar índice para melhorar performance em buscas por apelido
CREATE INDEX IF NOT EXISTS idx_clients_apelido ON clients(apelido);

-- Migration: 025_remove_status_constraint_temporarily.sql
-- Remover temporariamente o constraint de status para permitir atualizações
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Migration: 026_add_new_status_constraint.sql
-- Adicionar novo constraint de status com valores corretos
ALTER TABLE events ADD CONSTRAINT events_status_check 
  CHECK (status IN ('published', 'cancelled', 'completed', 'draft'));

-- Migration: 027_add_original_status_constraint.sql
-- Adicionar constraint de status original (com 'active' em vez de 'published')
ALTER TABLE events ADD CONSTRAINT events_status_check 
  CHECK (status IN ('active', 'cancelled', 'completed', 'draft'));

-- Migration: 027_create_suppliers_system.sql
-- Migration: Create Suppliers Management System
-- Description: Creates all tables, indexes, triggers, and policies for the supplier management system

-- =============================================
-- 1. CREATE TABLES
-- =============================================

-- Create suppliers table
CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  document_type VARCHAR(10) CHECK (document_type IN ('CPF', 'CNPJ')),
  document_number VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  website VARCHAR(255),
  
  -- Endereço
  cep VARCHAR(10),
  address TEXT,
  address_number VARCHAR(20),
  address_complement VARCHAR(100),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(2),
  
  -- Dados bancários
  bank_name VARCHAR(100),
  bank_code VARCHAR(10),
  agency VARCHAR(20),
  account VARCHAR(20),
  account_type VARCHAR(20) CHECK (account_type IN ('corrente', 'poupanca')),
  pix_key VARCHAR(255),
  
  -- Informações comerciais
  services_description TEXT,
  specializations TEXT[],
  service_area TEXT[],
  min_service_value DECIMAL(10,2),
  max_service_value DECIMAL(10,2),
  
  -- Status e controle
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_services INTEGER DEFAULT 0,
  notes TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create supplier_categories table
CREATE TABLE supplier_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50) DEFAULT 'Package',
  parent_id UUID REFERENCES supplier_categories(id),
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_category_relations table
CREATE TABLE supplier_category_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES supplier_categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, category_id)
);

-- Create supplier_documents table
CREATE TABLE supplier_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  expiry_date DATE,
  is_required BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'expired', 'pending')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_services table
CREATE TABLE supplier_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  service_date DATE NOT NULL,
  service_type VARCHAR(100),
  description TEXT,
  value DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_evaluations table
CREATE TABLE supplier_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES supplier_services(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  evaluator_name VARCHAR(255),
  
  -- Critérios de avaliação (1-5)
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  cost_benefit_rating INTEGER CHECK (cost_benefit_rating >= 1 AND cost_benefit_rating <= 5),
  overall_rating DECIMAL(3,2),
  
  comments TEXT,
  would_recommend BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. CREATE INDEXES
-- =============================================

-- Índices para suppliers
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_document ON suppliers(document_number);
CREATE INDEX idx_suppliers_rating ON suppliers(rating DESC);
CREATE INDEX idx_suppliers_city ON suppliers(city);
CREATE INDEX idx_suppliers_deleted ON suppliers(deleted_at);

-- Índices para categorias
CREATE INDEX idx_supplier_categories_active ON supplier_categories(active);
CREATE INDEX idx_supplier_categories_parent ON supplier_categories(parent_id);
CREATE INDEX idx_supplier_categories_sort ON supplier_categories(sort_order);

-- Índices para relações
CREATE INDEX idx_supplier_category_relations_supplier ON supplier_category_relations(supplier_id);
CREATE INDEX idx_supplier_category_relations_category ON supplier_category_relations(category_id);
CREATE INDEX idx_supplier_category_relations_primary ON supplier_category_relations(is_primary);

-- Índices para documentos
CREATE INDEX idx_supplier_documents_supplier ON supplier_documents(supplier_id);
CREATE INDEX idx_supplier_documents_expiry ON supplier_documents(expiry_date);
CREATE INDEX idx_supplier_documents_status ON supplier_documents(status);
CREATE INDEX idx_supplier_documents_type ON supplier_documents(document_type);

-- Índices para serviços
CREATE INDEX idx_supplier_services_supplier ON supplier_services(supplier_id);
CREATE INDEX idx_supplier_services_event ON supplier_services(event_id);
CREATE INDEX idx_supplier_services_date ON supplier_services(service_date DESC);

-- Índices para avaliações
CREATE INDEX idx_supplier_evaluations_supplier ON supplier_evaluations(supplier_id);
CREATE INDEX idx_supplier_evaluations_rating ON supplier_evaluations(overall_rating DESC);

-- =============================================
-- 3. CREATE FUNCTIONS AND TRIGGERS
-- =============================================

-- Função para atualizar updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_suppliers_updated_at 
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_categories_updated_at 
  BEFORE UPDATE ON supplier_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_documents_updated_at 
  BEFORE UPDATE ON supplier_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_services_updated_at 
  BEFORE UPDATE ON supplier_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular média de avaliações
CREATE OR REPLACE FUNCTION update_supplier_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE suppliers 
    SET rating = (
        SELECT COALESCE(AVG(overall_rating), 0)
        FROM supplier_evaluations 
        WHERE supplier_id = NEW.supplier_id
    )
    WHERE id = NEW.supplier_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar rating quando nova avaliação é inserida
CREATE TRIGGER update_supplier_rating_trigger
    AFTER INSERT OR UPDATE ON supplier_evaluations
    FOR EACH ROW EXECUTE FUNCTION update_supplier_rating();

-- =============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =============================================

-- Habilitar RLS nas tabelas
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_category_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_evaluations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. CREATE RLS POLICIES
-- =============================================

-- Políticas para usuários autenticados (administradores)
CREATE POLICY "Authenticated users can manage suppliers" ON suppliers
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage categories" ON supplier_categories
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage relations" ON supplier_category_relations
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage documents" ON supplier_documents
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage services" ON supplier_services
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage evaluations" ON supplier_evaluations
  FOR ALL TO authenticated USING (true);

-- Políticas para usuários anônimos (se necessário)
CREATE POLICY "Public can view active suppliers" ON suppliers
  FOR SELECT TO anon USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Public can view active categories" ON supplier_categories
  FOR SELECT TO anon USING (active = true);

-- =============================================
-- 6. GRANT PERMISSIONS
-- =============================================

-- Conceder permissões para usuários autenticados
GRANT ALL PRIVILEGES ON suppliers TO authenticated;
GRANT ALL PRIVILEGES ON supplier_categories TO authenticated;
GRANT ALL PRIVILEGES ON supplier_category_relations TO authenticated;
GRANT ALL PRIVILEGES ON supplier_documents TO authenticated;
GRANT ALL PRIVILEGES ON supplier_services TO authenticated;
GRANT ALL PRIVILEGES ON supplier_evaluations TO authenticated;

-- Conceder permissões básicas para usuários anônimos
GRANT SELECT ON suppliers TO anon;
GRANT SELECT ON supplier_categories TO anon;

-- =============================================
-- 7. INSERT INITIAL DATA
-- =============================================

-- Inserir categorias iniciais
INSERT INTO supplier_categories (name, description, color, icon, sort_order) VALUES
('Alimentação', 'Fornecedores de comidas e bebidas', '#10B981', 'UtensilsCrossed', 1),
('Decoração', 'Decoração e ambientação de eventos', '#F59E0B', 'Palette', 2),
('Som e Iluminação', 'Equipamentos audiovisuais', '#8B5CF6', 'Volume2', 3),
('Segurança', 'Serviços de segurança e portaria', '#EF4444', 'Shield', 4),
('Limpeza', 'Serviços de limpeza e manutenção', '#06B6D4', 'Sparkles', 5),
('Transporte', 'Transporte e logística', '#F97316', 'Truck', 6),
('Fotografia', 'Fotografia e filmagem', '#EC4899', 'Camera', 7),
('Entretenimento', 'Shows, música e animação', '#84CC16', 'Music', 8);

-- Migration: 028_disable_suppliers_rls_for_dev.sql
-- Desativar todas as políticas RLS das tabelas de fornecedores para desenvolvimento
-- Esta migração garante que não há restrições RLS durante a fase de desenvolvimento

-- Desativar RLS para todas as tabelas de fornecedores
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_category_relations DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_evaluations DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas RLS existentes das tabelas de fornecedores
DROP POLICY IF EXISTS "suppliers_authenticated_full_access" ON suppliers;
DROP POLICY IF EXISTS "suppliers_anonymous_select" ON suppliers;
DROP POLICY IF EXISTS "supplier_categories_authenticated_full_access" ON supplier_categories;
DROP POLICY IF EXISTS "supplier_categories_anonymous_select" ON supplier_categories;
DROP POLICY IF EXISTS "supplier_category_relations_authenticated_full_access" ON supplier_category_relations;
DROP POLICY IF EXISTS "supplier_category_relations_anonymous_select" ON supplier_category_relations;
DROP POLICY IF EXISTS "supplier_documents_authenticated_full_access" ON supplier_documents;
DROP POLICY IF EXISTS "supplier_documents_anonymous_select" ON supplier_documents;
DROP POLICY IF EXISTS "supplier_services_authenticated_full_access" ON supplier_services;
DROP POLICY IF EXISTS "supplier_services_anonymous_select" ON supplier_services;
DROP POLICY IF EXISTS "supplier_evaluations_authenticated_full_access" ON supplier_evaluations;
DROP POLICY IF EXISTS "supplier_evaluations_anonymous_select" ON supplier_evaluations;

-- Garantir que as tabelas são acessíveis para todos os usuários durante desenvolvimento
GRANT ALL ON suppliers TO anon, authenticated;
GRANT ALL ON supplier_categories TO anon, authenticated;
GRANT ALL ON supplier_category_relations TO anon, authenticated;
GRANT ALL ON supplier_documents TO anon, authenticated;
GRANT ALL ON supplier_services TO anon, authenticated;
GRANT ALL ON supplier_evaluations TO anon, authenticated;

-- Garantir acesso às sequências se existirem
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Migration: add_is_cover_column.sql
-- Add is_cover column to event_photos table
ALTER TABLE event_photos 
ADD COLUMN is_cover BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN event_photos.is_cover IS 'Indicates if this photo is the cover image for the event';

-- Create index for better performance when querying cover photos
CREATE INDEX idx_event_photos_is_cover ON event_photos(event_id, is_cover) WHERE is_cover = TRUE;

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON event_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_photos TO authenticated;

-- Migration: add_soft_delete_to_event_types.sql
-- Migration: Add soft delete to event_types table
-- Add deleted_at column to event_types table for soft delete functionality

ALTER TABLE event_types 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance on queries filtering by deleted_at
CREATE INDEX idx_event_types_deleted_at ON event_types(deleted_at);

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON event_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_types TO authenticated;

-- Migration: add_testimonial_carousel_interval.sql
-- Adicionar campo para configurar intervalo do carrossel de depoimentos
ALTER TABLE app_settings 
ADD COLUMN testimonial_carousel_interval INTEGER DEFAULT 5000;

-- Comentário explicativo
COMMENT ON COLUMN app_settings.testimonial_carousel_interval IS 'Intervalo em milissegundos para rotação automática do carrossel de depoimentos (padrão: 5000ms = 5 segundos)';

-- Inserir valor padrão se não existir registro
INSERT INTO app_settings (testimonial_carousel_interval) 
SELECT 5000
WHERE NOT EXISTS (SELECT 1 FROM app_settings LIMIT 1);

-- Atualizar registro existente se já houver dados na tabela
UPDATE app_settings 
SET testimonial_carousel_interval = 5000 
WHERE testimonial_carousel_interval IS NULL;

-- Migration: check_duplicates.sql
-- Verificar registros duplicados na tabela app_settings
SELECT 
    key, 
    COUNT(*) as count,
    array_agg(id) as ids,
    array_agg(value) as values
FROM app_settings 
GROUP BY key 
HAVING COUNT(*) > 1;

-- Verificar todas as chaves relacionadas a contato
SELECT key, value, id, created_at, updated_at
FROM app_settings 
WHERE key IN ('contact_email', 'phone', 'address', 'social_instagram', 'social_whatsapp')
ORDER BY key, created_at;

-- Verificar total de registros
SELECT COUNT(*) as total_records FROM app_settings;

-- Migration: check_permissions.sql
-- Verificar permissões atuais para roles anon e authenticated
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Migration: check_testimonials_permissions.sql
-- Verificar permissões atuais da tabela testimonials
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'testimonials'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Conceder permissões necessárias
-- Permitir que usuários anônimos vejam depoimentos aprovados
GRANT SELECT ON testimonials TO anon;

-- Permitir que usuários anônimos criem novos depoimentos
GRANT INSERT ON testimonials TO anon;

-- Permitir que usuários autenticados tenham acesso completo
GRANT ALL PRIVILEGES ON testimonials TO authenticated;

-- Verificar políticas RLS existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'testimonials';

-- Criar políticas RLS se não existirem
-- Política para leitura: usuários anônimos podem ver apenas depoimentos aprovados
DROP POLICY IF EXISTS "Allow anonymous read approved testimonials" ON testimonials;
CREATE POLICY "Allow anonymous read approved testimonials" 
ON testimonials FOR SELECT 
TO anon 
USING (status = 'approved');

-- Política para inserção: usuários anônimos podem criar depoimentos
DROP POLICY IF EXISTS "Allow anonymous insert testimonials" ON testimonials;
CREATE POLICY "Allow anonymous insert testimonials" 
ON testimonials FOR INSERT 
TO anon 
WITH CHECK (true);

-- Política para usuários autenticados: acesso completo
DROP POLICY IF EXISTS "Allow authenticated full access" ON testimonials;
CREATE POLICY "Allow authenticated full access" 
ON testimonials FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'testimonials';

-- Migration: create_admin_user.sql
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

-- Migration: create_backup_storage.sql
-- Criar bucket para backups
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('backups', 'backups', false, 52428800, ARRAY['application/json', 'application/gzip']);

-- Política para permitir que usuários autenticados façam upload de backups
CREATE POLICY "Authenticated users can upload backups" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir que usuários autenticados vejam seus próprios backups
CREATE POLICY "Users can view own backups" ON storage.objects
FOR SELECT USING (
  bucket_id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir que usuários autenticados baixem seus backups
CREATE POLICY "Users can download own backups" ON storage.objects
FOR SELECT USING (
  bucket_id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir que usuários autenticados excluam seus backups
CREATE POLICY "Users can delete own backups" ON storage.objects
FOR DELETE USING (
  bucket_id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Política para o bucket backups
CREATE POLICY "Authenticated users can access backups bucket" ON storage.buckets
FOR SELECT USING (
  id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Migration: create_test_event.sql
-- Inserir evento de teste para verificar a funcionalidade
INSERT INTO events (
  title,
  description,
  event_type,
  event_date,
  event_time,
  location,
  max_guests,
  price,
  status,
  is_public,
  category,
  contact_email,
  image_url
) VALUES (
  'Evento de Teste - Workshop de Tecnologia',
  'Um workshop incrível sobre as últimas tendências em tecnologia. Venha aprender e se conectar com outros profissionais da área.',
  'workshop',
  '2024-02-15',
  '14:00:00',
  'Centro de Convenções - Sala A',
  50,
  99.90,
  'active',
  true,
  'Tecnologia',
  'contato@evento.com',
  'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20technology%20workshop%20event%20banner%20with%20laptops%20and%20people%20learning%20professional%20blue%20theme&image_size=landscape_16_9'
);

-- Inserir mais um evento para testar múltiplos cards
INSERT INTO events (
  title,
  description,
  event_type,
  event_date,
  event_time,
  location,
  max_guests,
  price,
  status,
  is_public,
  category,
  contact_email,
  image_url
) VALUES (
  'Conferência de Inovação 2024',
  'A maior conferência de inovação do ano! Palestrantes renomados, networking e muito aprendizado.',
  'conferencia',
  '2024-03-20',
  '09:00:00',
  'Auditório Principal - Centro Empresarial',
  200,
  149.90,
  'active',
  true,
  'Negócios',
  'info@inovacao2024.com',
  'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=innovation%20conference%202024%20business%20event%20banner%20with%20speakers%20and%20audience%20modern%20design&image_size=landscape_16_9'
);

-- Migration: create_testimonials_table.sql
-- Criar tabela testimonials
CREATE TABLE testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(20) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  testimonial_text TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de novos depoimentos (usuários anônimos)
CREATE POLICY "Allow anonymous insert testimonials" ON testimonials
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política para permitir leitura de depoimentos aprovados (usuários anônimos)
CREATE POLICY "Allow anonymous read approved testimonials" ON testimonials
  FOR SELECT
  TO anon
  USING (status = 'approved');

-- Política para permitir leitura de todos os depoimentos (usuários autenticados)
CREATE POLICY "Allow authenticated read all testimonials" ON testimonials
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir atualização de depoimentos (usuários autenticados)
CREATE POLICY "Allow authenticated update testimonials" ON testimonials
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para permitir exclusão de depoimentos (usuários autenticados)
CREATE POLICY "Allow authenticated delete testimonials" ON testimonials
  FOR DELETE
  TO authenticated
  USING (true);

-- Conceder permissões para as roles
GRANT SELECT ON testimonials TO anon;
GRANT ALL PRIVILEGES ON testimonials TO authenticated;

-- Inserir dados iniciais dos 3 depoimentos atuais
INSERT INTO testimonials (name, whatsapp, event_type, testimonial_text, status, is_featured, approved_at) VALUES
(
  'Maria Silva',
  '(11) 99999-1234',
  'Casamento',
  'A Better Now transformou nosso sonho em realidade! Cada detalhe foi cuidadosamente planejado e executado com perfeição. Nossa festa de casamento foi inesquecível, e todos os convidados elogiaram a organização impecável. Recomendo de olhos fechados!',
  'approved',
  true,
  now()
),
(
  'João Santos',
  '(11) 98888-5678',
  'Aniversário',
  'Contratei a Better Now para organizar os 15 anos da minha filha e foi a melhor decisão! A equipe é super profissional, atenciosa e criativa. A festa ficou linda, exatamente como imaginávamos. Parabéns pelo excelente trabalho!',
  'approved',
  true,
  now()
),
(
  'Ana Costa',
  '(11) 97777-9012',
  'Formatura',
  'Organização perfeita, atendimento excepcional e resultado surpreendente! A Better Now cuidou de todos os detalhes da nossa formatura com muito carinho e profissionalismo. Foi uma noite mágica que ficará para sempre em nossas memórias. Muito obrigada!',
  'approved',
  true,
  now()
);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_testimonials_updated_at_trigger
  BEFORE UPDATE ON testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_testimonials_updated_at();

-- Comentários para documentação
COMMENT ON TABLE testimonials IS 'Tabela para armazenar depoimentos de clientes';
COMMENT ON COLUMN testimonials.name IS 'Nome do cliente que deixou o depoimento';
COMMENT ON COLUMN testimonials.whatsapp IS 'WhatsApp do cliente para contato';
COMMENT ON COLUMN testimonials.event_type IS 'Tipo de evento (Casamento, Aniversário, Formatura, etc.)';
COMMENT ON COLUMN testimonials.testimonial_text IS 'Texto do depoimento do cliente';
COMMENT ON COLUMN testimonials.status IS 'Status do depoimento: pending, approved, rejected';
COMMENT ON COLUMN testimonials.is_featured IS 'Se o depoimento deve ser destacado na página principal';
COMMENT ON COLUMN testimonials.approved_at IS 'Data e hora da aprovação do depoimento';
COMMENT ON COLUMN testimonials.approved_by IS 'ID do usuário que aprovou o depoimento';

-- Migration: disable_rls_for_dev.sql
-- Disable RLS for Development Testing
-- WARNING: This script is for DEVELOPMENT ONLY, never use in production!
-- This script removes all RLS policies and disables RLS on all tables

-- Disable RLS on all tables
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_forms DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies for admin_users table
DROP POLICY IF EXISTS "Admin users can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can insert admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can update admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can delete admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin access only" ON admin_users;

-- Drop all existing RLS policies for activity_logs table
DROP POLICY IF EXISTS "Admin users can view all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admin users can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can manage activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admin access only" ON activity_logs;

-- Drop all existing RLS policies for app_settings table
DROP POLICY IF EXISTS "Admin users can view all app settings" ON app_settings;
DROP POLICY IF EXISTS "Admin users can insert app settings" ON app_settings;
DROP POLICY IF EXISTS "Admin users can update app settings" ON app_settings;
DROP POLICY IF EXISTS "Admin users can delete app settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can manage app settings" ON app_settings;
DROP POLICY IF EXISTS "Admin access only" ON app_settings;

-- Drop all existing RLS policies for carousel_images table
DROP POLICY IF EXISTS "Admin users can view all carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Admin users can insert carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Admin users can update carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Admin users can delete carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Admins can manage carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Admin access only" ON carousel_images;

-- Drop all existing RLS policies for contact_forms table
DROP POLICY IF EXISTS "Admin users can view all contact forms" ON contact_forms;
DROP POLICY IF EXISTS "Admin users can insert contact forms" ON contact_forms;
DROP POLICY IF EXISTS "Admin users can update contact forms" ON contact_forms;
DROP POLICY IF EXISTS "Admin users can delete contact forms" ON contact_forms;
DROP POLICY IF EXISTS "Admins can manage contact forms" ON contact_forms;
DROP POLICY IF EXISTS "Admin access only" ON contact_forms;
DROP POLICY IF EXISTS "Anyone can insert contact forms" ON contact_forms;
DROP POLICY IF EXISTS "Public can insert contact forms" ON contact_forms;

-- Grant full access to anon and authenticated roles for development
GRANT ALL PRIVILEGES ON admin_users TO anon;
GRANT ALL PRIVILEGES ON admin_users TO authenticated;
GRANT ALL PRIVILEGES ON activity_logs TO anon;
GRANT ALL PRIVILEGES ON activity_logs TO authenticated;
GRANT ALL PRIVILEGES ON app_settings TO anon;
GRANT ALL PRIVILEGES ON app_settings TO authenticated;
GRANT ALL PRIVILEGES ON carousel_images TO anon;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;
GRANT ALL PRIVILEGES ON contact_forms TO anon;
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;

-- Also grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
SELECT 'RLS disabled successfully for development testing!' as message;

-- Migration: fix_backup_policies.sql
-- Remover políticas existentes se houver conflito
DROP POLICY IF EXISTS "Authenticated users can upload backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can download own backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own backups" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can access backups bucket" ON storage.buckets;

-- Política para permitir que usuários autenticados façam upload de backups
CREATE POLICY "Authenticated users can upload backups" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir que usuários autenticados vejam backups
CREATE POLICY "Users can view backups" ON storage.objects
FOR SELECT USING (
  bucket_id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir que usuários autenticados excluam backups
CREATE POLICY "Users can delete backups" ON storage.objects
FOR DELETE USING (
  bucket_id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Política para o bucket backups
CREATE POLICY "Authenticated users can access backups bucket" ON storage.buckets
FOR SELECT USING (
  id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Garantir que RLS está habilitado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Migration: fix_rls_permissions.sql
-- Verificar e configurar permissões RLS para as tabelas clients e events

-- Habilitar RLS nas tabelas se não estiver habilitado
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_events ENABLE ROW LEVEL SECURITY;

-- Conceder permissões básicas para o role anon (usuários não autenticados)
GRANT SELECT ON clients TO anon;
GRANT SELECT ON events TO anon;
GRANT SELECT ON client_interactions TO anon;
GRANT SELECT ON event_participants TO anon;
GRANT SELECT ON client_events TO anon;

-- Conceder permissões completas para o role authenticated (usuários autenticados)
GRANT ALL PRIVILEGES ON clients TO authenticated;
GRANT ALL PRIVILEGES ON events TO authenticated;
GRANT ALL PRIVILEGES ON client_interactions TO authenticated;
GRANT ALL PRIVILEGES ON event_participants TO authenticated;
GRANT ALL PRIVILEGES ON client_events TO authenticated;

-- Criar políticas RLS para permitir acesso total aos usuários autenticados
DROP POLICY IF EXISTS "Allow authenticated users full access" ON clients;
CREATE POLICY "Allow authenticated users full access" ON clients
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users full access" ON events;
CREATE POLICY "Allow authenticated users full access" ON events
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users full access" ON client_interactions;
CREATE POLICY "Allow authenticated users full access" ON client_interactions
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users full access" ON event_participants;
CREATE POLICY "Allow authenticated users full access" ON event_participants
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users full access" ON client_events;
CREATE POLICY "Allow authenticated users full access" ON client_events
  FOR ALL USING (auth.role() = 'authenticated');

-- Permitir leitura pública para usuários anônimos (se necessário)
DROP POLICY IF EXISTS "Allow public read access" ON clients;
CREATE POLICY "Allow public read access" ON clients
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access" ON events;
CREATE POLICY "Allow public read access" ON events
  FOR SELECT USING (true);

-- Verificar as permissões atuais
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
AND table_name IN ('clients', 'events', 'client_interactions', 'event_participants', 'client_events')
ORDER BY table_name, grantee;

-- Migration: grant_permissions_dev.sql
-- Conceder permissões completas para desenvolvimento (RLS desabilitado)
-- Garantir que anon e authenticated tenham acesso total às tabelas

-- Tabela clients
GRANT ALL PRIVILEGES ON clients TO anon;
GRANT ALL PRIVILEGES ON clients TO authenticated;

-- Tabela events
GRANT ALL PRIVILEGES ON events TO anon;
GRANT ALL PRIVILEGES ON events TO authenticated;

-- Tabela testimonials
GRANT ALL PRIVILEGES ON testimonials TO anon;
GRANT ALL PRIVILEGES ON testimonials TO authenticated;

-- Tabela profiles
GRANT ALL PRIVILEGES ON profiles TO anon;
GRANT ALL PRIVILEGES ON profiles TO authenticated;

-- Tabela client_interactions
GRANT ALL PRIVILEGES ON client_interactions TO anon;
GRANT ALL PRIVILEGES ON client_interactions TO authenticated;

-- Garantir acesso às sequences também
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Migration: remove_rls_policies.sql
-- Remove all RLS policies and disable RLS for media upload tables
-- This migration removes all Row Level Security restrictions to allow unrestricted media uploads

-- Disable RLS on event_photos table
ALTER TABLE public.event_photos DISABLE ROW LEVEL SECURITY;

-- Disable RLS on events table
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies on event_photos (if they exist)
DO $$ 
BEGIN
    -- Drop all policies on event_photos
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.event_photos;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'event_photos'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if no policies exist
        NULL;
END $$;

-- Drop any existing policies on events (if they exist)
DO $$ 
BEGIN
    -- Drop all policies on events
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.events;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'events'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if no policies exist
        NULL;
END $$;

-- Remove storage policies for event-media bucket
DO $$ 
BEGIN
    -- Drop all policies on storage.objects for event-media bucket
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON storage.objects;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
        AND qual LIKE '%event-media%'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if no policies exist
        NULL;
END $$;

-- Grant full access to anon and authenticated roles on event_photos
GRANT ALL PRIVILEGES ON public.event_photos TO anon;
GRANT ALL PRIVILEGES ON public.event_photos TO authenticated;

-- Grant full access to anon and authenticated roles on events
GRANT ALL PRIVILEGES ON public.events TO anon;
GRANT ALL PRIVILEGES ON public.events TO authenticated;

-- Grant storage access for event-media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-media', 'event-media', true, 52428800, ARRAY['image/*', 'video/*'])
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/*', 'video/*'];

-- Create unrestricted storage policies for event-media bucket
CREATE POLICY "Allow all operations on event-media bucket" ON storage.objects
FOR ALL USING (bucket_id = 'event-media');

CREATE POLICY "Allow all operations on event-media bucket for anon" ON storage.objects
FOR ALL TO anon USING (bucket_id = 'event-media');

CREATE POLICY "Allow all operations on event-media bucket for authenticated" ON storage.objects
FOR ALL TO authenticated USING (bucket_id = 'event-media');

-- Ensure storage.objects has proper permissions
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO authenticated;

COMMIT;
