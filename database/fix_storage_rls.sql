-- =========================================================================
-- SCRIPT DE CORREÇÃO ADICIONAL: STORAGE RLS (PROJETO waeyfjvwhhnwqregofda)
-- Execute este script no SQL Editor do Supabase para resetar as permissões
-- =========================================================================

-- 1. Garantir que os buckets existem e são públicos onde necessário
INSERT INTO storage.buckets (id, name, public) 
VALUES ('carousel-images', 'carousel-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Remover todas as políticas anteriores para evitar conflitos
DROP POLICY IF EXISTS "Carousel Images Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Carousel Images Admin Manage" ON storage.objects;
DROP POLICY IF EXISTS "Supplier Documents Admin Manage" ON storage.objects;
DROP POLICY IF EXISTS "Backups Admin Manage" ON storage.objects;
DROP POLICY IF EXISTS "Allow all for carousel-images" ON storage.objects;

-- 3. Criar nova política PERMISSIVA para o bucket do carrossel
-- Nota: Isso permitirá que as operações de upload funcionem enquanto depuramos a autenticação
CREATE POLICY "Allow all for carousel-images"
ON storage.objects FOR ALL
USING (bucket_id = 'carousel-images')
WITH CHECK (bucket_id = 'carousel-images');

-- 4. Criar política de leitura pública (redundante se o bucket for público, mas bom para garantir)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'carousel-images');

-- 5. Reaplicar políticas autenticadas para os demais buckets
CREATE POLICY "Authenticated Manage Documents"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated Manage Backups"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'backups')
WITH CHECK (bucket_id = 'backups');

-- 6. Garantir que o esquema storage tem as permissões corretas (opcional, mas seguro)
GRANT ALL ON TABLE storage.objects TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE storage.buckets TO postgres, service_role, authenticated, anon;
