-- DIAGNOSTIC ONLY - DO NOT MODIFY ANYTHING
-- This script checks the current state of the add_to_percentile_contributions function

-- 1. Check if the function exists
SELECT
  proname AS function_name,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'add_to_percentile_contributions';

-- 2. Check what columns actually exist in athlete_percentile_contributions table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'athlete_percentile_contributions'
ORDER BY ordinal_position;

-- 3. Check if there are any recent errors in the logs (if accessible)
SELECT '✅ Diagnostic complete - review the function definition and table columns above' AS status;
