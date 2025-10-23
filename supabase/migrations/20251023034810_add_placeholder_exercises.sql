-- Add is_placeholder column to exercises table
-- This allows placeholders to be managed in the exercise library

ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN DEFAULT false;

-- Add index for filtering placeholders
CREATE INDEX IF NOT EXISTS idx_exercises_is_placeholder
ON exercises(is_placeholder)
WHERE is_placeholder = true;

-- Add comment for documentation
COMMENT ON COLUMN exercises.is_placeholder IS 'Indicates if this exercise is a placeholder template that athletes can fill with specific exercises';
