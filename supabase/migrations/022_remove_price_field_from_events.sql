-- Remove the price field from events table
-- This migration eliminates single price logic and keeps only price_batches

ALTER TABLE events DROP COLUMN IF EXISTS price;

-- Add comment to document the change
COMMENT ON TABLE events IS 'Events table - price field removed, using only price_batches for pricing';