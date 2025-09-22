-- Adicionar campo videos à tabela events
-- Este campo armazenará URLs dos vídeos como um array de texto

ALTER TABLE public.events 
ADD COLUMN videos text[] DEFAULT NULL;

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN public.events.videos IS 'Array de URLs dos vídeos do evento';

-- Verificar se a coluna foi criada corretamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'videos';