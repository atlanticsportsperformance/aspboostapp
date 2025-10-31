-- Check if athlete_percentile_history has any data at all

SELECT COUNT(*) as total_records
FROM athlete_percentile_history;

-- Show a few sample rows
SELECT *
FROM athlete_percentile_history
LIMIT 10;
