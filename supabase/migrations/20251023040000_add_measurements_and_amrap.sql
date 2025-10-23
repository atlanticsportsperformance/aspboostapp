-- Add enabled_measurements and AMRAP support to routine_exercises

-- Add enabled_measurements column (NULL = use all from metric_schema)
ALTER TABLE routine_exercises
ADD COLUMN IF NOT EXISTS enabled_measurements TEXT[] DEFAULT NULL;

-- Add is_amrap column (true = all sets are AMRAP)
ALTER TABLE routine_exercises
ADD COLUMN IF NOT EXISTS is_amrap BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN routine_exercises.enabled_measurements IS
'Array of measurement IDs enabled for this specific exercise instance. NULL means show all measurements from the exercise metric_schema. Allows per-instance customization of which metrics to track.';

COMMENT ON COLUMN routine_exercises.is_amrap IS
'When true, all sets are AMRAP (As Many Reps As Possible). Can also be configured per-set in set_configurations.';

-- Note: set_configurations already supports per-set AMRAP via:
-- set_configurations: [
--   { set_number: 1, is_amrap: true, reps: null, ... },
--   { set_number: 2, is_amrap: false, reps: 10, ... }
-- ]

-- Create index for querying AMRAP exercises
CREATE INDEX IF NOT EXISTS idx_routine_exercises_amrap
ON routine_exercises(is_amrap)
WHERE is_amrap = true;
