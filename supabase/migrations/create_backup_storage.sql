-- Criar bucket para backups
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('backups', 'backups', false, 52428800, ARRAY['application/json', 'application/gzip']);

-- Política para permitir que usuários autenticados façam upload de backups
CREATE POLICY "Authenticated users can upload backups" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir que usuários autenticados vejam seus próprios backups
CREATE POLICY "Users can view own backups" ON storage.objects
FOR SELECT USING (
  bucket_id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir que usuários autenticados baixem seus backups
CREATE POLICY "Users can download own backups" ON storage.objects
FOR SELECT USING (
  bucket_id = 'backups' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir que usuários autenticados excluam seus backups
CREATE POLICY "Users can delete own backups" ON storage.objects
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