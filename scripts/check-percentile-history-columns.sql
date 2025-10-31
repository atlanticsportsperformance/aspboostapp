-- Check what columns exist in athlete_percentile_history

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'athlete_percentile_history'
ORDER BY ordinal_position;
