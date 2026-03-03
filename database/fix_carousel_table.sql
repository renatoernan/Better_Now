-- =========================================================================
-- SCRIPT DE CORREÇÃO: TABELA app_carousel_images (PROJETO waeyfjvwhhnwqregofda)
-- Execute este script no SQL Editor do Supabase para adicionar colunas faltantes
-- =========================================================================

-- Adicionar colunas file_size e mime_type se elas não existirem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'app_carousel_images' AND COLUMN_NAME = 'file_size') THEN
        ALTER TABLE app_carousel_images ADD COLUMN file_size INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'app_carousel_images' AND COLUMN_NAME = 'mime_type') THEN
        ALTER TABLE app_carousel_images ADD COLUMN mime_type VARCHAR(100);
    END IF;
END $$;
