/**
 * REBUILD PERCENTILE_LOOKUP FROM BOTH DRIVELINE SEED + ATHLETE CONTRIBUTIONS
 *
 * This combines:
 * 1. Driveline seed data (baseline percentiles)
 * 2. Athlete contributions (2nd+ tests from your athletes)
 *
 * Run this whenever you want to refresh the percentile lookup table.
 */

-- Step 1: Clear existing data
DELETE FROM percentile_lookup;

-- Step 2: Combine Driveline seed data + athlete contributions
WITH all_metrics AS (
  -- ========== FROM DRIVELINE SEED DATA ==========

  -- SJ Peak Power (W)
  SELECT
    'sj_peak_takeoff_power_trial_value' as metric_column,
    playing_level as play_level,
    sj_peak_takeoff_power_trial_value as value
  FROM driveline_seed_data
  WHERE sj_peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- SJ Peak Power/BM (W/kg)
  SELECT
    'sj_bodymass_relative_takeoff_power_trial_value',
    playing_level,
    sj_bodymass_relative_takeoff_power_trial_value
  FROM driveline_seed_data
  WHERE sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- CMJ Peak Power (W)
  SELECT
    'peak_takeoff_power_trial_value',
    playing_level,
    peak_takeoff_power_trial_value
  FROM driveline_seed_data
  WHERE peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- CMJ Peak Power/BM (W/kg)
  SELECT
    'bodymass_relative_takeoff_power_trial_value',
    playing_level,
    bodymass_relative_takeoff_power_trial_value
  FROM driveline_seed_data
  WHERE bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- HJ RSI
  SELECT
    'hop_mean_rsi_trial_value',
    playing_level,
    hop_mean_rsi_trial_value
  FROM driveline_seed_data
  WHERE hop_mean_rsi_trial_value IS NOT NULL

  UNION ALL

  -- PPU Peak Force
  SELECT
    'ppu_peak_takeoff_force_trial_value',
    playing_level,
    ppu_peak_takeoff_force_trial_value
  FROM driveline_seed_data
  WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL

  UNION ALL

  -- IMTP Net Peak Force
  SELECT
    'net_peak_vertical_force_trial_value',
    playing_level,
    net_peak_vertical_force_trial_value
  FROM driveline_seed_data
  WHERE net_peak_vertical_force_trial_value IS NOT NULL

  UNION ALL

  -- IMTP Relative Strength
  SELECT
    'relative_strength_trial_value',
    playing_level,
    relative_strength_trial_value
  FROM driveline_seed_data
  WHERE relative_strength_trial_value IS NOT NULL

  UNION ALL

  -- ========== FROM ATHLETE CONTRIBUTIONS ==========

  -- SJ Peak Power (W)
  SELECT
    'sj_peak_takeoff_power_trial_value',
    playing_level,
    sj_peak_takeoff_power_trial_value
  FROM athlete_percentile_contributions
  WHERE sj_peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- SJ Peak Power/BM (W/kg)
  SELECT
    'sj_bodymass_relative_takeoff_power_trial_value',
    playing_level,
    sj_bodymass_relative_takeoff_power_trial_value
  FROM athlete_percentile_contributions
  WHERE sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- CMJ Peak Power (W)
  SELECT
    'peak_takeoff_power_trial_value',
    playing_level,
    peak_takeoff_power_trial_value
  FROM athlete_percentile_contributions
  WHERE peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- CMJ Peak Power/BM (W/kg)
  SELECT
    'bodymass_relative_takeoff_power_trial_value',
    playing_level,
    bodymass_relative_takeoff_power_trial_value
  FROM athlete_percentile_contributions
  WHERE bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- HJ RSI
  SELECT
    'hop_mean_rsi_trial_value',
    playing_level,
    hop_mean_rsi_trial_value
  FROM athlete_percentile_contributions
  WHERE hop_mean_rsi_trial_value IS NOT NULL

  UNION ALL

  -- PPU Peak Force
  SELECT
    'ppu_peak_takeoff_force_trial_value',
    playing_level,
    ppu_peak_takeoff_force_trial_value
  FROM athlete_percentile_contributions
  WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL

  UNION ALL

  -- IMTP Net Peak Force
  SELECT
    'net_peak_vertical_force_trial_value',
    playing_level,
    net_peak_vertical_force_trial_value
  FROM athlete_percentile_contributions
  WHERE net_peak_vertical_force_trial_value IS NOT NULL

  UNION ALL

  -- IMTP Relative Strength
  SELECT
    'relative_strength_trial_value',
    playing_level,
    relative_strength_trial_value
  FROM athlete_percentile_contributions
  WHERE relative_strength_trial_value IS NOT NULL
),
metric_counts AS (
  SELECT
    metric_column,
    play_level,
    value,
    COUNT(*) as athlete_count
  FROM all_metrics
  GROUP BY metric_column, play_level, value
),
ranked_metrics AS (
  SELECT
    metric_column,
    play_level,
    value,
    athlete_count,
    ROW_NUMBER() OVER (PARTITION BY metric_column, play_level ORDER BY value ASC) - 1 as rank,
    COUNT(*) OVER (PARTITION BY metric_column, play_level) as total_count
  FROM metric_counts
),
percentile_calc AS (
  SELECT
    metric_column,
    play_level,
    value,
    ROUND((rank::numeric / NULLIF(total_count - 1, 0)) * 100)::integer as percentile,
    total_count
  FROM ranked_metrics
)
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
SELECT
  metric_column,
  play_level,
  value,
  percentile,
  total_count
FROM percentile_calc
ON CONFLICT (metric_column, play_level, percentile)
DO UPDATE SET
  value = EXCLUDED.value,
  total_count = EXCLUDED.total_count,
  calculated_at = CURRENT_TIMESTAMP;

-- Show summary
SELECT
  metric_column,
  play_level,
  COUNT(*) as percentile_count,
  MIN(value) as min_value,
  MAX(value) as max_value,
  MAX(total_count) as data_points
FROM percentile_lookup
GROUP BY metric_column, play_level
ORDER BY metric_column, play_level;

SELECT '✅ Percentile lookup rebuilt from Driveline seed + athlete contributions' AS status;
