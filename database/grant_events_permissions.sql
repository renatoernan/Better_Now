-- Conceder permissões de SELECT para a role anon na tabela events
GRANT SELECT ON events TO anon;

-- Conceder permissões completas para a role authenticated na tabela events
GRANT ALL PRIVILEGES ON events TO authenticated;

-- Verificar as permissões concedidas
SELECT 
  grantee, 
  table_name, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'events'
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;