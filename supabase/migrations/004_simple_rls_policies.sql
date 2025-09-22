-- Simple RLS policies for Better Now application

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

-- Enable RLS on all tables
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policies for contact_forms table
-- Allow anonymous users to insert (for contact form submissions)
CREATE POLICY "Allow anonymous insert on contact_forms" ON contact_forms
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow authenticated admin users to view all contact forms
CREATE POLICY "Allow admin select on contact_forms" ON contact_forms
  FOR SELECT TO authenticated
  USING (is_admin());

-- Allow authenticated admin users to update contact forms
CREATE POLICY "Allow admin update on contact_forms" ON contact_forms
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow authenticated admin users to delete contact forms
CREATE POLICY "Allow admin delete on contact_forms" ON contact_forms
  FOR DELETE TO authenticated
  USING (is_admin());

-- Policies for carousel_images table
-- Allow anonymous users to view active images
CREATE POLICY "Allow anonymous select active carousel_images" ON carousel_images
  FOR SELECT TO anon
  USING (active = true AND deleted = false);

-- Allow authenticated users to view active images
CREATE POLICY "Allow authenticated select active carousel_images" ON carousel_images
  FOR SELECT TO authenticated
  USING (active = true AND deleted = false);

-- Allow admin users to view all images
CREATE POLICY "Allow admin select all carousel_images" ON carousel_images
  FOR SELECT TO authenticated
  USING (is_admin());

-- Allow admin users to insert images
CREATE POLICY "Allow admin insert on carousel_images" ON carousel_images
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Allow admin users to update images
CREATE POLICY "Allow admin update on carousel_images" ON carousel_images
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow admin users to delete images
CREATE POLICY "Allow admin delete on carousel_images" ON carousel_images
  FOR DELETE TO authenticated
  USING (is_admin());

-- Policies for admin_users table
-- Only allow admin users to view admin users
CREATE POLICY "Allow admin select on admin_users" ON admin_users
  FOR SELECT TO authenticated
  USING (is_admin());

-- Only allow admin users to update their own record
CREATE POLICY "Allow admin update own record" ON admin_users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policies for activity_logs table
-- Allow admin users to view activity logs
CREATE POLICY "Allow admin select on activity_logs" ON activity_logs
  FOR SELECT TO authenticated
  USING (is_admin());

-- Allow system to insert activity logs
CREATE POLICY "Allow system insert on activity_logs" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Policies for app_settings table
-- Allow anonymous users to read public settings
CREATE POLICY "Allow anonymous select public app_settings" ON app_settings
  FOR SELECT TO anon
  USING (key IN ('site_title', 'contact_email', 'phone', 'address', 'social_instagram', 'social_whatsapp'));

-- Allow authenticated users to read public settings
CREATE POLICY "Allow authenticated select public app_settings" ON app_settings
  FOR SELECT TO authenticated
  USING (key IN ('site_title', 'contact_email', 'phone', 'address', 'social_instagram', 'social_whatsapp'));

-- Allow admin users to view all settings
CREATE POLICY "Allow admin select all app_settings" ON app_settings
  FOR SELECT TO authenticated
  USING (is_admin());

-- Allow admin users to update settings
CREATE POLICY "Allow admin update on app_settings" ON app_settings
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow admin users to insert settings
CREATE POLICY "Allow admin insert on app_settings" ON app_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Grant permissions to roles
-- Grant basic permissions to anon role
GRANT SELECT ON contact_forms TO anon;
GRANT INSERT ON contact_forms TO anon;
GRANT SELECT ON carousel_images TO anon;
GRANT SELECT ON app_settings TO anon;

-- Grant full permissions to authenticated role
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;
GRANT ALL PRIVILEGES ON admin_users TO authenticated;
GRANT ALL PRIVILEGES ON activity_logs TO authenticated;
GRANT ALL PRIVILEGES ON app_settings TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create storage bucket policies (if buckets exist)
-- Note: These will only work if the buckets are created
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('carousel-images', 'carousel-images', true),
  ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for carousel-images bucket
CREATE POLICY "Allow anonymous view carousel images" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'carousel-images');

CREATE POLICY "Allow authenticated view carousel images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'carousel-images');

CREATE POLICY "Allow admin upload carousel images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'carousel-images' AND is_admin());

CREATE POLICY "Allow admin update carousel images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'carousel-images' AND is_admin());

CREATE POLICY "Allow admin delete carousel images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'carousel-images' AND is_admin());

-- Storage policies for backups bucket
CREATE POLICY "Allow admin view backups" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'backups' AND is_admin());

CREATE POLICY "Allow admin upload backups" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'backups' AND is_admin());

CREATE POLICY "Allow admin delete backups" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'backups' AND is_admin());

-- Add comments
COMMENT ON FUNCTION is_admin() IS 'Verifica se o usuário atual é um administrador';