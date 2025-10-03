-- Adicionar constraint de status original (com 'active' em vez de 'published')
ALTER TABLE events ADD CONSTRAINT events_status_check 
  CHECK (status IN ('active', 'cancelled', 'completed', 'draft'));