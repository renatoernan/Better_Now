-- Migration to set betternow@cesire.com.br as the single admin user
-- This migration removes all existing users and creates only one admin user

-- First, remove all existing admin users
DELETE FROM admin_users;

-- Remove all existing auth users (this will cascade to related tables)
DELETE FROM auth.users;

-- Insert the single admin user into auth.users
-- Password 'admin123' is hashed using bcrypt
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token,
    email_change_token_new,
    recovery_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'betternow@cesire.com.br',
    '$2a$10$8K1p/a0dL2LkVx.LO8xo/.VxCJHyNx5QHZQZQZQZQZQZQZQZQZQZQ', -- bcrypt hash for 'admin123'
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Better Now Admin"}',
    false,
    NOW()
);

-- Get the user ID for the admin_users table
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the user ID we just created
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'betternow@cesire.com.br';
    
    -- Insert into admin_users table (using correct structure)
    INSERT INTO admin_users (
        id,
        email,
        role,
        created_at,
        last_login
    ) VALUES (
        admin_user_id,
        'betternow@cesire.com.br',
        'admin',
        NOW(),
        NOW()
    );
END $$;

-- Grant necessary permissions to anon and authenticated roles
GRANT SELECT ON contact_forms TO anon;
GRANT INSERT ON contact_forms TO anon;
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;
GRANT ALL PRIVILEGES ON admin_users TO authenticated;
GRANT ALL PRIVILEGES ON profiles TO authenticated;
GRANT ALL PRIVILEGES ON reminders TO authenticated;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;
GRANT ALL PRIVILEGES ON activity_logs TO authenticated;
GRANT ALL PRIVILEGES ON app_settings TO authenticated;

-- Update app settings to reflect single admin configuration
INSERT INTO app_settings (key, value, created_at, updated_at)
VALUES 
    ('single_admin_mode', '"true"', NOW(), NOW()),
    ('admin_email', '"betternow@cesire.com.br"', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- Log this migration in activity_logs
INSERT INTO activity_logs (
    id,
    user_id,
    action,
    description,
    metadata,
    ip_address,
    user_agent,
    created_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'betternow@cesire.com.br'),
    'MIGRATION',
    'Single admin user configuration applied - betternow@cesire.com.br',
    '{"migration": "006_single_admin_user", "admin_email": "betternow@cesire.com.br"}',
    '127.0.0.1',
    'Migration Script',
    NOW()
);

-- Note: The bcrypt hash above is a placeholder. In production, you should:
-- 1. Generate a proper bcrypt hash for 'admin123'
-- 2. Use Supabase Auth API to create the user properly
-- 3. This migration assumes RLS policies are already in place from previous migrations