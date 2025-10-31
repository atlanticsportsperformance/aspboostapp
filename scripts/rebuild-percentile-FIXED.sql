-- REBUILD PERCENTILE LOOKUP - SIMPLE AND CORRECT
-- Combines Driveline seed data + athlete contributions
-- Then calculates percentiles 0-100 for each metric/play_level

-- Step 1: Clear everything
TRUNCATE percentile_lookup;

-- Step 2: Build from both sources
WITH all_data AS (
  -- CMJ Peak Power (W) - FROM DRIVELINE
  SELECT 'peak_takeoff_power_trial_value' as metric, playing_level as level, peak_takeoff_power_trial_value as val
  FROM driveline_seed_data WHERE peak_takeoff_power_trial_value IS NOT NULL
  UNION ALL
  -- CMJ Peak Power (W) - FROM CONTRIBUTIONS
  SELECT 'peak_takeoff_power_trial_value', playing_level, peak_takeoff_power_trial_value
  FROM athlete_percentile_contributions WHERE peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- CMJ Peak Power/BM (W/kg) - FROM DRIVELINE
  SELECT 'bodymass_relative_takeoff_power_trial_value', playing_level, bodymass_relative_takeoff_power_trial_value
  FROM driveline_seed_data WHERE bodymass_relative_takeoff_power_trial_value IS NOT NULL
  UNION ALL
  -- CMJ Peak Power/BM (W/kg) - FROM CONTRIBUTIONS
  SELECT 'bodymass_relative_takeoff_power_trial_value', playing_level, bodymass_relative_takeoff_power_trial_value
  FROM athlete_percentile_contributions WHERE bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- SJ Peak Power (W) - FROM DRIVELINE
  SELECT 'sj_peak_takeoff_power_trial_value', playing_level, sj_peak_takeoff_power_trial_value
  FROM driveline_seed_data WHERE sj_peak_takeoff_power_trial_value IS NOT NULL
  UNION ALL
  -- SJ Peak Power (W) - FROM CONTRIBUTIONS
  SELECT 'sj_peak_takeoff_power_trial_value', playing_level, sj_peak_takeoff_power_trial_value
  FROM athlete_percentile_contributions WHERE sj_peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- SJ Peak Power/BM (W/kg) - FROM DRIVELINE
  SELECT 'sj_bodymass_relative_takeoff_power_trial_value', playing_level, sj_bodymass_relative_takeoff_power_trial_value
  FROM driveline_seed_data WHERE sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL
  UNION ALL
  -- SJ Peak Power/BM (W/kg) - FROM CONTRIBUTIONS
  SELECT 'sj_bodymass_relative_takeoff_power_trial_value', playing_level, sj_bodymass_relative_takeoff_power_trial_value
  FROM athlete_percentile_contributions WHERE sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL

  -- HJ RSI - FROM DRIVELINE
  SELECT 'hop_mean_rsi_trial_value', playing_level, hop_mean_rsi_trial_value
  FROM driveline_seed_data WHERE hop_mean_rsi_trial_value IS NOT NULL
  UNION ALL
  -- HJ RSI - FROM CONTRIBUTIONS
  SELECT 'hop_mean_rsi_trial_value', playing_level, hop_mean_rsi_trial_value
  FROM athlete_percentile_contributions WHERE hop_mean_rsi_trial_value IS NOT NULL

  UNION ALL

  -- PPU Peak Force - FROM DRIVELINE
  SELECT 'ppu_peak_takeoff_force_trial_value', playing_level, ppu_peak_takeoff_force_trial_value
  FROM driveline_seed_data WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL
  UNION ALL
  -- PPU Peak Force - FROM CONTRIBUTIONS
  SELECT 'ppu_peak_takeoff_force_trial_value', playing_level, ppu_peak_takeoff_force_trial_value
  FROM athlete_percentile_contributions WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL

  UNION ALL

  -- IMTP Net Peak Force - FROM DRIVELINE
  SELECT 'net_peak_vertical_force_trial_value', playing_level, net_peak_vertical_force_trial_value
  FROM driveline_seed_data WHERE net_peak_vertical_force_trial_value IS NOT NULL
  UNION ALL
  -- IMTP Net Peak Force - FROM CONTRIBUTIONS
  SELECT 'net_peak_vertical_force_trial_value', playing_level, net_peak_vertical_force_trial_value
  FROM athlete_percentile_contributions WHERE net_peak_vertical_force_trial_value IS NOT NULL

  UNION ALL

  -- IMTP Relative Strength - FROM DRIVELINE
  SELECT 'relative_strength_trial_value', playing_level, relative_strength_trial_value
  FROM driveline_seed_data WHERE relative_strength_trial_value IS NOT NULL
  UNION ALL
  -- IMTP Relative Strength - FROM CONTRIBUTIONS
  SELECT 'relative_strength_trial_value', playing_level, relative_strength_trial_value
  FROM athlete_percentile_contributions WHERE relative_strength_trial_value IS NOT NULL
),
ranked AS (
  SELECT
    metric,
    level,
    val,
    ROW_NUMBER() OVER (PARTITION BY metric, level ORDER BY val ASC) - 1 as rank,
    COUNT(*) OVER (PARTITION BY metric, level) as total
  FROM all_data
),
calcs AS (
  SELECT
    metric as metric_column,
    level as play_level,
    val as value,
    LEAST(100, GREATEST(0, ROUND((rank::numeric / NULLIF(total - 1, 0)) * 100)::integer)) as percentile,
    total as total_count
  FROM ranked
),
deduped AS (
  SELECT
    metric_column,
    play_level,
    AVG(value) as value,
    percentile,
    MAX(total_count) as total_count
  FROM calcs
  GROUP BY metric_column, play_level, percentile
)
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
SELECT metric_column, play_level, value, percentile, total_count FROM deduped;

-- Show results
SELECT metric_column, play_level, COUNT(*) as rows
FROM percentile_lookup
GROUP BY metric_column, play_level
ORDER BY metric_column, play_level;
