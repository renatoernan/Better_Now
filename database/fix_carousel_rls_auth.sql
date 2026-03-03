-- =========================================================================
-- SCRIPT DE CORREÇÃO SEGURO: TABELA app_carousel_images RLS
-- =========================================================================

-- 1. Garantir RLS habilitado
ALTER TABLE app_carousel_images ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas atuais da tabela
DROP POLICY IF EXISTS "Allow public read app_carousel_images" ON app_carousel_images;
DROP POLICY IF EXISTS "Allow admin all app_carousel_images" ON app_carousel_images;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON app_carousel_images;
DROP POLICY IF EXISTS "Enable all for all" ON app_carousel_images;

-- 3. Criar política de LEITURA PÚBLICA (apenas ver imagens ativas no site)
CREATE POLICY "Public Read Active Images" 
ON app_carousel_images FOR SELECT 
USING (active = true AND deleted = false);

-- 4. Criar política RESTRITA PARA ADMINISTRADORES
-- Garante que quem está inserindo tem um "auth.uid()" válido e existe na tabela "app_admin_users"
CREATE POLICY "Admin Full Access" 
ON app_carousel_images FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM app_admin_users WHERE id = auth.uid())) 
WITH CHECK (EXISTS (SELECT 1 FROM app_admin_users WHERE id = auth.uid()));
