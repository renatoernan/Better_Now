-- Enable RLS on tables that don't have it yet
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Security function to check if user is admin
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

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous insert on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow admin select on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow admin update on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow admin delete on contact_forms" ON contact_forms;

DROP POLICY IF EXISTS "Allow anonymous select active carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow authenticated select active carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow admin select all carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow admin insert on carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow admin update on carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow admin delete on carousel_images" ON carousel_images;

DROP POLICY IF EXISTS "Allow admin select on admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow admin update own record" ON admin_users;

-- Create new policies for contact_forms
CREATE POLICY "contact_forms_anonymous_insert" ON contact_forms
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "contact_forms_admin_select" ON contact_forms
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "contact_forms_admin_update" ON contact_forms
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "contact_forms_admin_delete" ON contact_forms
  FOR DELETE TO authenticated
  USING (is_admin());

-- Create new policies for carousel_images
CREATE POLICY "carousel_images_public_select" ON carousel_images
  FOR SELECT TO anon, authenticated
  USING (active = true AND deleted = false);

CREATE POLICY "carousel_images_admin_all" ON carousel_images
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create policies for admin_users
CREATE POLICY "admin_users_admin_select" ON admin_users
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "admin_users_own_update" ON admin_users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create policies for activity_logs
CREATE POLICY "activity_logs_admin_select" ON activity_logs
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "activity_logs_system_insert" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create policies for app_settings
CREATE POLICY "app_settings_public_select" ON app_settings
  FOR SELECT TO anon, authenticated
  USING (key IN ('site_title', 'contact_email', 'phone', 'address', 'social_instagram', 'social_whatsapp'));

CREATE POLICY "app_settings_admin_all" ON app_settings
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Grant permissions to roles
GRANT SELECT, INSERT ON contact_forms TO anon;
GRANT SELECT ON carousel_images TO anon;
GRANT SELECT ON app_settings TO anon;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('carousel-images', 'carousel-images', true),
  ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Allow anonymous view carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated view carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin upload carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin update carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin delete carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin view backups" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin upload backups" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin delete backups" ON storage.objects;

CREATE POLICY "storage_carousel_public_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'carousel-images');

CREATE POLICY "storage_carousel_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'carousel-images' AND is_admin())
  WITH CHECK (bucket_id = 'carousel-images' AND is_admin());

CREATE POLICY "storage_backups_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'backups' AND is_admin())
  WITH CHECK (bucket_id = 'backups' AND is_admin());

-- Add comments
COMMENT ON FUNCTION is_admin() IS 'Verifica se o usuário atual é um administrador';