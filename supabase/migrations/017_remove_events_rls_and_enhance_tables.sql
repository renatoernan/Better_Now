-- Migration: Remove RLS policies from events tables and enhance structure
-- Created: 2024

-- Drop all RLS policies for events table
DROP POLICY IF EXISTS "events_select_policy" ON public.events;
DROP POLICY IF EXISTS "events_insert_policy" ON public.events;
DROP POLICY IF EXISTS "events_update_policy" ON public.events;
DROP POLICY IF EXISTS "events_delete_policy" ON public.events;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.events;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.events;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.events;

-- Drop all RLS policies for event_participants table
DROP POLICY IF EXISTS "event_participants_select_policy" ON public.event_participants;
DROP POLICY IF EXISTS "event_participants_insert_policy" ON public.event_participants;
DROP POLICY IF EXISTS "event_participants_update_policy" ON public.event_participants;
DROP POLICY IF EXISTS "event_participants_delete_policy" ON public.event_participants;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.event_participants;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.event_participants;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.event_participants;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.event_participants;

-- Drop all RLS policies for client_events table
DROP POLICY IF EXISTS "client_events_select_policy" ON public.client_events;
DROP POLICY IF EXISTS "client_events_insert_policy" ON public.client_events;
DROP POLICY IF EXISTS "client_events_update_policy" ON public.client_events;
DROP POLICY IF EXISTS "client_events_delete_policy" ON public.client_events;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.client_events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.client_events;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.client_events;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.client_events;

-- Disable RLS on all events tables
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_events DISABLE ROW LEVEL SECURITY;

-- Add missing fields to events table for enhanced functionality
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS gallery_urls TEXT[];
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_deadline DATE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS additional_info TEXT;

-- Create event_photos table for gallery functionality
CREATE TABLE IF NOT EXISTS public.event_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS on event_photos table
ALTER TABLE public.event_photos DISABLE ROW LEVEL SECURITY;

-- Create event_notifications table for automatic notifications
CREATE TABLE IF NOT EXISTS public.event_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES public.event_participants(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('registration_confirmation', 'event_reminder', 'event_update', 'event_cancellation')),
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS on event_notifications table
ALTER TABLE public.event_notifications DISABLE ROW LEVEL SECURITY;

-- Add check-in functionality to event_participants
ALTER TABLE public.event_participants ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE public.event_participants ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES auth.users(id);

-- Grant permissions to anon and authenticated roles
GRANT ALL PRIVILEGES ON public.events TO anon;
GRANT ALL PRIVILEGES ON public.events TO authenticated;
GRANT ALL PRIVILEGES ON public.event_participants TO anon;
GRANT ALL PRIVILEGES ON public.event_participants TO authenticated;
GRANT ALL PRIVILEGES ON public.client_events TO anon;
GRANT ALL PRIVILEGES ON public.client_events TO authenticated;
GRANT ALL PRIVILEGES ON public.event_photos TO anon;
GRANT ALL PRIVILEGES ON public.event_photos TO authenticated;
GRANT ALL PRIVILEGES ON public.event_notifications TO anon;
GRANT ALL PRIVILEGES ON public.event_notifications TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON public.event_participants(status);
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_event_id ON public.event_notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_status ON public.event_notifications(status);

COMMIT;