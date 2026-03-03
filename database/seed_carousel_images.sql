-- =========================================================================
-- SCRIPT DE POPULAÇÃO: TABELA app_carousel_images
-- Este script insere as imagens de hero padrão na tabela correta utilizada pelo código.
-- =========================================================================

-- 1. Limpar registros órfãos ou incorretos (opcional, cuidado em prod)
-- TRUNCATE TABLE app_carousel_images;

-- 2. Inserir imagens padrão apontando para os arquivos locais na pasta /public/images/
-- Nota: O campo file_url aceita caminhos relativos que serão resolvidos pelo navegador.
INSERT INTO app_carousel_images (filename, title, active, order_position, file_url) VALUES
    ('hero_1.png', 'Celebração Vibrante', true, 1, '/images/hero_1.png'),
    ('hero_2.png', 'Brinde Especial', true, 2, '/images/hero_2.png'),
    ('hero_3.png', 'Decoração Sofisticada', true, 3, '/images/hero_3.png'),
    ('hero_4.png', 'Momento Mágico', true, 4, '/images/hero_4.png'),
    ('hero_5.png', 'Festa de Grande Porte', true, 5, '/images/hero_5.png'),
    ('hero_6.png', 'Detalhes que Encantam', true, 6, '/images/hero_6.png'),
    ('hero_7.png', 'Equipe Better Now', true, 7, '/images/hero_7.png')
ON CONFLICT (filename) DO UPDATE SET
    file_url = EXCLUDED.file_url,
    active = true,
    deleted = false;

-- 3. Garantir as permissões de leitura pública (RLS)
ALTER TABLE app_carousel_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read app_carousel_images" ON app_carousel_images;

CREATE POLICY "Allow public read app_carousel_images" 
ON app_carousel_images 
FOR SELECT 
TO anon, authenticated
USING (active = true AND deleted = false);
