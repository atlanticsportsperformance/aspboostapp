-- Check PPU percentile data and why it's showing 0

-- 1. Check if PPU percentile lookup data exists
SELECT
  metric_column,
  play_level,
  COUNT(*) as row_count,
  MIN(percentile) as min_percentile,
  MAX(percentile) as max_percentile,
  MIN(value) as min_value,
  MAX(value) as max_value
FROM percentile_lookup
WHERE metric_column LIKE '%ppu%' OR metric_column LIKE '%peak_takeoff_force%'
GROUP BY metric_column, play_level
ORDER BY metric_column, play_level;

-- 2. Check recent PPU tests
SELECT
  athlete_id,
  test_id,
  recorded_utc,
  peak_takeoff_force_trial_value
FROM ppu_tests
ORDER BY recorded_utc DESC
LIMIT 5;

-- 3. Check recent PPU percentile history showing 0
SELECT
  athlete_id,
  test_id,
  test_date,
  play_level,
  metric_name,
  value,
  percentile_play_level,
  percentile_overall
FROM athlete_percentile_history
WHERE test_type = 'PPU'
ORDER BY test_date DESC, metric_name
LIMIT 10;

-- 4. Sample PPU lookup data for High School (if exists)
SELECT *
FROM percentile_lookup
WHERE metric_column = 'ppu_peak_takeoff_force_trial_value'
  AND play_level = 'High School'
ORDER BY percentile
LIMIT 20;
