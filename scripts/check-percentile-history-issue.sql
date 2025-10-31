-- Check what's wrong with athlete_percentile_history

-- 1. Check a specific athlete's PPU history showing 0
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
WHERE athlete_id = 'afd08fd6-4a49-4b7f-ba23-d90962831f50'
  AND test_type = 'PPU'
ORDER BY test_date DESC;

-- 2. Check what PPU lookup data exists for their play level (High School)
SELECT
  metric_column,
  play_level,
  COUNT(*) as row_count,
  MIN(value) as min_value,
  MAX(value) as max_value,
  MIN(percentile) as min_percentile,
  MAX(percentile) as max_percentile
FROM percentile_lookup
WHERE metric_column = 'ppu_peak_takeoff_force_trial_value'
  AND play_level = 'High School'
GROUP BY metric_column, play_level;

-- 3. Show the actual lookup values for High School PPU
SELECT percentile, value
FROM percentile_lookup
WHERE metric_column = 'ppu_peak_takeoff_force_trial_value'
  AND play_level = 'High School'
ORDER BY percentile
LIMIT 20;

-- 4. Check the actual PPU test value
SELECT
  athlete_id,
  test_id,
  recorded_utc,
  peak_takeoff_force_trial_value
FROM ppu_tests
WHERE athlete_id = 'afd08fd6-4a49-4b7f-ba23-d90962831f50'
ORDER BY recorded_utc DESC
LIMIT 1;
