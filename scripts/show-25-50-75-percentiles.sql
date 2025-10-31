/**
 * SHOW 25TH, 50TH, AND 75TH PERCENTILES
 *
 * This shows the key benchmark values for each metric at each play level.
 * These are the thresholds athletes need to hit to reach these percentiles.
 */

-- Get the 25th, 50th, and 75th percentile values for all metrics
SELECT
  play_level,
  metric_column,
  MAX(CASE WHEN percentile = 25 THEN value END) as percentile_25th,
  MAX(CASE WHEN percentile = 50 THEN value END) as percentile_50th,
  MAX(CASE WHEN percentile = 75 THEN value END) as percentile_75th,
  MAX(total_count) as sample_size
FROM percentile_lookup
WHERE percentile IN (25, 50, 75)
GROUP BY play_level, metric_column
ORDER BY
  CASE play_level
    WHEN 'Youth' THEN 1
    WHEN 'High School' THEN 2
    WHEN 'College' THEN 3
    WHEN 'Pro' THEN 4
    WHEN 'Overall' THEN 5
  END,
  metric_column;
