-- Disable RLS for Development Testing
-- WARNING: This script is for DEVELOPMENT ONLY, never use in production!
-- This script removes all RLS policies and disables RLS on all tables

-- Disable RLS on all tables
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_forms DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies for admin_users table
DROP POLICY IF EXISTS "Admin users can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can insert admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can update admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can delete admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin access only" ON admin_users;

-- Drop all existing RLS policies for activity_logs table
DROP POLICY IF EXISTS "Admin users can view all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admin users can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can manage activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admin access only" ON activity_logs;

-- Drop all existing RLS policies for app_settings table
DROP POLICY IF EXISTS "Admin users can view all app settings" ON app_settings;
DROP POLICY IF EXISTS "Admin users can insert app settings" ON app_settings;
DROP POLICY IF EXISTS "Admin users can update app settings" ON app_settings;
DROP POLICY IF EXISTS "Admin users can delete app settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can manage app settings" ON app_settings;
DROP POLICY IF EXISTS "Admin access only" ON app_settings;

-- Drop all existing RLS policies for carousel_images table
DROP POLICY IF EXISTS "Admin users can view all carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Admin users can insert carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Admin users can update carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Admin users can delete carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Admins can manage carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Admin access only" ON carousel_images;

-- Drop all existing RLS policies for contact_forms table
DROP POLICY IF EXISTS "Admin users can view all contact forms" ON contact_forms;
DROP POLICY IF EXISTS "Admin users can insert contact forms" ON contact_forms;
DROP POLICY IF EXISTS "Admin users can update contact forms" ON contact_forms;
DROP POLICY IF EXISTS "Admin users can delete contact forms" ON contact_forms;
DROP POLICY IF EXISTS "Admins can manage contact forms" ON contact_forms;
DROP POLICY IF EXISTS "Admin access only" ON contact_forms;
DROP POLICY IF EXISTS "Anyone can insert contact forms" ON contact_forms;
DROP POLICY IF EXISTS "Public can insert contact forms" ON contact_forms;

-- Grant full access to anon and authenticated roles for development
GRANT ALL PRIVILEGES ON admin_users TO anon;
GRANT ALL PRIVILEGES ON admin_users TO authenticated;
GRANT ALL PRIVILEGES ON activity_logs TO anon;
GRANT ALL PRIVILEGES ON activity_logs TO authenticated;
GRANT ALL PRIVILEGES ON app_settings TO anon;
GRANT ALL PRIVILEGES ON app_settings TO authenticated;
GRANT ALL PRIVILEGES ON carousel_images TO anon;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;
GRANT ALL PRIVILEGES ON contact_forms TO anon;
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;

-- Also grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
SELECT 'RLS disabled successfully for development testing!' as message;