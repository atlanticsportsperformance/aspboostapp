-- Check recent PPU tests
SELECT
  athlete_id,
  test_id,
  recorded_utc,
  peak_takeoff_force_trial_value
FROM ppu_tests
ORDER BY recorded_utc DESC
LIMIT 10;
