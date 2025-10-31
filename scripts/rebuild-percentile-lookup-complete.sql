-- =====================================================
-- COMPLETE PERCENTILE LOOKUP REBUILD
-- Combines driveline_seed_data + athlete_percentile_contributions
-- Generates percentiles for all 8 metrics across all play levels + Overall
-- =====================================================

BEGIN;

-- Clear existing data
TRUNCATE TABLE percentile_lookup;

-- Create a temporary table to hold all combined data
CREATE TEMP TABLE combined_percentile_data AS
WITH all_metrics AS (
  -- Get all metrics from driveline_seed_data
  SELECT
    playing_level as play_level,
    'peak_takeoff_power_trial_value' as metric_column,
    peak_takeoff_power_trial_value as value
  FROM driveline_seed_data
  WHERE peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'bodymass_relative_takeoff_power_trial_value',
    bodymass_relative_takeoff_power_trial_value
  FROM driveline_seed_data
  WHERE bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'sj_peak_takeoff_power_trial_value',
    sj_peak_takeoff_power_trial_value
  FROM driveline_seed_data
  WHERE sj_peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'sj_bodymass_relative_takeoff_power_trial_value',
    sj_bodymass_relative_takeoff_power_trial_value
  FROM driveline_seed_data
  WHERE sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'net_peak_vertical_force_trial_value',
    net_peak_vertical_force_trial_value
  FROM driveline_seed_data
  WHERE net_peak_vertical_force_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'relative_strength_trial_value',
    relative_strength_trial_value
  FROM driveline_seed_data
  WHERE relative_strength_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'hop_mean_rsi_trial_value',
    hop_mean_rsi_trial_value
  FROM driveline_seed_data
  WHERE hop_mean_rsi_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'ppu_peak_takeoff_force_trial_value',
    ppu_peak_takeoff_force_trial_value
  FROM driveline_seed_data
  WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL

  -- Add athlete contributions
  UNION ALL

  SELECT
    playing_level,
    'peak_takeoff_power_trial_value',
    peak_takeoff_power_trial_value
  FROM athlete_percentile_contributions
  WHERE peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'bodymass_relative_takeoff_power_trial_value',
    bodymass_relative_takeoff_power_trial_value
  FROM athlete_percentile_contributions
  WHERE bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'sj_peak_takeoff_power_trial_value',
    sj_peak_takeoff_power_trial_value
  FROM athlete_percentile_contributions
  WHERE sj_peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'sj_bodymass_relative_takeoff_power_trial_value',
    sj_bodymass_relative_takeoff_power_trial_value
  FROM athlete_percentile_contributions
  WHERE sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'net_peak_vertical_force_trial_value',
    net_peak_vertical_force_trial_value
  FROM athlete_percentile_contributions
  WHERE net_peak_vertical_force_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'relative_strength_trial_value',
    relative_strength_trial_value
  FROM athlete_percentile_contributions
  WHERE relative_strength_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'hop_mean_rsi_trial_value',
    hop_mean_rsi_trial_value
  FROM athlete_percentile_contributions
  WHERE hop_mean_rsi_trial_value IS NOT NULL

  UNION ALL

  SELECT
    playing_level,
    'ppu_peak_takeoff_force_trial_value',
    ppu_peak_takeoff_force_trial_value
  FROM athlete_percentile_contributions
  WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL
)
SELECT * FROM all_metrics;

-- =====================================================
-- STEP 1: Generate percentiles for each play level
-- =====================================================
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile)
SELECT DISTINCT
  metric_column,
  play_level,
  value,
  ROUND(
    PERCENT_RANK() OVER (
      PARTITION BY metric_column, play_level
      ORDER BY value
    ) * 100
  )::INTEGER as percentile
FROM combined_percentile_data
WHERE play_level IN ('Youth', 'High School', 'College', 'Pro');

-- =====================================================
-- STEP 2: Generate "Overall" percentiles
-- Combine ALL play levels together for each metric
-- =====================================================
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile)
SELECT DISTINCT
  metric_column,
  'Overall' as play_level,
  value,
  ROUND(
    PERCENT_RANK() OVER (
      PARTITION BY metric_column
      ORDER BY value
    ) * 100
  )::INTEGER as percentile
FROM combined_percentile_data;

-- Drop temp table
DROP TABLE combined_percentile_data;

COMMIT;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
SELECT
  metric_column,
  play_level,
  COUNT(*) as row_count,
  MIN(percentile) as min_percentile,
  MAX(percentile) as max_percentile
FROM percentile_lookup
GROUP BY metric_column, play_level
ORDER BY metric_column, play_level;

-- Expected output:
-- 8 metrics × 5 play levels (Youth, HS, College, Pro, Overall) = 40 groups
-- Each group should have ~101 percentile values (0-100)
