-- Verificar e configurar permissões RLS para as tabelas clients e events

-- Habilitar RLS nas tabelas se não estiver habilitado
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_events ENABLE ROW LEVEL SECURITY;

-- Conceder permissões básicas para o role anon (usuários não autenticados)
GRANT SELECT ON clients TO anon;
GRANT SELECT ON events TO anon;
GRANT SELECT ON client_interactions TO anon;
GRANT SELECT ON event_participants TO anon;
GRANT SELECT ON client_events TO anon;

-- Conceder permissões completas para o role authenticated (usuários autenticados)
GRANT ALL PRIVILEGES ON clients TO authenticated;
GRANT ALL PRIVILEGES ON events TO authenticated;
GRANT ALL PRIVILEGES ON client_interactions TO authenticated;
GRANT ALL PRIVILEGES ON event_participants TO authenticated;
GRANT ALL PRIVILEGES ON client_events TO authenticated;

-- Criar políticas RLS para permitir acesso total aos usuários autenticados
DROP POLICY IF EXISTS "Allow authenticated users full access" ON clients;
CREATE POLICY "Allow authenticated users full access" ON clients
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users full access" ON events;
CREATE POLICY "Allow authenticated users full access" ON events
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users full access" ON client_interactions;
CREATE POLICY "Allow authenticated users full access" ON client_interactions
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users full access" ON event_participants;
CREATE POLICY "Allow authenticated users full access" ON event_participants
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users full access" ON client_events;
CREATE POLICY "Allow authenticated users full access" ON client_events
  FOR ALL USING (auth.role() = 'authenticated');

-- Permitir leitura pública para usuários anônimos (se necessário)
DROP POLICY IF EXISTS "Allow public read access" ON clients;
CREATE POLICY "Allow public read access" ON clients
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access" ON events;
CREATE POLICY "Allow public read access" ON events
  FOR SELECT USING (true);

-- Verificar as permissões atuais
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
AND table_name IN ('clients', 'events', 'client_interactions', 'event_participants', 'client_events')
ORDER BY table_name, grantee;