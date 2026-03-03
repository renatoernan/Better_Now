-- =========================================================================
-- SCRIPT DE CORREÇÃO: STORAGE BUCKETS & POLICIES (PROJETO waeyfjvwhhnwqregofda)
-- Execute este script no SQL Editor do Supabase para corrigir o erro "Bucket not found"
-- =========================================================================

-- 1. Criar buckets de Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('carousel-images', 'carousel-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar RLS se necessário (já habilitado por padrão no Supabase Storage)

-- 3. Políticas para CAROUSEL-IMAGES
-- Permite leitura pública das imagens
CREATE POLICY "Carousel Images Public Read" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'carousel-images');

-- Permite que usuários autenticados (Admin) gerenciem as imagens
CREATE POLICY "Carousel Images Admin Manage" 
ON storage.objects FOR ALL 
TO authenticated 
USING (bucket_id = 'carousel-images')
WITH CHECK (bucket_id = 'carousel-images');


-- 4. Políticas para DOCUMENTS (Sistema de Fornecedores)
-- Apenas usuários autenticados podem gerenciar documentos de fornecedores
CREATE POLICY "Supplier Documents Admin Manage" 
ON storage.objects FOR ALL 
TO authenticated 
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');


-- 5. Políticas para BACKUPS
-- Apenas usuários autenticados podem gerenciar backups
CREATE POLICY "Backups Admin Manage" 
ON storage.objects FOR ALL 
TO authenticated 
USING (bucket_id = 'backups')
WITH CHECK (bucket_id = 'backups');
