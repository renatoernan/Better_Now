-- Enable Row Level Security on all tables
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Contact Forms Policies
-- Allow anonymous users to insert contact forms (for the public contact form)
CREATE POLICY "Allow anonymous insert on contact_forms" ON contact_forms
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow authenticated admin users to view all contact forms
CREATE POLICY "Allow admin read on contact_forms" ON contact_forms
  FOR SELECT TO authenticated
  USING (true);

-- Allow authenticated admin users to update contact forms (status changes)
CREATE POLICY "Allow admin update on contact_forms" ON contact_forms
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated admin users to delete contact forms
CREATE POLICY "Allow admin delete on contact_forms" ON contact_forms
  FOR DELETE TO authenticated
  USING (true);

-- Carousel Images Policies
-- Allow anonymous users to view active carousel images (for the public website)
CREATE POLICY "Allow anonymous read active carousel_images" ON carousel_images
  FOR SELECT TO anon
  USING (active = true AND deleted = false);

-- Allow authenticated admin users full access to carousel images
CREATE POLICY "Allow admin full access on carousel_images" ON carousel_images
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admin Users Policies
-- Only authenticated admin users can access admin_users table
CREATE POLICY "Allow admin access on admin_users" ON admin_users
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions to roles
-- Anonymous role permissions (for public website functionality)
GRANT SELECT ON carousel_images TO anon;
GRANT INSERT ON contact_forms TO anon;
GRANT USAGE ON SEQUENCE contact_forms_id_seq TO anon;

-- Authenticated role permissions (for admin functionality)
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;
GRANT ALL PRIVILEGES ON admin_users TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Storage policies for carousel images bucket
-- Allow anonymous users to view images
CREATE POLICY "Allow anonymous read on carousel-images bucket" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'carousel-images');

-- Allow authenticated admin users full access to storage
CREATE POLICY "Allow admin full access on carousel-images bucket" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'carousel-images')
  WITH CHECK (bucket_id = 'carousel-images');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at column to contact_forms if it doesn't exist
ALTER TABLE contact_forms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_contact_forms_updated_at ON contact_forms;
CREATE TRIGGER update_contact_forms_updated_at
    BEFORE UPDATE ON contact_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_forms_status ON contact_forms(status);
CREATE INDEX IF NOT EXISTS idx_contact_forms_created_at ON contact_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_forms_event_date ON contact_forms(event_date);
CREATE INDEX IF NOT EXISTS idx_carousel_images_active ON carousel_images(active, deleted, order_position);
CREATE INDEX IF NOT EXISTS idx_carousel_images_order ON carousel_images(order_position) WHERE active = true AND deleted = false;

-- Add comments for documentation
COMMENT ON POLICY "Allow anonymous insert on contact_forms" ON contact_forms IS 'Allows public users to submit contact forms through the website';
COMMENT ON POLICY "Allow admin read on contact_forms" ON contact_forms IS 'Allows authenticated admin users to view all contact form submissions';
COMMENT ON POLICY "Allow anonymous read active carousel_images" ON carousel_images IS 'Allows public users to view active carousel images on the website';
COMMENT ON POLICY "Allow admin full access on carousel_images" ON carousel_images IS 'Allows authenticated admin users to manage carousel images';

-- Create a view for public carousel images (for better performance)
CREATE OR REPLACE VIEW public_carousel_images AS
SELECT id, filename, title, file_url, order_position, uploaded_at
FROM carousel_images
WHERE active = true AND deleted = false
ORDER BY order_position ASC;

-- Grant access to the view
GRANT SELECT ON public_carousel_images TO anon;
GRANT SELECT ON public_carousel_images TO authenticated;