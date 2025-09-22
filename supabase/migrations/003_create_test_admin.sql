-- Create test admin user
-- This creates a user in Supabase Auth and adds them to admin_users table

-- Insert admin user into auth.users (this will be handled by Supabase Auth)
-- For testing purposes, we'll create a user with email: admin@betternow.com
-- Password should be set through Supabase Auth UI or API

-- Note: This is a placeholder - actual user creation should be done through Supabase Auth
-- The trigger will automatically add the user to admin_users table when they sign up

-- Grant permissions to authenticated users to read admin_users table
GRANT SELECT ON admin_users TO authenticated;
GRANT INSERT ON admin_users TO authenticated;
GRANT UPDATE ON admin_users TO authenticated;

-- Ensure RLS policies allow admin users to access their own data
CREATE POLICY "Admin users can view their own data" ON admin_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin users can update their own data" ON admin_users
  FOR UPDATE USING (auth.uid() = id);

-- Allow service role to manage admin users
CREATE POLICY "Service role can manage admin users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');