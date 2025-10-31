-- Check the exact lookup for value 1108.78385899814

-- 1. Find all High School PPU lookup values near 1108.78
SELECT
  percentile,
  value,
  total_count
FROM percentile_lookup
WHERE metric_column = 'ppu_peak_takeoff_force_trial_value'
  AND play_level = 'High School'
  AND value BETWEEN 1000 AND 1200
ORDER BY value;

-- 2. Find what percentile SHOULD be returned for 1108.78
-- (This mimics what getTestPercentile() does)
SELECT
  percentile,
  value
FROM percentile_lookup
WHERE metric_column = 'ppu_peak_takeoff_force_trial_value'
  AND play_level = 'High School'
  AND value <= 1108.78385899814
ORDER BY value DESC
LIMIT 1;

-- 3. Check ALL High School PPU lookup data
SELECT
  percentile,
  value,
  total_count
FROM percentile_lookup
WHERE metric_column = 'ppu_peak_takeoff_force_trial_value'
  AND play_level = 'High School'
ORDER BY percentile;
