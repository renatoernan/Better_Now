-- Adicionar colunas para mensagens personalizadas do WAHA na tabela app_events
-- Migration: 034_add_waha_templates_to_events

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS waha_msg_order_created TEXT,
ADD COLUMN IF NOT EXISTS waha_msg_order_confirmed TEXT,
ADD COLUMN IF NOT EXISTS waha_msg_order_cancelled TEXT;

-- Garantir permissões de acesso
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_events TO anon, authenticated, service_role;

-- Verificar colunas adicionadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'app_events' AND column_name LIKE 'waha_%';
