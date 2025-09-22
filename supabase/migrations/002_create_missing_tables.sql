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