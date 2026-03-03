-- =========================================================================
-- SCRIPT FINAL CONSOLIDADO: APP UNIFIED SCHEMA (PROJETO waeyfjvwhhnwqregofda)
-- Todas as tabelas, triggers e funções estão prefixadas com "app_"
-- =========================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. FUNÇÕES BASE
-- =============================================

CREATE OR REPLACE FUNCTION app_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- 2. TABELAS (CORE + ADMINISTRACAO)
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

-- =============================================
-- 3. TABELAS (SISTEMA DE FORNECEDORES)
-- =============================================

CREATE TABLE IF NOT EXISTS app_suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  document_type VARCHAR(10) CHECK (document_type IN ('CPF', 'CNPJ')),
  document_number VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  website VARCHAR(255),
  cep VARCHAR(10),
  address TEXT,
  address_number VARCHAR(20),
  address_complement VARCHAR(100),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(2),
  bank_name VARCHAR(100),
  bank_code VARCHAR(10),
  agency VARCHAR(20),
  account VARCHAR(20),
  account_type VARCHAR(20) CHECK (account_type IN ('corrente', 'poupanca')),
  pix_key VARCHAR(255),
  services_description TEXT,
  specializations TEXT[],
  service_area TEXT[],
  min_service_value DECIMAL(10,2),
  max_service_value DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_services INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS app_supplier_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50) DEFAULT 'Package',
  parent_id UUID REFERENCES app_supplier_categories(id),
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_supplier_category_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES app_suppliers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES app_supplier_categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, category_id)
);

CREATE TABLE IF NOT EXISTS app_supplier_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES app_suppliers(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS app_supplier_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES app_suppliers(id) ON DELETE CASCADE,
  event_id UUID REFERENCES app_events(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS app_supplier_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES app_suppliers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES app_supplier_services(id) ON DELETE CASCADE,
  event_id UUID REFERENCES app_events(id) ON DELETE SET NULL,
  evaluator_name VARCHAR(255),
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
-- 4. TRIGGERS E LOGICA DE ATUALIZACAO
-- =============================================

CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_clients_updated_at BEFORE UPDATE ON app_clients FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_events_updated_at BEFORE UPDATE ON app_events FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_suppliers_updated_at BEFORE UPDATE ON app_suppliers FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_supplier_categories_updated_at BEFORE UPDATE ON app_supplier_categories FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_supplier_documents_updated_at BEFORE UPDATE ON app_supplier_documents FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();
CREATE TRIGGER trg_app_supplier_services_updated_at BEFORE UPDATE ON app_supplier_services FOR EACH ROW EXECUTE FUNCTION app_update_updated_at_column();

CREATE OR REPLACE FUNCTION app_update_supplier_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE app_suppliers 
    SET rating = (
        SELECT COALESCE(AVG(overall_rating), 0)
        FROM app_supplier_evaluations 
        WHERE supplier_id = NEW.supplier_id
    )
    WHERE id = NEW.supplier_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_supplier_rating_trigger
    AFTER INSERT OR UPDATE ON app_supplier_evaluations
    FOR EACH ROW EXECUTE FUNCTION app_update_supplier_rating();

-- =============================================
-- 5. POLÍTICAS RLS (Row Level Security)
-- =============================================

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_supplier_category_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_supplier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_supplier_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_supplier_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read app_settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read app_carousel_images" ON app_carousel_images FOR SELECT USING (active = true AND deleted = false);
CREATE POLICY "Allow public insert app_contact_forms" ON app_contact_forms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin all app_contact_forms" ON app_contact_forms FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin all app_events" ON app_events FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage suppliers" ON app_suppliers FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage categories" ON app_supplier_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage documents" ON app_supplier_documents FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage services" ON app_supplier_services FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage evaluations" ON app_supplier_evaluations FOR ALL TO authenticated USING (true);
CREATE POLICY "Public can view active suppliers" ON app_suppliers FOR SELECT TO anon USING (status = 'active' AND deleted_at IS NULL);
CREATE POLICY "Public can view active categories" ON app_supplier_categories FOR SELECT TO anon USING (active = true);

-- =============================================
-- 6. INSERÇÕES PADRÃO (SEEDS)
-- =============================================

INSERT INTO app_settings (key, value, description) VALUES 
  ('site_title', '"Better Now"', 'Título do site'),
  ('contact_email', '"contato@betternow.com"', 'Email de contato'),
  ('phone', '"+55 11 99999-9999"', 'Telefone de contato'),
  ('carousel_autoplay', 'true', 'Autoplay do carrossel'),
  ('carousel_interval', '5000', 'Intervalo do carrossel em ms')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_supplier_categories (name, description, color, icon, sort_order) VALUES
('Alimentação', 'Fornecedores de comidas e bebidas', '#10B981', 'UtensilsCrossed', 1),
('Decoração', 'Decoração e ambientação de eventos', '#F59E0B', 'Palette', 2),
('Som e Iluminação', 'Equipamentos audiovisuais', '#8B5CF6', 'Volume2', 3),
('Segurança', 'Serviços de segurança e portaria', '#EF4444', 'Shield', 4),
('Fotografia', 'Fotografia e filmagem', '#EC4899', 'Camera', 7)
ON CONFLICT (name) DO NOTHING;
