-- ============================================================================
-- VERIFY PERCENTILE CONTRIBUTIONS SYSTEM
-- ============================================================================

-- 1. Check if triggers exist on test tables
SELECT
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation as event_type
FROM information_schema.triggers
WHERE trigger_name LIKE '%contribution%'
ORDER BY event_object_table;

-- 2. Check current contributions
SELECT
  athlete_id,
  test_type,
  playing_level,
  test_date,
  contributed_at,
  -- Show which metrics are populated
  CASE WHEN peak_takeoff_power_trial_value IS NOT NULL THEN 'Peak Power (CMJ)' END as cmj_peak_power,
  CASE WHEN bodymass_relative_takeoff_power_trial_value IS NOT NULL THEN 'Peak Power/BM (CMJ)' END as cmj_rel_power,
  CASE WHEN sj_peak_takeoff_power_trial_value IS NOT NULL THEN 'Peak Power (SJ)' END as sj_peak_power,
  CASE WHEN sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL THEN 'Peak Power/BM (SJ)' END as sj_rel_power,
  CASE WHEN net_peak_vertical_force_trial_value IS NOT NULL THEN 'Net Peak Force (IMTP)' END as imtp_force,
  CASE WHEN relative_strength_trial_value IS NOT NULL THEN 'Relative Strength (IMTP)' END as imtp_rel_str,
  CASE WHEN hop_mean_rsi_trial_value IS NOT NULL THEN 'RSI (HJ)' END as hj_rsi,
  CASE WHEN ppu_peak_takeoff_force_trial_value IS NOT NULL THEN 'Peak Force (PPU)' END as ppu_force
FROM athlete_percentile_contributions
ORDER BY contributed_at DESC;

-- 3. For each athlete, show test counts vs contributions
WITH athlete_test_counts AS (
  SELECT
    a.id as athlete_id,
    a.first_name,
    a.last_name,
    a.play_level,
    (SELECT COUNT(*) FROM cmj_tests WHERE athlete_id = a.id) as cmj_count,
    (SELECT COUNT(*) FROM sj_tests WHERE athlete_id = a.id) as sj_count,
    (SELECT COUNT(*) FROM hj_tests WHERE athlete_id = a.id) as hj_count,
    (SELECT COUNT(*) FROM ppu_tests WHERE athlete_id = a.id) as ppu_count,
    (SELECT COUNT(*) FROM imtp_tests WHERE athlete_id = a.id) as imtp_count
  FROM athletes a
  WHERE a.play_level IS NOT NULL
),
athlete_contributions AS (
  SELECT
    athlete_id,
    COUNT(*) FILTER (WHERE test_type = 'CMJ') as cmj_contributed,
    COUNT(*) FILTER (WHERE test_type = 'SJ') as sj_contributed,
    COUNT(*) FILTER (WHERE test_type = 'HJ') as hj_contributed,
    COUNT(*) FILTER (WHERE test_type = 'PPU') as ppu_contributed,
    COUNT(*) FILTER (WHERE test_type = 'IMTP') as imtp_contributed
  FROM athlete_percentile_contributions
  GROUP BY athlete_id
)
SELECT
  tc.athlete_id,
  tc.first_name,
  tc.last_name,
  tc.play_level,
  -- CMJ
  tc.cmj_count as cmj_tests,
  COALESCE(ac.cmj_contributed, 0) as cmj_contrib,
  CASE
    WHEN tc.cmj_count >= 2 AND COALESCE(ac.cmj_contributed, 0) = 0 THEN '❌ MISSING'
    WHEN tc.cmj_count >= 2 AND COALESCE(ac.cmj_contributed, 0) > 0 THEN '✅ OK'
    WHEN tc.cmj_count = 1 AND COALESCE(ac.cmj_contributed, 0) = 0 THEN '✅ OK (1st test)'
    ELSE '⚠️  CHECK'
  END as cmj_status,
  -- SJ
  tc.sj_count as sj_tests,
  COALESCE(ac.sj_contributed, 0) as sj_contrib,
  CASE
    WHEN tc.sj_count >= 2 AND COALESCE(ac.sj_contributed, 0) = 0 THEN '❌ MISSING'
    WHEN tc.sj_count >= 2 AND COALESCE(ac.sj_contributed, 0) > 0 THEN '✅ OK'
    WHEN tc.sj_count = 1 AND COALESCE(ac.sj_contributed, 0) = 0 THEN '✅ OK (1st test)'
    ELSE '⚠️  CHECK'
  END as sj_status,
  -- HJ
  tc.hj_count as hj_tests,
  COALESCE(ac.hj_contributed, 0) as hj_contrib,
  CASE
    WHEN tc.hj_count >= 2 AND COALESCE(ac.hj_contributed, 0) = 0 THEN '❌ MISSING'
    WHEN tc.hj_count >= 2 AND COALESCE(ac.hj_contributed, 0) > 0 THEN '✅ OK'
    WHEN tc.hj_count = 1 AND COALESCE(ac.hj_contributed, 0) = 0 THEN '✅ OK (1st test)'
    ELSE '⚠️  CHECK'
  END as hj_status,
  -- PPU
  tc.ppu_count as ppu_tests,
  COALESCE(ac.ppu_contributed, 0) as ppu_contrib,
  CASE
    WHEN tc.ppu_count >= 2 AND COALESCE(ac.ppu_contributed, 0) = 0 THEN '❌ MISSING'
    WHEN tc.ppu_count >= 2 AND COALESCE(ac.ppu_contributed, 0) > 0 THEN '✅ OK'
    WHEN tc.ppu_count = 1 AND COALESCE(ac.ppu_contributed, 0) = 0 THEN '✅ OK (1st test)'
    ELSE '⚠️  CHECK'
  END as ppu_status,
  -- IMTP
  tc.imtp_count as imtp_tests,
  COALESCE(ac.imtp_contributed, 0) as imtp_contrib,
  CASE
    WHEN tc.imtp_count >= 2 AND COALESCE(ac.imtp_contributed, 0) = 0 THEN '❌ MISSING'
    WHEN tc.imtp_count >= 2 AND COALESCE(ac.imtp_contributed, 0) > 0 THEN '✅ OK'
    WHEN tc.imtp_count = 1 AND COALESCE(ac.imtp_contributed, 0) = 0 THEN '✅ OK (1st test)'
    ELSE '⚠️  CHECK'
  END as imtp_status
FROM athlete_test_counts tc
LEFT JOIN athlete_contributions ac ON tc.athlete_id = ac.athlete_id
ORDER BY tc.last_name, tc.first_name;

-- ============================================================================
