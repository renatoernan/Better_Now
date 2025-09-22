-- Migration: Add soft delete support to events table
-- Add deleted_at field for soft delete functionality

ALTER TABLE events ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance on soft delete queries
CREATE INDEX idx_events_deleted_at ON events(deleted_at);

-- Update RLS policies to consider soft delete
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to active events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to manage events" ON events;

-- Recreate policies with soft delete consideration
CREATE POLICY "Allow public read access to active events" ON events
    FOR SELECT USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Allow authenticated users to view all events" ON events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert events" ON events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update events" ON events
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to soft delete events" ON events
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON events TO anon;
GRANT ALL PRIVILEGES ON events TO authenticated;

-- Comment for documentation
COMMENT ON COLUMN events.deleted_at IS 'Timestamp when the event was soft deleted. NULL means the event is active.';