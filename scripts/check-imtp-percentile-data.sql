-- Check if IMTP percentile lookup data exists

-- 1. Check what test types exist in percentile_lookup
SELECT test_type, play_level, COUNT(*) as row_count
FROM percentile_lookup
GROUP BY test_type, play_level
ORDER BY test_type, play_level;

-- 2. Check specifically for IMTP data
SELECT
  test_type,
  play_level,
  metric_name,
  COUNT(*) as data_points,
  MIN(percentile) as min_percentile,
  MAX(percentile) as max_percentile
FROM percentile_lookup
WHERE test_type = 'IMTP'
GROUP BY test_type, play_level, metric_name
ORDER BY play_level, metric_name;

-- 3. Check for PPU data (since it's showing 0th percentile)
SELECT
  test_type,
  play_level,
  metric_name,
  COUNT(*) as data_points,
  MIN(percentile) as min_percentile,
  MAX(percentile) as max_percentile
FROM percentile_lookup
WHERE test_type = 'PPU'
GROUP BY test_type, play_level, metric_name
ORDER BY play_level, metric_name;

-- 4. Sample IMTP percentile data (if any exists)
SELECT *
FROM percentile_lookup
WHERE test_type = 'IMTP'
  AND play_level = 'High School'
  AND metric_name LIKE '%force%'
LIMIT 10;
