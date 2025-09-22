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