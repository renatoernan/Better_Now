-- Adicionar soft delete para testimonials
ALTER TABLE testimonials ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_testimonials_deleted_at ON testimonials(deleted_at);

-- Atualizar política RLS para considerar soft delete
DROP POLICY IF EXISTS "Allow public read access to approved testimonials" ON testimonials;

CREATE POLICY "Allow public read access to approved testimonials" ON testimonials
  FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);

-- Política para admin ver todos os testimonials (incluindo deletados)
CREATE POLICY "Allow admin full access to all testimonials" ON testimonials
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Comentários para documentação
COMMENT ON COLUMN testimonials.deleted_at IS 'Timestamp when testimonial was soft deleted. NULL means not deleted.';
COMMENT ON INDEX idx_testimonials_deleted_at IS 'Index for efficient soft delete queries';