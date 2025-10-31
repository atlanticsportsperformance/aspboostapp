-- =====================================================
-- SIMPLE PERCENTILE LOOKUP REBUILD
-- No bullshit, just one SQL transaction
-- =====================================================

BEGIN;

-- Step 1: Clear the table
TRUNCATE TABLE percentile_lookup;

-- Step 2: Insert all percentiles in ONE statement using window functions
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH all_data AS (
  -- Combine driveline_seed_data + athlete_percentile_contributions
  SELECT
    playing_level as play_level,
    'peak_takeoff_power_trial_value' as metric_column,
    peak_takeoff_power_trial_value as value
  FROM driveline_seed_data
  WHERE peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'peak_takeoff_power_trial_value', peak_takeoff_power_trial_value
  FROM athlete_percentile_contributions WHERE peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'bodymass_relative_takeoff_power_trial_value', bodymass_relative_takeoff_power_trial_value
  FROM driveline_seed_data WHERE bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'bodymass_relative_takeoff_power_trial_value', bodymass_relative_takeoff_power_trial_value
  FROM athlete_percentile_contributions WHERE bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'sj_peak_takeoff_power_trial_value', sj_peak_takeoff_power_trial_value
  FROM driveline_seed_data WHERE sj_peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'sj_peak_takeoff_power_trial_value', sj_peak_takeoff_power_trial_value
  FROM athlete_percentile_contributions WHERE sj_peak_takeoff_power_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'sj_bodymass_relative_takeoff_power_trial_value', sj_bodymass_relative_takeoff_power_trial_value
  FROM driveline_seed_data WHERE sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'sj_bodymass_relative_takeoff_power_trial_value', sj_bodymass_relative_takeoff_power_trial_value
  FROM athlete_percentile_contributions WHERE sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'net_peak_vertical_force_trial_value', net_peak_vertical_force_trial_value
  FROM driveline_seed_data WHERE net_peak_vertical_force_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'net_peak_vertical_force_trial_value', net_peak_vertical_force_trial_value
  FROM athlete_percentile_contributions WHERE net_peak_vertical_force_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'relative_strength_trial_value', relative_strength_trial_value
  FROM driveline_seed_data WHERE relative_strength_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'relative_strength_trial_value', relative_strength_trial_value
  FROM athlete_percentile_contributions WHERE relative_strength_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'hop_mean_rsi_trial_value', hop_mean_rsi_trial_value
  FROM driveline_seed_data WHERE hop_mean_rsi_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'hop_mean_rsi_trial_value', hop_mean_rsi_trial_value
  FROM athlete_percentile_contributions WHERE hop_mean_rsi_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'ppu_peak_takeoff_force_trial_value', ppu_peak_takeoff_force_trial_value
  FROM driveline_seed_data WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL

  UNION ALL
  SELECT playing_level, 'ppu_peak_takeoff_force_trial_value', ppu_peak_takeoff_force_trial_value
  FROM athlete_percentile_contributions WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL
),
-- Add Overall play level (combine all levels)
all_data_with_overall AS (
  SELECT * FROM all_data
  UNION ALL
  SELECT 'Overall' as play_level, metric_column, value FROM all_data
),
-- Calculate percentiles and total counts
ranked_data AS (
  SELECT
    metric_column,
    play_level,
    value,
    ROUND(PERCENT_RANK() OVER (
      PARTITION BY metric_column, play_level
      ORDER BY value
    ) * 100)::INTEGER as percentile,
    COUNT(*) OVER (PARTITION BY metric_column, play_level) as total_count,
    ROW_NUMBER() OVER (
      PARTITION BY metric_column, play_level,
      ROUND(PERCENT_RANK() OVER (
        PARTITION BY metric_column, play_level
        ORDER BY value
      ) * 100)::INTEGER
      ORDER BY value
    ) as rn
  FROM all_data_with_overall
)
-- Only keep first value for each percentile (handle duplicates)
SELECT
  metric_column,
  play_level,
  value,
  percentile,
  total_count
FROM ranked_data
WHERE rn = 1
ORDER BY metric_column, play_level, percentile;

COMMIT;

-- Verification
SELECT
  play_level,
  COUNT(*) as total_rows,
  COUNT(DISTINCT metric_column) as unique_metrics
FROM percentile_lookup
GROUP BY play_level
ORDER BY play_level;

SELECT
  metric_column,
  play_level,
  COUNT(*) as percentile_count,
  MIN(percentile) as min_p,
  MAX(percentile) as max_p
FROM percentile_lookup
GROUP BY metric_column, play_level
ORDER BY metric_column, play_level;
