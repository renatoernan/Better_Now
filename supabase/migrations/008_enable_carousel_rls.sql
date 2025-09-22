-- Habilitar RLS na tabela carousel_images
ALTER TABLE public.carousel_images ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT para usuários autenticados
CREATE POLICY "Authenticated users can view carousel images" ON public.carousel_images
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para permitir INSERT para usuários autenticados
CREATE POLICY "Authenticated users can insert carousel images" ON public.carousel_images
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política para permitir UPDATE para usuários autenticados
CREATE POLICY "Authenticated users can update carousel images" ON public.carousel_images
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política para permitir DELETE para usuários autenticados
CREATE POLICY "Authenticated users can delete carousel images" ON public.carousel_images
    FOR DELETE
    TO authenticated
    USING (true);

-- Garantir permissões para as roles anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carousel_images TO authenticated;
GRANT SELECT ON public.carousel_images TO anon;

-- Criar bucket carousel-images se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('carousel-images', 'carousel-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política de storage para permitir upload de imagens
CREATE POLICY "Authenticated users can upload carousel images" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'carousel-images');

-- Política de storage para permitir visualização de imagens
CREATE POLICY "Anyone can view carousel images" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'carousel-images');

-- Política de storage para permitir atualização de imagens
CREATE POLICY "Authenticated users can update carousel images" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'carousel-images')
    WITH CHECK (bucket_id = 'carousel-images');

-- Política de storage para permitir exclusão de imagens
CREATE POLICY "Authenticated users can delete carousel images" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'carousel-images');