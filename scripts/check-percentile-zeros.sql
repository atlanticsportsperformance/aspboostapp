-- Check how many percentile history records have 0 values

-- 1. Count by test type and play level
SELECT
  test_type,
  play_level,
  COUNT(*) as total_records,
  COUNT(CASE WHEN percentile_play_level = 0 THEN 1 END) as zero_play_level,
  COUNT(CASE WHEN percentile_overall = 0 THEN 1 END) as zero_overall,
  AVG(percentile_play_level)::numeric(10,1) as avg_play_level,
  AVG(percentile_overall)::numeric(10,1) as avg_overall
FROM athlete_percentile_history
GROUP BY test_type, play_level
ORDER BY test_type, play_level;

-- 2. Show specific PPU records with 0
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
  AND percentile_play_level = 0
ORDER BY test_date DESC
LIMIT 10;
