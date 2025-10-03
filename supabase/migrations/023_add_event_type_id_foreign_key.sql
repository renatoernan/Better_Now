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