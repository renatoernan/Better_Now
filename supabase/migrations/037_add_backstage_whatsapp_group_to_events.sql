-- Adicionar coluna para ID do Grupo de WhatsApp do Backstage na tabela app_events
-- Migration: 037_add_backstage_whatsapp_group_to_events

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS backstage_whatsapp_group_id TEXT;

-- Garantir permissões de acesso
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_events TO anon, authenticated, service_role;

-- Comentário explicativo na coluna
COMMENT ON COLUMN public.app_events.backstage_whatsapp_group_id IS 'ID do grupo de WhatsApp do Backstage (ex: 120363429569747254@g.us) para cópia de todas as notificações do sistema.';
