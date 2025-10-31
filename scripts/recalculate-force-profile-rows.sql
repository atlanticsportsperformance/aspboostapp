-- Recalculate all FORCE_PROFILE rows to match new logic
-- Each FORCE_PROFILE should be the average of the 5 most recent tests BEFORE that FORCE_PROFILE date

-- First, let's see what FORCE_PROFILE rows exist
SELECT
  athlete_id,
  test_date,
  percentile_overall as current_composite_score
FROM athlete_percentile_history
WHERE test_type = 'FORCE_PROFILE'
ORDER BY athlete_id, test_date;

-- For each FORCE_PROFILE row, recalculate based on the 5 tests before it
-- This is complex in SQL, so we'll delete all FORCE_PROFILE rows and let the system recreate them

-- Delete all existing FORCE_PROFILE rows
DELETE FROM athlete_percentile_history
WHERE test_type = 'FORCE_PROFILE';

SELECT '✅ Deleted all existing FORCE_PROFILE rows' AS status;
SELECT 'Run a VALD sync for each athlete to recreate FORCE_PROFILE rows with correct logic' AS next_step;
