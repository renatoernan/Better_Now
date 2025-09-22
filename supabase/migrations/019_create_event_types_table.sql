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