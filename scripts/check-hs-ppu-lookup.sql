-- Check ALL High School PPU lookup data

SELECT
  percentile,
  value,
  total_count
FROM percentile_lookup
WHERE metric_column = 'ppu_peak_takeoff_force_trial_value'
  AND play_level = 'High School'
ORDER BY percentile;

-- Also check how many rows total
SELECT COUNT(*) as total_hs_ppu_rows
FROM percentile_lookup
WHERE metric_column = 'ppu_peak_takeoff_force_trial_value'
  AND play_level = 'High School';

-- Check if there's data for OTHER play levels
SELECT
  play_level,
  COUNT(*) as row_count,
  MIN(value) as min_value,
  MAX(value) as max_value
FROM percentile_lookup
WHERE metric_column = 'ppu_peak_takeoff_force_trial_value'
GROUP BY play_level
ORDER BY play_level;
