-- =========================================================================
-- SCRIPT CONSOLIDADO: APP UNIFIED SCHEMA
-- Todas as tabelas, triggers e funções estão prefixadas com "app_"
-- =========================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. FUNÇÕES BASE (PREFIXADAS COM app_)
-- =============================================

CREATE OR REPLACE FUNCTION app_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- 2. TABELAS (PREFIXADAS COM app_)
-- =============================================

-- Tabela: app_settings
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: app_admin_users
CREATE TABLE IF NOT EXISTS app_admin_users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT true
);

-- Tabela: app_activity_logs
CREATE TABLE IF NOT EXISTS app_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB,
  user_id UUID REFERENCES app_admin_users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: app_contact_forms
CREATE TABLE IF NOT EXISTS app_contact_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  event_type VARCHAR(100),
  guests INTEGER DEFAULT 1,
  event_date DATE,
  message TEXT,
  status VARCHAR(50) DEFAULT 'unread',
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: app_carousel_images
CREATE TABLE IF NOT EXISTS app_carousel_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255),
  file_url TEXT NOT NULL,
  storage_path TEXT,
  active BOOLEAN DEFAULT true,
  deleted BOOLEAN DEFAULT false,
  order_position INTEGER DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: app_clients
CREATE TABLE IF NOT EXISTS app_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  apelido VARCHAR(255),
  documento VARCHAR(50),
  telefone VARCHAR(50),
  email VARCHAR(255),
  cep VARCHAR(20),
  endereco TEXT,
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: app_event_types
CREATE TABLE IF NOT EXISTS app_event_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: app_events
CREATE TABLE IF NOT EXISTS app_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  location_link TEXT,
  client_id UUID REFERENCES app_clients(id),
  event_type_id UUID REFERENCES app_event_types(id),
  status VARCHAR(50) DEFAULT 'planning',
  guests INTEGER DEFAULT 0,
  observations TEXT,
  videos TEXT[],
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: app_testimonials
CREATE TABLE IF NOT EXISTS app_testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100),
  company VARCHAR(255),
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  logo_url TEXT,
  event_type VARCHAR(100),
  order_position INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: app_faqs
CREATE TABLE IF NOT EXISTS app_faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100),
  order_position INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: app_leads
CREATE TABLE IF NOT EXISTS app_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  message TEXT,
  origin VARCHAR(100),
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabelas modulares (Fornecedores)
CREATE TABLE IF NOT EXISTS app_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255) NOT NULL,
  documento VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. TRIGGERS DE ATUALIZAÇÃO (updated_at)
-- =============================================

CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_contact_forms_updated_at BEFORE UPDATE ON app_contact_forms FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_carousel_images_updated_at BEFORE UPDATE ON app_carousel_images FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_clients_updated_at BEFORE UPDATE ON app_clients FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_events_updated_at BEFORE UPDATE ON app_events FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_event_types_updated_at BEFORE UPDATE ON app_event_types FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_testimonials_updated_at BEFORE UPDATE ON app_testimonials FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_faqs_updated_at BEFORE UPDATE ON app_faqs FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_leads_updated_at BEFORE UPDATE ON app_leads FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_suppliers_updated_at BEFORE UPDATE ON app_suppliers FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();

-- =============================================
-- 4. INSERÇÕES PADRÃO (SEEDS)
-- =============================================

INSERT INTO app_settings (key, value, description) VALUES 
  ('site_title', '"Better Now"', 'Título do site'),
  ('contact_email', '"contato@betternow.com"', 'Email de contato'),
  ('phone', '"+55 11 99999-9999"', 'Telefone de contato'),
  ('address', '"São Paulo, SP"', 'Endereço'),
  ('carousel_autoplay', 'true', 'Autoplay do carrossel'),
  ('carousel_interval', '5000', 'Intervalo do carrossel em ms'),
  ('max_file_size', '5242880', 'Tamanho máximo de arquivo em bytes (5MB)'),
  ('allowed_file_types', '["image/jpeg", "image/png", "image/webp"]', 'Tipos de arquivo permitidos')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 5. POLÍTICAS BÁSICAS E RLS
-- =============================================

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read app_settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read app_carousel_images" ON app_carousel_images FOR SELECT USING (active = true AND deleted = false);
CREATE POLICY "Allow public insert app_contact_forms" ON app_contact_forms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin all app_contact_forms" ON app_contact_forms FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin all app_events" ON app_events FOR ALL USING (auth.role() = 'authenticated');
