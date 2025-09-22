-- Adicionar campos faltantes à tabela events
ALTER TABLE events 
ADD COLUMN end_date DATE,
ADD COLUMN end_time TIME,
ADD COLUMN price_batches JSONB;

-- Comentários para documentar os novos campos
COMMENT ON COLUMN events.end_date IS 'Data de término do evento';
COMMENT ON COLUMN events.end_time IS 'Hora de término do evento';
COMMENT ON COLUMN events.price_batches IS 'Lotes de preços em formato JSON';

-- Atualizar permissões para os novos campos
GRANT SELECT, INSERT, UPDATE ON events TO anon;
GRANT ALL PRIVILEGES ON events TO authenticated;