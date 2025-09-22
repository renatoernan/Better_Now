-- Migração para atualizar campos de endereço na tabela clients
-- Remove campo phone e desmembra address em campos específicos

-- Remover campo phone
ALTER TABLE clients DROP COLUMN IF EXISTS phone;

-- Remover campo address antigo
ALTER TABLE clients DROP COLUMN IF EXISTS address;

-- Adicionar novos campos de endereço
ALTER TABLE clients ADD COLUMN cep VARCHAR(9); -- CEP com hífen opcional
ALTER TABLE clients ADD COLUMN logradouro TEXT;
ALTER TABLE clients ADD COLUMN complemento TEXT;
ALTER TABLE clients ADD COLUMN bairro VARCHAR(255);
ALTER TABLE clients ADD COLUMN estado VARCHAR(255);
ALTER TABLE clients ADD COLUMN uf VARCHAR(2); -- Sigla do estado

-- Comentários para documentação
COMMENT ON COLUMN clients.cep IS 'CEP do endereço do cliente';
COMMENT ON COLUMN clients.logradouro IS 'Logradouro (rua, avenida, etc.)';
COMMENT ON COLUMN clients.complemento IS 'Complemento do endereço (número, apartamento, etc.)';
COMMENT ON COLUMN clients.bairro IS 'Bairro do endereço';
COMMENT ON COLUMN clients.estado IS 'Estado por extenso';
COMMENT ON COLUMN clients.uf IS 'Sigla do estado (UF)';