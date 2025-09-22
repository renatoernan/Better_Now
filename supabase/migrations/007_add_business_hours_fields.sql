-- Adicionar campos de horário de atendimento na tabela app_settings
-- Migration: 007_add_business_hours_fields
-- Created: 2024

-- Inserir os novos campos de horário de atendimento na tabela app_settings
INSERT INTO app_settings (key, value, description, created_at, updated_at) VALUES
('business_hours_weekdays', '"Segunda a Sexta: 08:00 - 18:00"', 'Horário de atendimento durante a semana', NOW(), NOW()),
('business_hours_weekend', '"Sábado: 08:00 - 12:00"', 'Horário de atendimento no fim de semana', NOW(), NOW()),
('business_hours_closed_days', '"Domingo: Fechado"', 'Dias em que o estabelecimento está fechado', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verificar se os registros foram inseridos corretamente
SELECT key, value, description FROM app_settings 
WHERE key IN ('business_hours_weekdays', 'business_hours_weekend', 'business_hours_closed_days')
ORDER BY key;