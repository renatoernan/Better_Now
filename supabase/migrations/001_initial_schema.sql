-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create contact_forms table
CREATE TABLE contact_forms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    guests INTEGER NOT NULL,
    event_date DATE NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied'))
);

-- Create carousel_images table
CREATE TABLE carousel_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255),
    active BOOLEAN DEFAULT true,
    deleted BOOLEAN DEFAULT false,
    order_position INTEGER NOT NULL DEFAULT 0,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_url TEXT NOT NULL
);

-- Create admin_users table (using Supabase Auth)
CREATE TABLE admin_users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_contact_forms_created_at ON contact_forms(created_at DESC);
CREATE INDEX idx_contact_forms_status ON contact_forms(status);
CREATE INDEX idx_carousel_images_active ON carousel_images(active) WHERE active = true;
CREATE INDEX idx_carousel_images_order ON carousel_images(order_position) WHERE deleted = false;

-- Enable Row Level Security (RLS)
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_forms
-- Allow anonymous users to insert (for contact form submissions)
CREATE POLICY "Allow anonymous insert on contact_forms" ON contact_forms
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow authenticated admin users to view and manage all contact forms
CREATE POLICY "Allow admin full access to contact_forms" ON contact_forms
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid()
    ));

-- RLS Policies for carousel_images
-- Allow anonymous users to view active, non-deleted images
CREATE POLICY "Allow anonymous read active carousel_images" ON carousel_images
    FOR SELECT TO anon
    USING (active = true AND deleted = false);

-- Allow authenticated users to view all images
CREATE POLICY "Allow authenticated read all carousel_images" ON carousel_images
    FOR SELECT TO authenticated
    USING (true);

-- Allow admin users to manage carousel images
CREATE POLICY "Allow admin manage carousel_images" ON carousel_images
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid()
    ));

-- RLS Policies for admin_users
-- Allow admin users to view other admin users
CREATE POLICY "Allow admin read admin_users" ON admin_users
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid()
    ));

-- Allow admin users to update their own record
CREATE POLICY "Allow admin update own record" ON admin_users
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

-- Insert default carousel images (migrating from existing)
INSERT INTO carousel_images (filename, title, active, order_position, file_url) VALUES
    ('hero_1.png', 'Hero Image 1', true, 1, '/images/hero_1.png'),
    ('hero_2.png', 'Hero Image 2', true, 2, '/images/hero_2.png'),
    ('hero_3.png', 'Hero Image 3', true, 3, '/images/hero_3.png'),
    ('hero_4.png', 'Hero Image 4', true, 4, '/images/hero_4.png'),
    ('hero_5.png', 'Hero Image 5', true, 5, '/images/hero_5.png'),
    ('hero_6.png', 'Hero Image 6', true, 6, '/images/hero_6.png'),
    ('hero_7.png', 'Hero Image 7', true, 7, '/images/hero_7.png');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON contact_forms TO anon;
GRANT INSERT ON contact_forms TO anon;
GRANT ALL PRIVILEGES ON contact_forms TO authenticated;

GRANT SELECT ON carousel_images TO anon;
GRANT ALL PRIVILEGES ON carousel_images TO authenticated;

GRANT SELECT ON admin_users TO authenticated;
GRANT UPDATE ON admin_users TO authenticated;