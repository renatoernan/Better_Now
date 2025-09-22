-- Adicionar campo 'numero' após logradouro e alterar 'estado' para 'cidade'
ALTER TABLE clients 
ADD COLUMN numero VARCHAR(20);

-- Renomear campo 'estado' para 'cidade'
ALTER TABLE clients 
RENAME COLUMN estado TO cidade;

-- Atualizar comentários dos campos
COMMENT ON COLUMN clients.cidade IS 'Cidade do endereço';
COMMENT ON COLUMN clients.numero IS 'Número do endereço do cliente';