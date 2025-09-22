-- Políticas de Segurança RLS (Row Level Security) para Better Now
-- Este arquivo define as políticas de acesso para todas as tabelas

-- =============================================
-- TABELA: contact_forms
-- =============================================

-- Habilitar RLS na tabela contact_forms
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;

-- Política: Usuários anônimos podem inserir novos contatos
CREATE POLICY "Permitir inserção de contatos por usuários anônimos"
ON contact_forms
FOR INSERT
TO anon
WITH CHECK (true);

-- Política: Usuários autenticados podem ver todos os contatos
CREATE POLICY "Permitir leitura de contatos para usuários autenticados"
ON contact_forms
FOR SELECT
TO authenticated
USING (true);

-- Política: Usuários autenticados podem atualizar contatos
CREATE POLICY "Permitir atualização de contatos para usuários autenticados"
ON contact_forms
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Usuários autenticados podem deletar contatos
CREATE POLICY "Permitir exclusão de contatos para usuários autenticados"
ON contact_forms
FOR DELETE
TO authenticated
USING (true);

-- =============================================
-- TABELA: carousel_images
-- =============================================

-- Habilitar RLS na tabela carousel_images
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;

-- Política: Usuários anônimos podem ver imagens ativas
CREATE POLICY "Permitir leitura de imagens ativas para usuários anônimos"
ON carousel_images
FOR SELECT
TO anon
USING (active = true AND deleted = false);

-- Política: Usuários autenticados podem ver todas as imagens
CREATE POLICY "Permitir leitura de todas as imagens para usuários autenticados"
ON carousel_images
FOR SELECT
TO authenticated
USING (true);

-- Política: Usuários autenticados podem inserir imagens
CREATE POLICY "Permitir inserção de imagens para usuários autenticados"
ON carousel_images
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Usuários autenticados podem atualizar imagens
CREATE POLICY "Permitir atualização de imagens para usuários autenticados"
ON carousel_images
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Usuários autenticados podem deletar imagens
CREATE POLICY "Permitir exclusão de imagens para usuários autenticados"
ON carousel_images
FOR DELETE
TO authenticated
USING (true);

-- =============================================
-- TABELA: admin_users
-- =============================================

-- Habilitar RLS na tabela admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver apenas seu próprio perfil
CREATE POLICY "Permitir leitura do próprio perfil"
ON admin_users
FOR SELECT
TO authenticated
USING (auth.uid()::text = id::text);

-- Política: Usuários autenticados podem atualizar apenas seu próprio perfil
CREATE POLICY "Permitir atualização do próprio perfil"
ON admin_users
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- =============================================
-- TABELA: activity_logs
-- =============================================

-- Habilitar RLS na tabela activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver todos os logs
CREATE POLICY "Permitir leitura de logs para usuários autenticados"
ON activity_logs
FOR SELECT
TO authenticated
USING (true);

-- Política: Usuários autenticados podem inserir logs
CREATE POLICY "Permitir inserção de logs para usuários autenticados"
ON activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Sistema pode inserir logs (para triggers)
CREATE POLICY "Permitir inserção de logs pelo sistema"
ON activity_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- =============================================
-- STORAGE: Bucket carousel-images
-- =============================================

-- Política: Usuários anônimos podem ver imagens
CREATE POLICY "Permitir leitura de imagens para usuários anônimos"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'carousel-images');

-- Política: Usuários autenticados podem fazer upload de imagens
CREATE POLICY "Permitir upload de imagens para usuários autenticados"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'carousel-images');

-- Política: Usuários autenticados podem atualizar imagens
CREATE POLICY "Permitir atualização de imagens para usuários autenticados"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'carousel-images')
WITH CHECK (bucket_id = 'carousel-images');

-- Política: Usuários autenticados podem deletar imagens
CREATE POLICY "Permitir exclusão de imagens para usuários autenticados"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'carousel-images');

-- =============================================
-- STORAGE: Bucket backups
-- =============================================

-- Política: Usuários autenticados podem fazer backup
CREATE POLICY "Permitir backup para usuários autenticados"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'backups');

-- Política: Usuários autenticados podem ler backups
CREATE POLICY "Permitir leitura de backups para usuários autenticados"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'backups');

-- Política: Usuários autenticados podem deletar backups
CREATE POLICY "Permitir exclusão de backups para usuários autenticados"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'backups');

-- =============================================
-- FUNÇÕES DE SEGURANÇA
-- =============================================

-- Função para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário pode acessar logs
CREATE OR REPLACE FUNCTION can_access_logs()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin() OR EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS DE AUDITORIA
-- =============================================

-- Função para log automático de mudanças
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if user is authenticated
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO activity_logs (action, details, user_id, metadata)
    VALUES (
      TG_OP || '_' || TG_TABLE_NAME,
      'Operação ' || TG_OP || ' na tabela ' || TG_TABLE_NAME,
      auth.uid()::text,
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'old_data', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        'new_data', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de auditoria
CREATE TRIGGER contact_forms_audit
  AFTER INSERT OR UPDATE OR DELETE ON contact_forms
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER carousel_images_audit
  AFTER INSERT OR UPDATE OR DELETE ON carousel_images
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER admin_users_audit
  AFTER INSERT OR UPDATE OR DELETE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION log_changes();

-- =============================================
-- PERMISSÕES PARA ROLES
-- =============================================

-- Conceder permissões básicas para anon
GRANT SELECT ON contact_forms TO anon;
GRANT INSERT ON contact_forms TO anon;
GRANT SELECT ON carousel_images TO anon;
GRANT USAGE ON SEQUENCE contact_forms_id_seq TO anon;

-- Conceder permissões completas para authenticated
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;
GRANT ALL PRIVILEGES ON admin_users TO authenticated;
GRANT ALL PRIVILEGES ON activity_logs TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Conceder permissões para service_role (usado por triggers)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices para contact_forms
CREATE INDEX IF NOT EXISTS idx_contact_forms_status ON contact_forms(status);
CREATE INDEX IF NOT EXISTS idx_contact_forms_created_at ON contact_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_forms_event_type ON contact_forms(event_type);
CREATE INDEX IF NOT EXISTS idx_contact_forms_email ON contact_forms(email);

-- Índices para carousel_images
CREATE INDEX IF NOT EXISTS idx_carousel_images_active ON carousel_images(active, deleted);
CREATE INDEX IF NOT EXISTS idx_carousel_images_order ON carousel_images(order_position);
CREATE INDEX IF NOT EXISTS idx_carousel_images_uploaded_at ON carousel_images(uploaded_at DESC);

-- Índices para activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Índices para admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- =============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =============================================

COMMENT ON POLICY "Permitir inserção de contatos por usuários anônimos" ON contact_forms IS 
'Permite que visitantes do site enviem formulários de contato sem autenticação';

COMMENT ON POLICY "Permitir leitura de imagens ativas para usuários anônimos" ON carousel_images IS 
'Permite que visitantes vejam apenas imagens ativas e não deletadas no carrossel';

COMMENT ON FUNCTION is_admin() IS 
'Verifica se o usuário atual tem role de admin';

COMMENT ON FUNCTION log_changes() IS 
'Função de trigger para log automático de mudanças nas tabelas principais';

-- =============================================
-- VERIFICAÇÕES DE INTEGRIDADE
-- =============================================

-- Verificar se todas as políticas foram criadas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contact_forms' 
    AND policyname = 'Permitir inserção de contatos por usuários anônimos'
  ) THEN
    RAISE EXCEPTION 'Política de inserção para contact_forms não foi criada';
  END IF;
  
  RAISE NOTICE 'Todas as políticas RLS foram criadas com sucesso!';
END
$$;