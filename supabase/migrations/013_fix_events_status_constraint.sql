-- Corrigir constraint de status da tabela events
-- Alterar de 'active' para 'published' para compatibilidade com o frontend

-- Primeiro, atualizar registros existentes que tenham status inválido
UPDATE events SET status = 'published' WHERE status = 'active';
UPDATE events SET status = 'draft' WHERE status NOT IN ('published', 'cancelled', 'completed', 'draft');

-- Remover o constraint existente
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Criar novo constraint com 'published' em vez de 'active'
ALTER TABLE events ADD CONSTRAINT events_status_check 
  CHECK (status IN ('published', 'cancelled', 'completed', 'draft'));