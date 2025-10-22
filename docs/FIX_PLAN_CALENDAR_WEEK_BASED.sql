-- ============================================================================
-- FIX: CONVERT PLAN CALENDAR TO WEEK/DAY-BASED STRUCTURE
-- ============================================================================
-- The original plan_calendar was date-based (wrong approach).
-- Training plans should be week/day-based (Week 1 Day 1, Week 2 Day 3, etc.)
-- Dates are only calculated when assigning the plan to an athlete.
--
-- This follows the TrainHeroic/Exercise.com model shown in the reference image.
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop the incorrect plan_calendar table
-- ============================================================================
DROP TABLE IF EXISTS plan_calendar CASCADE;

-- ============================================================================
-- STEP 2: Add program_length_weeks to training_plans
-- ============================================================================
ALTER TABLE training_plans
ADD COLUMN IF NOT EXISTS program_length_weeks INTEGER DEFAULT 4;

COMMENT ON COLUMN training_plans.program_length_weeks IS 'Total length of the program in weeks (e.g., 4 for a 4-week program)';

-- ============================================================================
-- STEP 3: Create program_days table (replaces plan_calendar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS program_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL CHECK (week_number > 0),
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, week_number, day_number, workout_id)
);

-- Add helpful comments
COMMENT ON TABLE program_days IS 'Maps workouts to program structure (Week X, Day Y). No actual dates - those are calculated at assignment time.';
COMMENT ON COLUMN program_days.plan_id IS 'The training plan this day belongs to';
COMMENT ON COLUMN program_days.week_number IS 'Week number in the program (1, 2, 3, ...)';
COMMENT ON COLUMN program_days.day_number IS 'Day number in the week (1=Monday, 2=Tuesday, ..., 7=Sunday)';
COMMENT ON COLUMN program_days.workout_id IS 'The workout assigned to this program day';
COMMENT ON COLUMN program_days.order_index IS 'Order when multiple workouts on same day';

-- ============================================================================
-- STEP 4: Create performance indexes
-- ============================================================================
-- Index for finding all days in a plan
CREATE INDEX IF NOT EXISTS idx_program_days_plan_id ON program_days(plan_id);

-- Index for finding specific week
CREATE INDEX IF NOT EXISTS idx_program_days_week ON program_days(plan_id, week_number);

-- Index for finding specific day
CREATE INDEX IF NOT EXISTS idx_program_days_day ON program_days(plan_id, week_number, day_number);

-- Index for finding all instances of a workout in a program
CREATE INDEX IF NOT EXISTS idx_program_days_workout ON program_days(workout_id) WHERE workout_id IS NOT NULL;

-- ============================================================================
-- STEP 5: Enable Row Level Security
-- ============================================================================
ALTER TABLE program_days ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: Create RLS policies
-- ============================================================================
-- Access controlled via training_plans RLS (staff in same org can access)
CREATE POLICY "Staff can view program days"
  ON program_days
  FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM training_plans
      WHERE organization_id IN (
        SELECT org_id FROM staff WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can create program days"
  ON program_days
  FOR INSERT
  WITH CHECK (
    plan_id IN (
      SELECT id FROM training_plans
      WHERE organization_id IN (
        SELECT org_id FROM staff WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can update program days"
  ON program_days
  FOR UPDATE
  USING (
    plan_id IN (
      SELECT id FROM training_plans
      WHERE organization_id IN (
        SELECT org_id FROM staff WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can delete program days"
  ON program_days
  FOR DELETE
  USING (
    plan_id IN (
      SELECT id FROM training_plans
      WHERE organization_id IN (
        SELECT org_id FROM staff WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- STEP 7: Create helper function to get total workouts in a plan
-- ============================================================================
CREATE OR REPLACE FUNCTION get_plan_workouts_count(plan_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM program_days
    WHERE plan_id = plan_uuid AND workout_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STEP 8: Create helper function to initialize program structure
-- ============================================================================
-- This function creates all the day slots for a program when it's created
CREATE OR REPLACE FUNCTION initialize_program_structure(
  p_plan_id UUID,
  p_weeks INTEGER DEFAULT 4
)
RETURNS VOID AS $$
DECLARE
  week_num INTEGER;
  day_num INTEGER;
BEGIN
  -- Create empty slots for each week and day
  FOR week_num IN 1..p_weeks LOOP
    FOR day_num IN 1..7 LOOP
      INSERT INTO program_days (plan_id, week_number, day_number, workout_id)
      VALUES (p_plan_id, week_num, day_num, NULL)
      ON CONFLICT (plan_id, week_number, day_number, workout_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERIES (run these to confirm migration success)
-- ============================================================================

-- Check that program_days table exists with correct columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'program_days';

-- Check that indexes were created
-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE tablename = 'program_days';

-- Check that RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'program_days';

-- Test creating a 4-week program structure (replace YOUR_PLAN_ID)
-- SELECT initialize_program_structure('YOUR_PLAN_ID', 4);

-- Verify structure was created
-- SELECT week_number, day_number, workout_id IS NOT NULL as has_workout
-- FROM program_days
-- WHERE plan_id = 'YOUR_PLAN_ID'
-- ORDER BY week_number, day_number;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Update training_plans to set program_length_weeks for existing plans
-- 2. Update plan calendar UI to show Week/Day structure
-- 3. Remove date-based logic from frontend
-- 4. Build "Assign to Athlete" with START DATE picker
-- ============================================================================
