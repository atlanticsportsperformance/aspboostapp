-- Simple UPDATE to recalculate percentiles for PPU High School records
-- This is a test to see if it works before doing all records

-- First, let's see what lookup data exists for High School PPU
SELECT 'High School PPU Lookup Data:' as info;
SELECT percentile, value
FROM percentile_lookup
WHERE metric_column = 'ppu_peak_takeoff_force_trial_value'
  AND play_level = 'High School'
ORDER BY percentile
LIMIT 20;

-- Now update ONE specific record as a test
-- Record: value = 1108.78385899814, currently shows percentile_play_level = 0
UPDATE athlete_percentile_history
SET percentile_play_level = (
  SELECT percentile
  FROM percentile_lookup
  WHERE metric_column = 'ppu_peak_takeoff_force_trial_value'
    AND play_level = 'High School'
    AND value <= 1108.78385899814
  ORDER BY value DESC
  LIMIT 1
)
WHERE test_id = 'd9a5b0ba-3c6d-486b-982e-e20314c754f1'
  AND metric_name = 'Peak Takeoff Force (N)';

-- Check if it updated
SELECT 'After Update:' as info;
SELECT
  athlete_id,
  test_id,
  value,
  percentile_play_level,
  percentile_overall
FROM athlete_percentile_history
WHERE test_id = 'd9a5b0ba-3c6d-486b-982e-e20314c754f1'
  AND metric_name = 'Peak Takeoff Force (N)';
