-- Check percentile lookup coverage for ALL metrics and play levels

SELECT
  metric_column,
  play_level,
  COUNT(*) as row_count,
  MIN(percentile) as min_percentile,
  MAX(percentile) as max_percentile,
  MIN(value) as min_value,
  MAX(value) as max_value
FROM percentile_lookup
GROUP BY metric_column, play_level
ORDER BY metric_column, play_level;

-- Summary: Total rows
SELECT
  'Total percentile_lookup rows:' as info,
  COUNT(*) as total_rows
FROM percentile_lookup;
