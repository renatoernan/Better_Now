-- Add is_cover column to event_photos table
ALTER TABLE event_photos 
ADD COLUMN is_cover BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN event_photos.is_cover IS 'Indicates if this photo is the cover image for the event';

-- Create index for better performance when querying cover photos
CREATE INDEX idx_event_photos_is_cover ON event_photos(event_id, is_cover) WHERE is_cover = TRUE;

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON event_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_photos TO authenticated;