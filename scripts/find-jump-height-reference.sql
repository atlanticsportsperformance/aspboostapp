-- Find all functions that reference jump_height

-- List all custom functions
SELECT proname as function_name
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check if there's a jump_height column in athlete_percentile_contributions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'athlete_percentile_contributions'
ORDER BY ordinal_position;
