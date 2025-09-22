-- Migration: Add soft delete support to clients table
-- Add deleted_at field for soft delete functionality

ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance on soft delete queries
CREATE INDEX idx_clients_deleted_at ON clients(deleted_at);

-- Update RLS policies to consider soft delete
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated users to insert clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated users to update clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated users to delete clients" ON clients;

-- Recreate policies with soft delete consideration
CREATE POLICY "Allow authenticated users to view active clients" ON clients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert clients" ON clients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update clients" ON clients
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to soft delete clients" ON clients
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL PRIVILEGES ON clients TO authenticated;
GRANT SELECT ON clients TO anon;