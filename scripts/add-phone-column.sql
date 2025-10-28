-- Add phone column to athletes table
-- This column is optional (nullable) and stores athlete contact phone numbers

ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN athletes.phone IS 'Optional contact phone number for athlete';
