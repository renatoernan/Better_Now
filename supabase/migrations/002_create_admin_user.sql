-- Create admin user in auth.users and admin_users tables
-- Note: This is a temporary solution for development
-- In production, you should create users through Supabase Auth UI or API

-- First, we need to insert into auth.users (this is handled by Supabase Auth)
-- For now, we'll create a trigger to automatically add users to admin_users when they sign up

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add to admin_users if email matches admin pattern
  IF NEW.email = 'admin@betternow.com' THEN
    INSERT INTO public.admin_users (id, email, role)
    VALUES (NEW.id, NEW.email, 'admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.admin_users TO supabase_auth_admin;

-- Note: To create the actual admin user, you need to:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add user" 
-- 3. Use email: admin@betternow.com
-- 4. Set a secure password
-- 5. The trigger will automatically add them to admin_users table

-- Alternative: You can also use the Supabase CLI or API to create the user
-- supabase auth users create admin@betternow.com --password your_secure_password