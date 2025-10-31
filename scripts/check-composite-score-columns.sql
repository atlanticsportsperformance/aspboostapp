-- Check what composite score columns exist

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'athlete_percentile_history'
  AND column_name LIKE '%composite%';

-- Check if there are any non-null composite scores
SELECT
  COUNT(*) as total_rows,
  COUNT(CASE WHEN composite_score_level IS NOT NULL THEN 1 END) as has_composite_level,
  COUNT(CASE WHEN composite_score_overall IS NOT NULL THEN 1 END) as has_composite_overall
FROM athlete_percentile_history;
