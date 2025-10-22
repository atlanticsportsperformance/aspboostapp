-- ============================================================================
-- CREATE TRAINING PLANS AND PLAN CALENDAR TABLES
-- ============================================================================
-- This migration creates the foundational tables needed for the plan calendar
-- builder. These tables must be created BEFORE running ADD_OWNERSHIP_CONTEXTS.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Create training_plans table
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add helpful comments
COMMENT ON TABLE training_plans IS 'Training plans created by coaches. Workouts can belong to a plan via workouts.plan_id';
COMMENT ON COLUMN training_plans.organization_id IS 'The organization this plan belongs to';
COMMENT ON COLUMN training_plans.name IS 'Display name for the training plan (e.g., "Summer Training 2025")';
COMMENT ON COLUMN training_plans.description IS 'Optional description of the plan''s purpose and goals';
COMMENT ON COLUMN training_plans.start_date IS 'Optional start date for the plan (informational only)';
COMMENT ON COLUMN training_plans.end_date IS 'Optional end date for the plan (informational only)';

-- ============================================================================
-- STEP 2: Create plan_calendar table (workout scheduling)
-- ============================================================================
CREATE TABLE IF NOT EXISTS plan_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, workout_id, date)
);

-- Add helpful comments
COMMENT ON TABLE plan_calendar IS 'Maps workouts to specific dates within a training plan';
COMMENT ON COLUMN plan_calendar.plan_id IS 'The training plan this scheduled workout belongs to';
COMMENT ON COLUMN plan_calendar.workout_id IS 'The workout scheduled for this date';
COMMENT ON COLUMN plan_calendar.date IS 'The date this workout is scheduled';
COMMENT ON COLUMN plan_calendar.order_index IS 'Optional ordering when multiple workouts on same day';

-- ============================================================================
-- STEP 3: Create performance indexes
-- ============================================================================
-- Index for finding all calendar entries for a plan
CREATE INDEX IF NOT EXISTS idx_plan_calendar_plan_id ON plan_calendar(plan_id);

-- Index for finding workouts scheduled on a specific date range
CREATE INDEX IF NOT EXISTS idx_plan_calendar_plan_date ON plan_calendar(plan_id, date);

-- Index for finding all scheduled instances of a workout
CREATE INDEX IF NOT EXISTS idx_plan_calendar_workout_id ON plan_calendar(workout_id);

-- Index for finding all plans in an organization
CREATE INDEX IF NOT EXISTS idx_training_plans_org ON training_plans(organization_id);

-- ============================================================================
-- STEP 4: Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_calendar ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS policies
-- ============================================================================

-- Training Plans - Staff can only see/edit plans in their organization
-- Note: Gets organization from staff table (coaches/admins can manage plans)
CREATE POLICY "Staff can view plans in their organization"
  ON training_plans
  FOR SELECT
  USING (
    organization_id IN (
      SELECT org_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can create plans in their organization"
  ON training_plans
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT org_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update plans in their organization"
  ON training_plans
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT org_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can delete plans in their organization"
  ON training_plans
  FOR DELETE
  USING (
    organization_id IN (
      SELECT org_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Plan Calendar - Access controlled via training_plans RLS
CREATE POLICY "Staff can view plan calendar entries"
  ON plan_calendar
  FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM training_plans
      WHERE organization_id IN (
        SELECT org_id FROM staff WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can create plan calendar entries"
  ON plan_calendar
  FOR INSERT
  WITH CHECK (
    plan_id IN (
      SELECT id FROM training_plans
      WHERE organization_id IN (
        SELECT org_id FROM staff WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can update plan calendar entries"
  ON plan_calendar
  FOR UPDATE
  USING (
    plan_id IN (
      SELECT id FROM training_plans
      WHERE organization_id IN (
        SELECT org_id FROM staff WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can delete plan calendar entries"
  ON plan_calendar
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
-- STEP 6: Create helper function to get plan workouts count
-- ============================================================================
CREATE OR REPLACE FUNCTION get_plan_workouts_count(plan_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT workout_id)
    FROM plan_calendar
    WHERE plan_id = plan_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- VERIFICATION QUERIES (run these to confirm migration success)
-- ============================================================================

-- Check that training_plans table exists with correct columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'training_plans';

-- Check that plan_calendar table exists with correct columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'plan_calendar';

-- Check that indexes were created
-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE tablename IN ('training_plans', 'plan_calendar');

-- Check that RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('training_plans', 'plan_calendar');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next step: Run ADD_OWNERSHIP_CONTEXTS.sql to add ownership columns to
-- workouts and routines tables
-- ============================================================================
