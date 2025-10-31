-- Check if Driveline seed data has PPU values

SELECT
  playing_level,
  COUNT(*) as row_count,
  MIN(ppu_peak_takeoff_force_trial_value) as min_value,
  MAX(ppu_peak_takeoff_force_trial_value) as max_value,
  AVG(ppu_peak_takeoff_force_trial_value) as avg_value
FROM driveline_seed_data
WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL
GROUP BY playing_level
ORDER BY playing_level;

-- Sample some High School PPU values
SELECT ppu_peak_takeoff_force_trial_value
FROM driveline_seed_data
WHERE playing_level = 'High School'
  AND ppu_peak_takeoff_force_trial_value IS NOT NULL
LIMIT 20;
