-- =========================================================================
-- SCRIPT DE CORREÇÃO: POLÍTICAS RLS COMPLETAS
-- Garante que todas as tabelas tenham as políticas necessárias
-- para funcionamento do painel admin (autenticado) e área pública (anon)
-- =========================================================================

-- =============================================
-- app_admin_users - CRÍTICO: necessário para login
-- =============================================
ALTER TABLE app_admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can read own data" ON app_admin_users;
DROP POLICY IF EXISTS "Admin users can update own data" ON app_admin_users;
DROP POLICY IF EXISTS "Allow authenticated read app_admin_users" ON app_admin_users;

-- Permitir que usuários autenticados leiam seus próprios dados (necessário para login)
CREATE POLICY "Allow authenticated read app_admin_users"
ON app_admin_users FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Permitir que usuários autenticados atualizem seus próprios dados (last_login)
CREATE POLICY "Allow authenticated update own app_admin_users"
ON app_admin_users FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- =============================================
-- app_activity_logs - Logs de atividade
-- =============================================
ALTER TABLE app_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read app_activity_logs" ON app_activity_logs;
DROP POLICY IF EXISTS "Allow authenticated insert app_activity_logs" ON app_activity_logs;

CREATE POLICY "Allow authenticated read app_activity_logs"
ON app_activity_logs FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert app_activity_logs"
ON app_activity_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- =============================================
-- app_clients - Gerenciamento de clientes
-- =============================================
ALTER TABLE app_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all app_clients" ON app_clients;

CREATE POLICY "Allow authenticated all app_clients"
ON app_clients FOR ALL TO authenticated
USING (true);

-- =============================================
-- app_testimonials - Depoimentos
-- =============================================
ALTER TABLE app_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all app_testimonials" ON app_testimonials;
DROP POLICY IF EXISTS "Allow public read approved app_testimonials" ON app_testimonials;
DROP POLICY IF EXISTS "Allow anon insert app_testimonials" ON app_testimonials;

CREATE POLICY "Allow authenticated all app_testimonials"
ON app_testimonials FOR ALL TO authenticated
USING (true);

CREATE POLICY "Allow public read approved app_testimonials"
ON app_testimonials FOR SELECT TO anon
USING (active = true AND deleted_at IS NULL);

CREATE POLICY "Allow anon insert app_testimonials"
ON app_testimonials FOR INSERT TO anon
WITH CHECK (true);

-- =============================================
-- app_carousel_images - Permitir admin gerenciar
-- =============================================
DROP POLICY IF EXISTS "Allow authenticated all app_carousel_images" ON app_carousel_images;

CREATE POLICY "Allow authenticated all app_carousel_images"
ON app_carousel_images FOR ALL TO authenticated
USING (true);

-- =============================================
-- app_settings - Permitir admin atualizar
-- =============================================
DROP POLICY IF EXISTS "Allow authenticated all app_settings" ON app_settings;

CREATE POLICY "Allow authenticated all app_settings"
ON app_settings FOR ALL TO authenticated
USING (true);

-- =============================================
-- app_event_types - Tipos de evento
-- =============================================
ALTER TABLE app_event_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all app_event_types" ON app_event_types;
DROP POLICY IF EXISTS "Allow public read app_event_types" ON app_event_types;

CREATE POLICY "Allow authenticated all app_event_types"
ON app_event_types FOR ALL TO authenticated
USING (true);

CREATE POLICY "Allow public read app_event_types"
ON app_event_types FOR SELECT TO anon
USING (active = true);

-- =============================================
-- app_faqs - Perguntas frequentes
-- =============================================
ALTER TABLE app_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all app_faqs" ON app_faqs;
DROP POLICY IF EXISTS "Allow public read app_faqs" ON app_faqs;

CREATE POLICY "Allow authenticated all app_faqs"
ON app_faqs FOR ALL TO authenticated
USING (true);

CREATE POLICY "Allow public read app_faqs"
ON app_faqs FOR SELECT TO anon
USING (active = true);

-- =============================================
-- app_leads
-- =============================================
ALTER TABLE app_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all app_leads" ON app_leads;
DROP POLICY IF EXISTS "Allow anon insert app_leads" ON app_leads;

CREATE POLICY "Allow authenticated all app_leads"
ON app_leads FOR ALL TO authenticated
USING (true);

CREATE POLICY "Allow anon insert app_leads"
ON app_leads FOR INSERT TO anon
WITH CHECK (true);

-- =============================================
-- app_supplier_category_relations
-- =============================================
DROP POLICY IF EXISTS "Allow authenticated all app_supplier_category_relations" ON app_supplier_category_relations;

CREATE POLICY "Allow authenticated all app_supplier_category_relations"
ON app_supplier_category_relations FOR ALL TO authenticated
USING (true);
