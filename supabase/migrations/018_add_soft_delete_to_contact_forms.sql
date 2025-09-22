-- Add soft delete functionality to contact_forms table
-- Add deleted_at field for soft delete functionality

ALTER TABLE contact_forms ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance on queries filtering by deleted_at
CREate INDEX idx_contact_forms_deleted_at ON contact_forms(deleted_at);

-- Update RLS policies to exclude soft deleted records from normal queries
DROP POLICY IF EXISTS "Admin users can view all contact forms" ON contact_forms;
CREATE POLICY "Admin users can view all contact forms"
  ON contact_forms
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL OR is_admin(auth.uid()));

-- Allow admins to update deleted_at field
DROP POLICY IF EXISTS "Admin users can update contact forms" ON contact_forms;
CREATE POLICY "Admin users can update contact forms"
  ON contact_forms
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Comments for documentation
COMMENT ON COLUMN contact_forms.deleted_at IS 'Timestamp when contact form was soft deleted. NULL means not deleted.';
COMMENT ON INDEX idx_contact_forms_deleted_at IS 'Index for efficient soft delete queries';