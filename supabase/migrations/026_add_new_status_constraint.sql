-- Adicionar novo constraint de status com valores corretos
ALTER TABLE events ADD CONSTRAINT events_status_check 
  CHECK (status IN ('published', 'cancelled', 'completed', 'draft'));