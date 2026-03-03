-- =========================================================================
-- SCRIPT DE CORREÇÃO FINAL: TABELA app_carousel_images RLS (PROJETO waeyfjvwhhnwqregofda)
-- =========================================================================

-- 1. Garantir RLS habilitado
ALTER TABLE app_carousel_images ENABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas da tabela para começar limpo
DROP POLICY IF EXISTS "Allow public read app_carousel_images" ON app_carousel_images;
DROP POLICY IF EXISTS "Allow admin all app_carousel_images" ON app_carousel_images;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON app_carousel_images;
DROP POLICY IF EXISTS "Enable all for all" ON app_carousel_images;

-- 3. Criar uma política GLOBAL e PERMISSIVA para resolver qualquer bloqueio
-- ATENÇÃO: Essa política libera o INSERT / UPDATE para qualquer um,
-- o ideal é rodar assim para testar e validar o upload e o cache do navegador.
CREATE POLICY "Enable all for all" 
ON app_carousel_images FOR ALL 
USING (true) 
WITH CHECK (true);
