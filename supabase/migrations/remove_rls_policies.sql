-- Remove all RLS policies and disable RLS for media upload tables
-- This migration removes all Row Level Security restrictions to allow unrestricted media uploads

-- Disable RLS on event_photos table
ALTER TABLE public.event_photos DISABLE ROW LEVEL SECURITY;

-- Disable RLS on events table
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies on event_photos (if they exist)
DO $$ 
BEGIN
    -- Drop all policies on event_photos
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.event_photos;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'event_photos'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if no policies exist
        NULL;
END $$;

-- Drop any existing policies on events (if they exist)
DO $$ 
BEGIN
    -- Drop all policies on events
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.events;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'events'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if no policies exist
        NULL;
END $$;

-- Remove storage policies for event-media bucket
DO $$ 
BEGIN
    -- Drop all policies on storage.objects for event-media bucket
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON storage.objects;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
        AND qual LIKE '%event-media%'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if no policies exist
        NULL;
END $$;

-- Grant full access to anon and authenticated roles on event_photos
GRANT ALL PRIVILEGES ON public.event_photos TO anon;
GRANT ALL PRIVILEGES ON public.event_photos TO authenticated;

-- Grant full access to anon and authenticated roles on events
GRANT ALL PRIVILEGES ON public.events TO anon;
GRANT ALL PRIVILEGES ON public.events TO authenticated;

-- Grant storage access for event-media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-media', 'event-media', true, 52428800, ARRAY['image/*', 'video/*'])
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/*', 'video/*'];

-- Create unrestricted storage policies for event-media bucket
CREATE POLICY "Allow all operations on event-media bucket" ON storage.objects
FOR ALL USING (bucket_id = 'event-media');

CREATE POLICY "Allow all operations on event-media bucket for anon" ON storage.objects
FOR ALL TO anon USING (bucket_id = 'event-media');

CREATE POLICY "Allow all operations on event-media bucket for authenticated" ON storage.objects
FOR ALL TO authenticated USING (bucket_id = 'event-media');

-- Ensure storage.objects has proper permissions
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO authenticated;

COMMIT;