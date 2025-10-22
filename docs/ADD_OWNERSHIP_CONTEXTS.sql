-- ============================================================================
-- CELL 4.4: OWNERSHIP CONTEXTS + COMPLETE PLACEHOLDER SYSTEM
-- ============================================================================
-- This migration adds ownership context tracking to workouts and routines,
-- enabling three distinct ownership worlds:
-- 1. Template Library (plan_id=null, athlete_id=null) - Global templates
-- 2. Plan-Owned (plan_id!=null, athlete_id=null) - Coach's training plans
-- 3. Athlete-Owned (athlete_id!=null) - Individual athlete workouts
--
-- CRITICAL: Changes flow DOWN the hierarchy via copying (Template → Plan → Athlete)
-- Each copy is 100% independent. Changes NEVER flow upward.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add ownership columns to workouts table
-- ============================================================================
ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS source_workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL;

-- Add helpful comments
COMMENT ON COLUMN workouts.plan_id IS 'If set, this workout belongs to a specific training plan (Plan-Owned context)';
COMMENT ON COLUMN workouts.athlete_id IS 'If set, this workout belongs to a specific athlete (Athlete-Owned context)';
COMMENT ON COLUMN workouts.source_workout_id IS 'The template or plan workout this was copied from (tracks lineage)';

-- ============================================================================
-- STEP 2: Add ownership columns to routines table
-- ============================================================================
ALTER TABLE routines
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS source_routine_id UUID REFERENCES routines(id) ON DELETE SET NULL;

-- Add helpful comments
COMMENT ON COLUMN routines.plan_id IS 'If set, this routine belongs to a specific training plan (Plan-Owned context)';
COMMENT ON COLUMN routines.athlete_id IS 'If set, this routine belongs to a specific athlete (Athlete-Owned context)';
COMMENT ON COLUMN routines.source_routine_id IS 'The template or plan routine this was copied from (tracks lineage)';

-- ============================================================================
-- STEP 3: Add placeholder_name to routine_exercises (for display purposes)
-- ============================================================================
ALTER TABLE routine_exercises
ADD COLUMN IF NOT EXISTS placeholder_name TEXT;

-- Add helpful comment
COMMENT ON COLUMN routine_exercises.placeholder_name IS 'Display name for placeholder exercises (denormalized from routine.placeholder_definitions for performance)';

-- ============================================================================
-- STEP 4: Add ownership constraints (data integrity rules)
-- ============================================================================
-- Constraint: Workouts cannot be both plan-owned AND athlete-owned
ALTER TABLE workouts
DROP CONSTRAINT IF EXISTS workouts_ownership_check;

ALTER TABLE workouts
ADD CONSTRAINT workouts_ownership_check CHECK (
  NOT (plan_id IS NOT NULL AND athlete_id IS NOT NULL)
);

-- Constraint: Routines cannot be both plan-owned AND athlete-owned
ALTER TABLE routines
DROP CONSTRAINT IF EXISTS routines_ownership_check;

ALTER TABLE routines
ADD CONSTRAINT routines_ownership_check CHECK (
  NOT (plan_id IS NOT NULL AND athlete_id IS NOT NULL)
);

-- ============================================================================
-- STEP 5: Add performance indexes
-- ============================================================================
-- Index for finding all workouts in a plan
CREATE INDEX IF NOT EXISTS idx_workouts_plan_id ON workouts(plan_id) WHERE plan_id IS NOT NULL;

-- Index for finding all workouts for an athlete
CREATE INDEX IF NOT EXISTS idx_workouts_athlete_id ON workouts(athlete_id) WHERE athlete_id IS NOT NULL;

-- NOTE: Template workouts index commented out - workouts table doesn't have organization_id column
-- This will be handled by RLS policies instead
-- CREATE INDEX IF NOT EXISTS idx_workouts_templates ON workouts(organization_id) WHERE plan_id IS NULL AND athlete_id IS NULL;

-- Index for finding all routines in a plan
CREATE INDEX IF NOT EXISTS idx_routines_plan_id ON routines(plan_id) WHERE plan_id IS NOT NULL;

-- Index for finding all routines for an athlete
CREATE INDEX IF NOT EXISTS idx_routines_athlete_id ON routines(athlete_id) WHERE athlete_id IS NOT NULL;

-- NOTE: Template routines index commented out - routines table doesn't have organization_id column
-- This will be handled by RLS policies instead
-- CREATE INDEX IF NOT EXISTS idx_routines_templates ON routines(organization_id) WHERE plan_id IS NULL AND athlete_id IS NULL;

-- Index for routine lineage tracking
CREATE INDEX IF NOT EXISTS idx_routines_source ON routines(source_routine_id) WHERE source_routine_id IS NOT NULL;

-- Index for workout lineage tracking
CREATE INDEX IF NOT EXISTS idx_workouts_source ON workouts(source_workout_id) WHERE source_workout_id IS NOT NULL;

-- ============================================================================
-- STEP 6: Update existing data to Template Library context
-- ============================================================================
-- All existing workouts and routines should be templates (no plan_id, no athlete_id)
-- This is already the case since we just added these columns as NULL
-- But we'll make it explicit:

UPDATE workouts
SET plan_id = NULL, athlete_id = NULL, source_workout_id = NULL
WHERE plan_id IS NOT NULL OR athlete_id IS NOT NULL OR source_workout_id IS NOT NULL;

UPDATE routines
SET plan_id = NULL, athlete_id = NULL, source_routine_id = NULL
WHERE plan_id IS NOT NULL OR athlete_id IS NOT NULL OR source_routine_id IS NOT NULL;

-- ============================================================================
-- STEP 7: Add helper function to determine ownership context
-- ============================================================================
CREATE OR REPLACE FUNCTION get_workout_context(workout_row workouts)
RETURNS TEXT AS $$
BEGIN
  IF workout_row.athlete_id IS NOT NULL THEN
    RETURN 'athlete';
  ELSIF workout_row.plan_id IS NOT NULL THEN
    RETURN 'plan';
  ELSE
    RETURN 'template';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_routine_context(routine_row routines)
RETURNS TEXT AS $$
BEGIN
  IF routine_row.athlete_id IS NOT NULL THEN
    RETURN 'athlete';
  ELSIF routine_row.plan_id IS NOT NULL THEN
    RETURN 'plan';
  ELSE
    RETURN 'template';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- VERIFICATION QUERIES (run these to confirm migration success)
-- ============================================================================

-- Check that all existing workouts are in template context
-- SELECT COUNT(*) as template_workouts
-- FROM workouts
-- WHERE plan_id IS NULL AND athlete_id IS NULL;

-- Check that no workouts violate ownership constraint
-- SELECT COUNT(*) as invalid_workouts
-- FROM workouts
-- WHERE plan_id IS NOT NULL AND athlete_id IS NOT NULL;
-- Expected: 0

-- Check that no routines violate ownership constraint
-- SELECT COUNT(*) as invalid_routines
-- FROM routines
-- WHERE plan_id IS NOT NULL AND athlete_id IS NOT NULL;
-- Expected: 0

-- Check indexes were created
-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE tablename IN ('workouts', 'routines')
-- AND indexname LIKE 'idx_%ownership%' OR indexname LIKE 'idx_%plan%' OR indexname LIKE 'idx_%athlete%' OR indexname LIKE 'idx_%templates%' OR indexname LIKE 'idx_%source%';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Update workout builder UI to show context badges
-- 2. Update routine builder UI to show context badges
-- 3. Build plan calendar builder
-- 4. Build workout detail modal
-- 5. Add placeholder resolution to athlete calendar
-- 6. Build plan assignment functionality
-- ============================================================================
