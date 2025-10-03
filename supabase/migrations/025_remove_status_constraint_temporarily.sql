-- Remover temporariamente o constraint de status para permitir atualizações
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;