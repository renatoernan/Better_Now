-- Habilitar RLS na tabela carousel_images
ALTER TABLE public.carousel_images ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can view carousel images" ON public.carousel_images;
CREATE POLICY "Authenticated users can view carousel images" ON public.carousel_images
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para permitir INSERT para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can insert carousel images" ON public.carousel_images;
CREATE POLICY "Authenticated users can insert carousel images" ON public.carousel_images
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política para permitir UPDATE para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can update carousel images" ON public.carousel_images;
CREATE POLICY "Authenticated users can update carousel images" ON public.carousel_images
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política para permitir DELETE para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can delete carousel images" ON public.carousel_images;
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