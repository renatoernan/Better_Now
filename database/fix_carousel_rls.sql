-- =========================================================================
-- SCRIPT DE CORREÇÃO: TABELA app_carousel_images RLS (PROJETO waeyfjvwhhnwqregofda)
-- Execute este script no SQL Editor do Supabase para liberar o upload
-- =========================================================================

-- 1. Garantir RLS habilitado
ALTER TABLE app_carousel_images ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas parciais existentes para evitar duplicidade
DROP POLICY IF EXISTS "Allow public read app_carousel_images" ON app_carousel_images;
DROP POLICY IF EXISTS "Allow admin all app_carousel_images" ON app_carousel_images;

-- 3. Criar nova política de LEITURA PÚBLICA (para o site ver as fotos)
CREATE POLICY "Allow public read app_carousel_images" 
ON app_carousel_images FOR SELECT 
USING (active = true AND deleted = false);

-- 4. Criar nova política de ADMINISTRAÇÃO TOTAL (para o Admin gerenciar)
CREATE POLICY "Allow admin all app_carousel_images" 
ON app_carousel_images FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
