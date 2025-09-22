-- Corrigir políticas RLS para carousel_images
-- Remover políticas existentes e recriar corretamente

-- Remover todas as políticas existentes da tabela carousel_images
DROP POLICY IF EXISTS "Authenticated users can view carousel images" ON public.carousel_images;
DROP POLICY IF EXISTS "Authenticated users can insert carousel images" ON public.carousel_images;
DROP POLICY IF EXISTS "Authenticated users can update carousel images" ON public.carousel_images;
DROP POLICY IF EXISTS "Authenticated users can delete carousel images" ON public.carousel_images;

-- Remover políticas de storage existentes
DROP POLICY IF EXISTS "Authenticated users can upload carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete carousel images" ON storage.objects;

-- Habilitar RLS na tabela carousel_images
ALTER TABLE public.carousel_images ENABLE ROW LEVEL SECURITY;

-- Criar políticas para a tabela carousel_images
CREATE POLICY "carousel_images_select_policy" ON public.carousel_images
    FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "carousel_images_insert_policy" ON public.carousel_images
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "carousel_images_update_policy" ON public.carousel_images
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "carousel_images_delete_policy" ON public.carousel_images
    FOR DELETE
    TO authenticated
    USING (true);

-- Garantir permissões para as roles
GRANT ALL ON public.carousel_images TO authenticated;
GRANT SELECT ON public.carousel_images TO anon;

-- Criar bucket carousel-images se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('carousel-images', 'carousel-images', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de storage para o bucket carousel-images
CREATE POLICY "carousel_storage_insert_policy" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'carousel-images');

CREATE POLICY "carousel_storage_select_policy" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'carousel-images');

CREATE POLICY "carousel_storage_update_policy" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'carousel-images')
    WITH CHECK (bucket_id = 'carousel-images');

CREATE POLICY "carousel_storage_delete_policy" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'carousel-images');