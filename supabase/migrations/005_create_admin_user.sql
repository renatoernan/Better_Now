-- Create admin user for Better Now application
-- Email: betternow@cesire.com.br
-- Password: admin123

-- First, we need to create the user in auth.users table
-- Note: In Supabase, we use the auth.users table for authentication
-- The password will be hashed automatically by Supabase

-- Insert user into auth.users (this is the main authentication table)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'betternow@cesire.com.br',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated'
);

-- Get the user ID that was just created
-- Insert corresponding record in admin_users table
INSERT INTO admin_users (
  id,
  email,
  role,
  created_at
) 
SELECT 
  id,
  'betternow@cesire.com.br',
  'admin',
  now()
FROM auth.users 
WHERE email = 'betternow@cesire.com.br';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_forms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON carousel_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO authenticated;

-- Note: RLS policies may already exist, so we'll use CREATE POLICY IF NOT EXISTS
-- or handle potential conflicts gracefully

-- Update last_login for the new admin user
UPDATE admin_users 
SET last_login = now() 
WHERE email = 'betternow@cesire.com.br';