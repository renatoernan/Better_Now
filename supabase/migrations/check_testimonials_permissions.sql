-- Verificar permissões atuais da tabela testimonials
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'testimonials'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Conceder permissões necessárias
-- Permitir que usuários anônimos vejam depoimentos aprovados
GRANT SELECT ON testimonials TO anon;

-- Permitir que usuários anônimos criem novos depoimentos
GRANT INSERT ON testimonials TO anon;

-- Permitir que usuários autenticados tenham acesso completo
GRANT ALL PRIVILEGES ON testimonials TO authenticated;

-- Verificar políticas RLS existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'testimonials';

-- Criar políticas RLS se não existirem
-- Política para leitura: usuários anônimos podem ver apenas depoimentos aprovados
DROP POLICY IF EXISTS "Allow anonymous read approved testimonials" ON testimonials;
CREATE POLICY "Allow anonymous read approved testimonials" 
ON testimonials FOR SELECT 
TO anon 
USING (status = 'approved');

-- Política para inserção: usuários anônimos podem criar depoimentos
DROP POLICY IF EXISTS "Allow anonymous insert testimonials" ON testimonials;
CREATE POLICY "Allow anonymous insert testimonials" 
ON testimonials FOR INSERT 
TO anon 
WITH CHECK (true);

-- Política para usuários autenticados: acesso completo
DROP POLICY IF EXISTS "Allow authenticated full access" ON testimonials;
CREATE POLICY "Allow authenticated full access" 
ON testimonials FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'testimonials';