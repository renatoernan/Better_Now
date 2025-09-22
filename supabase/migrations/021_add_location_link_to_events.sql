-- Adicionar campo location_link na tabela events
ALTER TABLE events 
ADD COLUMN location_link TEXT;

-- Comentário explicativo
COMMENT ON COLUMN events.location_link IS 'Link para visualizar o endereço do evento no mapa (Google Maps, etc.)';