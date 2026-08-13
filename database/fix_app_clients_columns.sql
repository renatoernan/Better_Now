-- =========================================================================
-- FIX: Adicionar colunas faltantes na tabela app_clients
-- O frontend usa nomes de colunas diferentes dos que existem na tabela.
-- Este script adiciona as colunas que o frontend espera.
-- =========================================================================

-- Adicionar coluna 'name' (o frontend usa 'name', mas a tabela tem 'nome')
ALTER TABLE app_clients ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Copiar dados de 'nome' para 'name' (se 'nome' existir)
UPDATE app_clients SET name = nome WHERE name IS NULL AND nome IS NOT NULL;

-- Adicionar coluna 'whatsapp'
ALTER TABLE app_clients ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);

-- Copiar dados de 'telefone' para 'whatsapp' (se telefone existir)
UPDATE app_clients SET whatsapp = telefone WHERE whatsapp IS NULL AND telefone IS NOT NULL;

-- Adicionar coluna 'logradouro'
ALTER TABLE app_clients ADD COLUMN IF NOT EXISTS logradouro TEXT;

-- Copiar dados de 'endereco' para 'logradouro' (se endereco existir)
UPDATE app_clients SET logradouro = endereco WHERE logradouro IS NULL AND endereco IS NOT NULL;

-- Adicionar coluna 'uf' (o frontend usa 'uf', mas a tabela tem 'estado')
ALTER TABLE app_clients ADD COLUMN IF NOT EXISTS uf VARCHAR(2);

-- Copiar dados de 'estado' para 'uf' (se estado existir)
UPDATE app_clients SET uf = estado WHERE uf IS NULL AND estado IS NOT NULL;

-- Adicionar coluna 'notes' (o frontend usa 'notes', mas a tabela tem 'observacoes')
ALTER TABLE app_clients ADD COLUMN IF NOT EXISTS notes TEXT;

-- Copiar dados de 'observacoes' para 'notes' (se observacoes existir)
UPDATE app_clients SET notes = observacoes WHERE notes IS NULL AND observacoes IS NOT NULL;

-- Adicionar coluna 'validated'
ALTER TABLE app_clients ADD COLUMN IF NOT EXISTS validated BOOLEAN DEFAULT false;

-- Adicionar coluna 'is_active' (o frontend usa 'is_active', mas a tabela tem 'ativo')
ALTER TABLE app_clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Copiar dados de 'ativo' para 'is_active' (se ativo existir)
UPDATE app_clients SET is_active = ativo WHERE ativo IS NOT NULL;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_app_clients_name ON app_clients(name);
CREATE INDEX IF NOT EXISTS idx_app_clients_whatsapp ON app_clients(whatsapp);
CREATE INDEX IF NOT EXISTS idx_app_clients_email ON app_clients(email);
CREATE INDEX IF NOT EXISTS idx_app_clients_cidade ON app_clients(cidade);
CREATE INDEX IF NOT EXISTS idx_app_clients_uf ON app_clients(uf);
CREATE INDEX IF NOT EXISTS idx_app_clients_validated ON app_clients(validated);
CREATE INDEX IF NOT EXISTS idx_app_clients_is_active ON app_clients(is_active);
CREATE INDEX IF NOT EXISTS idx_app_clients_deleted_at ON app_clients(deleted_at);

-- Comentários para documentação
COMMENT ON COLUMN app_clients.name IS 'Nome completo do cliente (compatibilidade com frontend)';
COMMENT ON COLUMN app_clients.whatsapp IS 'Número de WhatsApp do cliente';
COMMENT ON COLUMN app_clients.logradouro IS 'Rua/Avenida do endereço';
COMMENT ON COLUMN app_clients.uf IS 'Sigla do estado (UF)';
COMMENT ON COLUMN app_clients.notes IS 'Observações sobre o cliente';
COMMENT ON COLUMN app_clients.validated IS 'Se o cliente foi validado pelo admin';
COMMENT ON COLUMN app_clients.is_active IS 'Se o cliente está ativo no sistema';
