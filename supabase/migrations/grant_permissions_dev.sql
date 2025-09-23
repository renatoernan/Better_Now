-- Conceder permissões completas para desenvolvimento (RLS desabilitado)
-- Garantir que anon e authenticated tenham acesso total às tabelas

-- Tabela clients
GRANT ALL PRIVILEGES ON clients TO anon;
GRANT ALL PRIVILEGES ON clients TO authenticated;

-- Tabela events
GRANT ALL PRIVILEGES ON events TO anon;
GRANT ALL PRIVILEGES ON events TO authenticated;

-- Tabela testimonials
GRANT ALL PRIVILEGES ON testimonials TO anon;
GRANT ALL PRIVILEGES ON testimonials TO authenticated;

-- Tabela profiles
GRANT ALL PRIVILEGES ON profiles TO anon;
GRANT ALL PRIVILEGES ON profiles TO authenticated;

-- Tabela client_interactions
GRANT ALL PRIVILEGES ON client_interactions TO anon;
GRANT ALL PRIVILEGES ON client_interactions TO authenticated;

-- Garantir acesso às sequences também
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;