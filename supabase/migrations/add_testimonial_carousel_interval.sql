-- Adicionar campo para configurar intervalo do carrossel de depoimentos
ALTER TABLE app_settings 
ADD COLUMN testimonial_carousel_interval INTEGER DEFAULT 5000;

-- Comentário explicativo
COMMENT ON COLUMN app_settings.testimonial_carousel_interval IS 'Intervalo em milissegundos para rotação automática do carrossel de depoimentos (padrão: 5000ms = 5 segundos)';

-- Inserir valor padrão se não existir registro
INSERT INTO app_settings (testimonial_carousel_interval) 
SELECT 5000
WHERE NOT EXISTS (SELECT 1 FROM app_settings LIMIT 1);

-- Atualizar registro existente se já houver dados na tabela
UPDATE app_settings 
SET testimonial_carousel_interval = 5000 
WHERE testimonial_carousel_interval IS NULL;