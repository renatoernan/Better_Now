-- =========================================================================
-- MIGRATION: Adicionar colunas faltantes à tabela app_testimonials
-- Resolve bug: botão "Enviando..." travado ao enviar depoimento
-- 
-- Campos do formulário público:
--   name (já existe), email, event_name, event_type (já existe),
--   rating (já existe), testimonial_text
--
-- Campos de gerenciamento/aprovação:
--   whatsapp, status, is_featured,
--   approved_at, approved_by,
--   rejected_at, rejected_by, rejection_reason
-- =========================================================================

-- Campos do formulário público
ALTER TABLE app_testimonials 
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS event_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS testimonial_text TEXT;

-- Campo de contato
ALTER TABLE app_testimonials 
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);

-- Campos de moderação/status
ALTER TABLE app_testimonials 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Campos de aprovação
ALTER TABLE app_testimonials 
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID;

-- Campos de rejeição
ALTER TABLE app_testimonials 
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Atualizar registros existentes: copiar conteúdo de "content" para "testimonial_text" onde aplicável
UPDATE app_testimonials 
SET testimonial_text = content, status = 'approved'
WHERE testimonial_text IS NULL AND content IS NOT NULL;
