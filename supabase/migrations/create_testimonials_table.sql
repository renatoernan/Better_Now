-- Criar tabela testimonials
CREATE TABLE testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(20) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  testimonial_text TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de novos depoimentos (usuários anônimos)
CREATE POLICY "Allow anonymous insert testimonials" ON testimonials
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política para permitir leitura de depoimentos aprovados (usuários anônimos)
CREATE POLICY "Allow anonymous read approved testimonials" ON testimonials
  FOR SELECT
  TO anon
  USING (status = 'approved');

-- Política para permitir leitura de todos os depoimentos (usuários autenticados)
CREATE POLICY "Allow authenticated read all testimonials" ON testimonials
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir atualização de depoimentos (usuários autenticados)
CREATE POLICY "Allow authenticated update testimonials" ON testimonials
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para permitir exclusão de depoimentos (usuários autenticados)
CREATE POLICY "Allow authenticated delete testimonials" ON testimonials
  FOR DELETE
  TO authenticated
  USING (true);

-- Conceder permissões para as roles
GRANT SELECT ON testimonials TO anon;
GRANT ALL PRIVILEGES ON testimonials TO authenticated;

-- Inserir dados iniciais dos 3 depoimentos atuais
INSERT INTO testimonials (name, whatsapp, event_type, testimonial_text, status, is_featured, approved_at) VALUES
(
  'Maria Silva',
  '(11) 99999-1234',
  'Casamento',
  'A Better Now transformou nosso sonho em realidade! Cada detalhe foi cuidadosamente planejado e executado com perfeição. Nossa festa de casamento foi inesquecível, e todos os convidados elogiaram a organização impecável. Recomendo de olhos fechados!',
  'approved',
  true,
  now()
),
(
  'João Santos',
  '(11) 98888-5678',
  'Aniversário',
  'Contratei a Better Now para organizar os 15 anos da minha filha e foi a melhor decisão! A equipe é super profissional, atenciosa e criativa. A festa ficou linda, exatamente como imaginávamos. Parabéns pelo excelente trabalho!',
  'approved',
  true,
  now()
),
(
  'Ana Costa',
  '(11) 97777-9012',
  'Formatura',
  'Organização perfeita, atendimento excepcional e resultado surpreendente! A Better Now cuidou de todos os detalhes da nossa formatura com muito carinho e profissionalismo. Foi uma noite mágica que ficará para sempre em nossas memórias. Muito obrigada!',
  'approved',
  true,
  now()
);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_testimonials_updated_at_trigger
  BEFORE UPDATE ON testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_testimonials_updated_at();

-- Comentários para documentação
COMMENT ON TABLE testimonials IS 'Tabela para armazenar depoimentos de clientes';
COMMENT ON COLUMN testimonials.name IS 'Nome do cliente que deixou o depoimento';
COMMENT ON COLUMN testimonials.whatsapp IS 'WhatsApp do cliente para contato';
COMMENT ON COLUMN testimonials.event_type IS 'Tipo de evento (Casamento, Aniversário, Formatura, etc.)';
COMMENT ON COLUMN testimonials.testimonial_text IS 'Texto do depoimento do cliente';
COMMENT ON COLUMN testimonials.status IS 'Status do depoimento: pending, approved, rejected';
COMMENT ON COLUMN testimonials.is_featured IS 'Se o depoimento deve ser destacado na página principal';
COMMENT ON COLUMN testimonials.approved_at IS 'Data e hora da aprovação do depoimento';
COMMENT ON COLUMN testimonials.approved_by IS 'ID do usuário que aprovou o depoimento';