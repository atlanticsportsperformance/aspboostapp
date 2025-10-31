-- Diagnose what happened to percentile_lookup

-- 1. Check total rows in percentile_lookup
SELECT
  'Total percentile_lookup rows:' as info,
  COUNT(*) as total_rows
FROM percentile_lookup;

-- 2. Check rows by metric
SELECT
  metric_column,
  COUNT(*) as total_rows,
  COUNT(DISTINCT play_level) as play_levels
FROM percentile_lookup
GROUP BY metric_column
ORDER BY metric_column;

-- 3. Check if driveline_seed_data exists and has data
SELECT
  'Driveline seed data rows:' as info,
  COUNT(*) as total_rows
FROM driveline_seed_data;

-- 4. Check if driveline has High School PPU data
SELECT
  playing_level,
  COUNT(*) as row_count,
  COUNT(CASE WHEN ppu_peak_takeoff_force_trial_value IS NOT NULL THEN 1 END) as has_ppu
FROM driveline_seed_data
GROUP BY playing_level
ORDER BY playing_level;

-- 5. Check when percentile_lookup was last calculated
SELECT
  metric_column,
  play_level,
  MAX(calculated_at) as last_calculated
FROM percentile_lookup
GROUP BY metric_column, play_level
ORDER BY metric_column, play_level
LIMIT 20;
