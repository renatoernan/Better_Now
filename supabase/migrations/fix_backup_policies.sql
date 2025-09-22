-- Remover políticas existentes se houver conflito
DROP POLICY IF EXISTS "Authenticated users can upload backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can download own backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own backups" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can access backups bucket" ON storage.buckets;

-- Política para permitir que usuários autenticados façam upload de backups
CREATE POLICY "Authenticated users can upload backups" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir que usuários autenticados vejam backups
CREATE POLICY "Users can view backups" ON storage.objects
FOR SELECT USING (
  bucket_id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir que usuários autenticados excluam backups
CREATE POLICY "Users can delete backups" ON storage.objects
FOR DELETE USING (
  bucket_id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Política para o bucket backups
CREATE POLICY "Authenticated users can access backups bucket" ON storage.buckets
FOR SELECT USING (
  id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Garantir que RLS está habilitado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;