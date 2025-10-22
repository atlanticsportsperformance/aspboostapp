-- Add tags column to routines table
-- This allows routines to be tagged just like workouts

-- Add tags column (text array) to routines
ALTER TABLE routines
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create an index for better performance when filtering by tags
CREATE INDEX IF NOT EXISTS idx_routines_tags ON routines USING gin(tags);

-- Example usage:
-- UPDATE routines SET tags = ARRAY['upper-body', 'strength', 'hypertrophy'] WHERE id = 'some-uuid';
-- SELECT * FROM routines WHERE 'strength' = ANY(tags);
