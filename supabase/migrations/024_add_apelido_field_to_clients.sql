-- Adicionar campo 'apelido' na tabela clients
-- Migration: 024_add_apelido_field_to_clients.sql

-- Adicionar coluna apelido na tabela clients
ALTER TABLE clients 
ADD COLUMN apelido VARCHAR(255);

-- Adicionar comentário para documentação
COMMENT ON COLUMN clients.apelido IS 'Apelido ou nome informal do cliente';

-- Criar índice para melhorar performance em buscas por apelido
CREATE INDEX IF NOT EXISTS idx_clients_apelido ON clients(apelido);