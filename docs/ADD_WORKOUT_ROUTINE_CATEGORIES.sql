-- Add category field to workouts and routines
-- This allows filtering and color-coding by workout type (Hitting, Throwing, Strength & Conditioning)

-- Create an enum type for workout categories
DO $$ BEGIN
  CREATE TYPE workout_category AS ENUM ('hitting', 'throwing', 'strength_conditioning');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add category column to workouts
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS category workout_category DEFAULT 'strength_conditioning';

-- Add category column to routines
ALTER TABLE routines
  ADD COLUMN IF NOT EXISTS category workout_category DEFAULT 'strength_conditioning';

-- Create indexes for better filtering performance
CREATE INDEX IF NOT EXISTS idx_workouts_category ON workouts(category);
CREATE INDEX IF NOT EXISTS idx_routines_category ON routines(category);

-- Example usage:
-- UPDATE workouts SET category = 'hitting' WHERE id = 'some-uuid';
-- SELECT * FROM workouts WHERE category = 'hitting';
-- SELECT * FROM routines WHERE category = 'throwing';

-- Color coding reference:
-- hitting: Could use red/orange tones in calendar
-- throwing: Could use blue tones in calendar
-- strength_conditioning: Could use green/purple tones in calendar
