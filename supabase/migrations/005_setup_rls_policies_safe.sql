-- Enable Row Level Security on all tables (safe operation)
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anonymous insert on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow admin read on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow admin update on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow admin delete on contact_forms" ON contact_forms;
DROP POLICY IF EXISTS "Allow anonymous read active carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow admin full access on carousel_images" ON carousel_images;
DROP POLICY IF EXISTS "Allow admin access on admin_users" ON admin_users;

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

-- Add updated_at column to contact_forms if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contact_forms' AND column_name = 'updated_at') THEN
        ALTER TABLE contact_forms ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_contact_forms_updated_at ON contact_forms;
CREATE TRIGGER update_contact_forms_updated_at
    BEFORE UPDATE ON contact_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_contact_forms_status ON contact_forms(status);
CREATE INDEX IF NOT EXISTS idx_contact_forms_created_at ON contact_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_forms_event_date ON contact_forms(event_date);
CREATE INDEX IF NOT EXISTS idx_carousel_images_active ON carousel_images(active, deleted, order_position);
CREATE INDEX IF NOT EXISTS idx_carousel_images_order ON carousel_images(order_position) WHERE active = true AND deleted = false;

-- Create a view for public carousel images (for better performance)
CREATE OR REPLACE VIEW public_carousel_images AS
SELECT id, filename, title, file_url, order_position, uploaded_at
FROM carousel_images
WHERE active = true AND deleted = false
ORDER BY order_position ASC;

-- Ensure proper permissions are granted
-- Note: We don't re-grant permissions that might already exist to avoid errors
-- The permissions should already be set from previous migrations