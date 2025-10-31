-- Check PPU percentile history records
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
ORDER BY test_date DESC
LIMIT 20;
