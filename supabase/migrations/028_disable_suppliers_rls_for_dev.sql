-- Desativar todas as políticas RLS das tabelas de fornecedores para desenvolvimento
-- Esta migração garante que não há restrições RLS durante a fase de desenvolvimento

-- Desativar RLS para todas as tabelas de fornecedores
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_category_relations DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_evaluations DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas RLS existentes das tabelas de fornecedores
DROP POLICY IF EXISTS "suppliers_authenticated_full_access" ON suppliers;
DROP POLICY IF EXISTS "suppliers_anonymous_select" ON suppliers;
DROP POLICY IF EXISTS "supplier_categories_authenticated_full_access" ON supplier_categories;
DROP POLICY IF EXISTS "supplier_categories_anonymous_select" ON supplier_categories;
DROP POLICY IF EXISTS "supplier_category_relations_authenticated_full_access" ON supplier_category_relations;
DROP POLICY IF EXISTS "supplier_category_relations_anonymous_select" ON supplier_category_relations;
DROP POLICY IF EXISTS "supplier_documents_authenticated_full_access" ON supplier_documents;
DROP POLICY IF EXISTS "supplier_documents_anonymous_select" ON supplier_documents;
DROP POLICY IF EXISTS "supplier_services_authenticated_full_access" ON supplier_services;
DROP POLICY IF EXISTS "supplier_services_anonymous_select" ON supplier_services;
DROP POLICY IF EXISTS "supplier_evaluations_authenticated_full_access" ON supplier_evaluations;
DROP POLICY IF EXISTS "supplier_evaluations_anonymous_select" ON supplier_evaluations;

-- Garantir que as tabelas são acessíveis para todos os usuários durante desenvolvimento
GRANT ALL ON suppliers TO anon, authenticated;
GRANT ALL ON supplier_categories TO anon, authenticated;
GRANT ALL ON supplier_category_relations TO anon, authenticated;
GRANT ALL ON supplier_documents TO anon, authenticated;
GRANT ALL ON supplier_services TO anon, authenticated;
GRANT ALL ON supplier_evaluations TO anon, authenticated;

-- Garantir acesso às sequências se existirem
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;