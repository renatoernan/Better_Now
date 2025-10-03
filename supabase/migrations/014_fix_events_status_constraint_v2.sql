-- Corrigir constraint de status da tabela events
-- Primeiro verificar e corrigir todos os valores de status existentes

-- Atualizar todos os registros para valores válidos
UPDATE events SET status = 'published' WHERE status = 'active';
UPDATE events SET status = 'published' WHERE status = 'publicado';
UPDATE events SET status = 'published' WHERE status = 'ativo';
UPDATE events SET status = 'draft' WHERE status = 'rascunho';
UPDATE events SET status = 'cancelled' WHERE status = 'cancelado';
UPDATE events SET status = 'completed' WHERE status = 'concluido' OR status = 'concluído';

-- Definir um valor padrão para qualquer status não reconhecido
UPDATE events SET status = 'draft' WHERE status NOT IN ('published', 'cancelled', 'completed', 'draft');

-- Remover o constraint existente
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Criar novo constraint com os valores corretos
ALTER TABLE events ADD CONSTRAINT events_status_check 
  CHECK (status IN ('published', 'cancelled', 'completed', 'draft'));