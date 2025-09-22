-- Criar bucket para imagens do carrossel
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'carousel-images',
  'carousel-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Política para permitir leitura pública das imagens
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'carousel-images');

-- Política para permitir upload apenas para usuários autenticados
CREATE POLICY "Authenticated users can upload carousel images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'carousel-images' AND
    auth.role() = 'authenticated'
  );

-- Política para permitir atualização apenas para usuários autenticados
CREATE POLICY "Authenticated users can update carousel images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'carousel-images' AND
    auth.role() = 'authenticated'
  );

-- Política para permitir exclusão apenas para usuários autenticados
CREATE POLICY "Authenticated users can delete carousel images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'carousel-images' AND
    auth.role() = 'authenticated'
  );

-- Atualizar a tabela carousel_images para incluir storage_path
ALTER TABLE carousel_images ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE carousel_images ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE carousel_images ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Criar índice para otimizar consultas por storage_path
CREATE INDEX IF NOT EXISTS idx_carousel_images_storage_path ON carousel_images(storage_path);

-- Comentários para documentação
COMMENT ON COLUMN carousel_images.storage_path IS 'Caminho do arquivo no Supabase Storage';
COMMENT ON COLUMN carousel_images.file_size IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN carousel_images.mime_type IS 'Tipo MIME do arquivo (image/jpeg, image/png, etc.)';