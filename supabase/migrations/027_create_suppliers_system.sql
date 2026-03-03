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