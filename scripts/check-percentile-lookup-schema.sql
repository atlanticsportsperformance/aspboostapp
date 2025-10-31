-- Check the actual structure of percentile_lookup table

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'percentile_lookup'
ORDER BY ordinal_position;

-- Show a few sample rows
SELECT *
FROM percentile_lookup
LIMIT 10;
