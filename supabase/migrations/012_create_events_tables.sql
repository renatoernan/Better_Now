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