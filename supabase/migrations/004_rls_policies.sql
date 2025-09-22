-- Enable Row Level Security on all tables
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Contact Forms Policies
-- Allow anonymous users to insert contact forms (public contact form)
CREATE POLICY "Allow anonymous contact form submissions" ON contact_forms
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow authenticated admin users to view all contact forms
CREATE POLICY "Allow admin users to view contact forms" ON contact_forms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to update contact forms (status changes)
CREATE POLICY "Allow admin users to update contact forms" ON contact_forms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to delete contact forms
CREATE POLICY "Allow admin users to delete contact forms" ON contact_forms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Carousel Images Policies
-- Allow anonymous users to view active carousel images (for public display)
CREATE POLICY "Allow public to view active carousel images" ON carousel_images
  FOR SELECT TO anon, authenticated
  USING (active = true AND deleted = false);

-- Allow authenticated admin users to view all carousel images
CREATE POLICY "Allow admin users to view all carousel images" ON carousel_images
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to insert carousel images
CREATE POLICY "Allow admin users to insert carousel images" ON carousel_images
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to update carousel images
CREATE POLICY "Allow admin users to update carousel images" ON carousel_images
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to delete carousel images
CREATE POLICY "Allow admin users to delete carousel images" ON carousel_images
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Admin Users Policies
-- Allow authenticated admin users to view their own profile
CREATE POLICY "Allow admin users to view own profile" ON admin_users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Allow authenticated admin users to update their own profile
CREATE POLICY "Allow admin users to update own profile" ON admin_users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Storage Policies for carousel images bucket
-- Allow public access to view images in carousel-images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('carousel-images', 'carousel-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anonymous and authenticated users to view images
CREATE POLICY "Allow public to view carousel images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'carousel-images');

-- Allow authenticated admin users to upload images
CREATE POLICY "Allow admin users to upload carousel images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'carousel-images' AND
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to update images
CREATE POLICY "Allow admin users to update carousel images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'carousel-images' AND
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'carousel-images' AND
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Allow authenticated admin users to delete images
CREATE POLICY "Allow admin users to delete carousel images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'carousel-images' AND
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
    )
  );

-- Grant necessary permissions to anon and authenticated roles
GRANT SELECT ON contact_forms TO anon;
GRANT INSERT ON contact_forms TO anon;
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;

GRANT SELECT ON carousel_images TO anon;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;

GRANT SELECT, UPDATE ON admin_users TO authenticated;

-- Grant storage permissions
GRANT SELECT ON storage.objects TO anon;
GRANT ALL PRIVILEGES ON storage.objects TO authenticated;
GRANT ALL PRIVILEGES ON storage.buckets TO authenticated;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM admin_users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_forms_status ON contact_forms(status);
CREATE INDEX IF NOT EXISTS idx_contact_forms_created_at ON contact_forms(created_at);
CREATE INDEX IF NOT EXISTS idx_carousel_images_active ON carousel_images(active);
CREATE INDEX IF NOT EXISTS idx_carousel_images_deleted ON carousel_images(deleted);
CREATE INDEX IF NOT EXISTS idx_carousel_images_order ON carousel_images(order_position);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Add comments for documentation
COMMENT ON POLICY "Allow anonymous contact form submissions" ON contact_forms IS 'Permite que usuários anônimos enviem formulários de contato';
COMMENT ON POLICY "Allow admin users to view contact forms" ON contact_forms IS 'Permite que administradores visualizem todos os formulários de contato';
COMMENT ON POLICY "Allow public to view active carousel images" ON carousel_images IS 'Permite que o público visualize imagens ativas do carrossel';
COMMENT ON FUNCTION is_admin(UUID) IS 'Verifica se um usuário tem privilégios de administrador';
COMMENT ON FUNCTION get_user_role() IS 'Retorna o papel do usuário atual';