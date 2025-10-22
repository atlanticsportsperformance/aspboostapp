-- ============================================================================
-- INITIALIZE PROGRAM STRUCTURE FOR EXISTING PLANS
-- ============================================================================
-- Run this ONCE after migrating to the week/day-based structure.
-- This creates the program_days slots for any training_plans that already exist.
-- ============================================================================

-- Option 1: Initialize ALL existing plans at once (recommended)
-- This will create program_days for all plans based on their program_length_weeks
DO $$
DECLARE
  plan_record RECORD;
BEGIN
  FOR plan_record IN
    SELECT id, program_length_weeks
    FROM training_plans
    WHERE program_length_weeks > 0
  LOOP
    PERFORM initialize_program_structure(plan_record.id, plan_record.program_length_weeks);
    RAISE NOTICE 'Initialized plan % with % weeks', plan_record.id, plan_record.program_length_weeks;
  END LOOP;
END $$;

-- ============================================================================
-- Option 2: Initialize a specific plan manually
-- ============================================================================
-- Replace 'YOUR_PLAN_ID' with the actual plan ID
-- SELECT initialize_program_structure('YOUR_PLAN_ID', 4);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check that program_days were created for all plans
SELECT
  tp.id as plan_id,
  tp.name as plan_name,
  tp.program_length_weeks,
  COUNT(pd.id) as day_slots_created,
  tp.program_length_weeks * 7 as expected_slots
FROM training_plans tp
LEFT JOIN program_days pd ON pd.plan_id = tp.id
GROUP BY tp.id, tp.name, tp.program_length_weeks
ORDER BY tp.created_at DESC;

-- Expected: day_slots_created should equal expected_slots for each plan
-- If they don't match, run Option 1 again or use Option 2 for specific plans

-- ============================================================================
-- CLEANUP (if you need to reset)
-- ============================================================================
-- DANGER: This deletes ALL program_days. Only use if you need to start over.
-- DELETE FROM program_days;
-- Then run Option 1 again to reinitialize
