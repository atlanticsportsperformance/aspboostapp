/**
 * REBUILD PERCENTILE_LOOKUP FROM DRIVELINE SEED DATA (V2 - SIMPLIFIED)
 *
 * This script rebuilds the percentile_lookup table from the driveline_seed_data table.
 * Uses a reusable CTE pattern to avoid duplicate percentile errors.
 *
 * Unique constraint: (metric_column, play_level, percentile)
 * This means only ONE value per percentile per metric/play_level combo
 */

-- Step 1: Clear existing data
DELETE FROM percentile_lookup;

-- Step 2: Rebuild ALL metrics at once using a unified approach
WITH all_metrics AS (
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

  -- CMJ Peak Power (W) - no prefix
  SELECT
    'peak_takeoff_power_trial_value',
    playing_level,
    peak_takeoff_power_trial_value
  FROM driveline_seed_data
  WHERE peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- CMJ Peak Power/BM (W/kg) - no prefix
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
metric_ranked AS (
  SELECT
    metric_column,
    play_level,
    value,
    SUM(athlete_count) OVER (PARTITION BY metric_column, play_level ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER (PARTITION BY metric_column, play_level) as total_count
  FROM metric_counts
),
percentiles_calculated AS (
  SELECT
    metric_column,
    play_level,
    value,
    ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
    total_count
  FROM metric_ranked
),
deduplicated AS (
  -- Keep the HIGHEST value for each percentile (more conservative ranking)
  SELECT DISTINCT ON (metric_column, play_level, percentile)
    metric_column,
    play_level,
    value,
    percentile,
    total_count
  FROM percentiles_calculated
  ORDER BY metric_column, play_level, percentile, value DESC
)
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
SELECT * FROM deduplicated;

-- Step 3: Add Overall percentiles (combining all play levels)
WITH all_metrics_overall AS (
  -- SJ Peak Power (W)
  SELECT
    'sj_peak_takeoff_power_trial_value' as metric_column,
    sj_peak_takeoff_power_trial_value as value
  FROM driveline_seed_data
  WHERE sj_peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- SJ Peak Power/BM (W/kg)
  SELECT
    'sj_bodymass_relative_takeoff_power_trial_value',
    sj_bodymass_relative_takeoff_power_trial_value
  FROM driveline_seed_data
  WHERE sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- CMJ Peak Power (W)
  SELECT
    'peak_takeoff_power_trial_value',
    peak_takeoff_power_trial_value
  FROM driveline_seed_data
  WHERE peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- CMJ Peak Power/BM (W/kg)
  SELECT
    'bodymass_relative_takeoff_power_trial_value',
    bodymass_relative_takeoff_power_trial_value
  FROM driveline_seed_data
  WHERE bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- HJ RSI
  SELECT
    'hop_mean_rsi_trial_value',
    hop_mean_rsi_trial_value
  FROM driveline_seed_data
  WHERE hop_mean_rsi_trial_value IS NOT NULL

  UNION ALL

  -- PPU Peak Force
  SELECT
    'ppu_peak_takeoff_force_trial_value',
    ppu_peak_takeoff_force_trial_value
  FROM driveline_seed_data
  WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL

  UNION ALL

  -- IMTP Net Peak Force
  SELECT
    'net_peak_vertical_force_trial_value',
    net_peak_vertical_force_trial_value
  FROM driveline_seed_data
  WHERE net_peak_vertical_force_trial_value IS NOT NULL

  UNION ALL

  -- IMTP Relative Strength
  SELECT
    'relative_strength_trial_value',
    relative_strength_trial_value
  FROM driveline_seed_data
  WHERE relative_strength_trial_value IS NOT NULL
),
metric_counts_overall AS (
  SELECT
    metric_column,
    value,
    COUNT(*) as athlete_count
  FROM all_metrics_overall
  GROUP BY metric_column, value
),
metric_ranked_overall AS (
  SELECT
    metric_column,
    value,
    SUM(athlete_count) OVER (PARTITION BY metric_column ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER (PARTITION BY metric_column) as total_count
  FROM metric_counts_overall
),
percentiles_calculated_overall AS (
  SELECT
    metric_column,
    'Overall'::TEXT as play_level,
    value,
    ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
    total_count
  FROM metric_ranked_overall
),
deduplicated_overall AS (
  SELECT DISTINCT ON (metric_column, percentile)
    metric_column,
    play_level,
    value,
    percentile,
    total_count
  FROM percentiles_calculated_overall
  ORDER BY metric_column, percentile, value DESC
)
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
SELECT * FROM deduplicated_overall;

-- Step 4: Verify the rebuild
SELECT
  play_level,
  metric_column,
  COUNT(*) as percentile_count,
  MIN(value) as min_value,
  MAX(value) as max_value,
  MAX(total_count) as sample_size
FROM percentile_lookup
GROUP BY play_level, metric_column
ORDER BY play_level, metric_column;
