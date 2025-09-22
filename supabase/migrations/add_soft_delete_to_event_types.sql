-- Migration: Add soft delete to event_types table
-- Add deleted_at column to event_types table for soft delete functionality

ALTER TABLE event_types 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance on queries filtering by deleted_at
CREATE INDEX idx_event_types_deleted_at ON event_types(deleted_at);

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON event_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_types TO authenticated;