/**
 * REBUILD PERCENTILE_LOOKUP FROM DRIVELINE SEED DATA
 *
 * This script rebuilds the percentile_lookup table from the driveline_seed_data table.
 * Use this if you accidentally deleted percentile_lookup data.
 *
 * The driveline_seed_data contains baseline percentile data for:
 * - High School
 * - College
 * - Pro
 * - Youth (if you have it)
 *
 * This script calculates percentiles for the 6 composite metrics used in Force Profile:
 * 1. SJ Peak Power (W)
 * 2. SJ Peak Power / BM (W/kg)
 * 3. HJ Reactive Strength Index (RSI)
 * 4. PPU Peak Takeoff Force (N)
 * 5. IMTP Net Peak Force (N)
 * 6. IMTP Relative Strength
 *
 * PLUS CMJ metrics (no prefix = CMJ in Driveline data):
 * 7. CMJ Peak Power (W)
 * 8. CMJ Peak Power / BM (W/kg)
 */

-- Step 1: Clear existing percentile_lookup data
-- YOU MUST RUN THIS to avoid duplicates since there's no unique constraint
DELETE FROM percentile_lookup;

-- Step 2: Rebuild SJ Peak Power (W)
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    sj_peak_takeoff_power_trial_value as value,
    playing_level,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE sj_peak_takeoff_power_trial_value IS NOT NULL
  GROUP BY sj_peak_takeoff_power_trial_value, playing_level
),
metric_ranked AS (
  SELECT
    value,
    playing_level,
    SUM(athlete_count) OVER (PARTITION BY playing_level ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER (PARTITION BY playing_level) as total_count
  FROM metric_data
),
deduplicated AS (
  SELECT DISTINCT ON (playing_level, ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER)
    value,
    playing_level,
    cumulative_count,
    total_count
  FROM metric_ranked
  ORDER BY playing_level, ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER, value DESC
)
SELECT
  'sj_peak_takeoff_power_trial_value'::TEXT as metric_column,
  playing_level::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM deduplicated;

-- Step 3: Rebuild SJ Peak Power / BM (W/kg)
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    sj_bodymass_relative_takeoff_power_trial_value as value,
    playing_level,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL
  GROUP BY sj_bodymass_relative_takeoff_power_trial_value, playing_level
),
metric_ranked AS (
  SELECT
    value,
    playing_level,
    SUM(athlete_count) OVER (PARTITION BY playing_level ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER (PARTITION BY playing_level) as total_count
  FROM metric_data
)
SELECT
  'sj_bodymass_relative_takeoff_power_trial_value'::TEXT as metric_column,
  playing_level::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- Step 4: Rebuild CMJ Peak Power (W) - NO PREFIX = CMJ
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    peak_takeoff_power_trial_value as value,
    playing_level,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE peak_takeoff_power_trial_value IS NOT NULL
  GROUP BY peak_takeoff_power_trial_value, playing_level
),
metric_ranked AS (
  SELECT
    value,
    playing_level,
    SUM(athlete_count) OVER (PARTITION BY playing_level ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER (PARTITION BY playing_level) as total_count
  FROM metric_data
)
SELECT
  'peak_takeoff_power_trial_value'::TEXT as metric_column,
  playing_level::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- Step 5: Rebuild CMJ Peak Power / BM (W/kg) - NO PREFIX = CMJ
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    bodymass_relative_takeoff_power_trial_value as value,
    playing_level,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE bodymass_relative_takeoff_power_trial_value IS NOT NULL
  GROUP BY bodymass_relative_takeoff_power_trial_value, playing_level
),
metric_ranked AS (
  SELECT
    value,
    playing_level,
    SUM(athlete_count) OVER (PARTITION BY playing_level ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER (PARTITION BY playing_level) as total_count
  FROM metric_data
)
SELECT
  'bodymass_relative_takeoff_power_trial_value'::TEXT as metric_column,
  playing_level::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- Step 6: Rebuild HJ RSI
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    hop_mean_rsi_trial_value as value,
    playing_level,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE hop_mean_rsi_trial_value IS NOT NULL
  GROUP BY hop_mean_rsi_trial_value, playing_level
),
metric_ranked AS (
  SELECT
    value,
    playing_level,
    SUM(athlete_count) OVER (PARTITION BY playing_level ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER (PARTITION BY playing_level) as total_count
  FROM metric_data
)
SELECT
  'hop_mean_rsi_trial_value'::TEXT as metric_column,
  playing_level::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- Step 5: Rebuild PPU Peak Takeoff Force
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    ppu_peak_takeoff_force_trial_value as value,
    playing_level,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL
  GROUP BY ppu_peak_takeoff_force_trial_value, playing_level
),
metric_ranked AS (
  SELECT
    value,
    playing_level,
    SUM(athlete_count) OVER (PARTITION BY playing_level ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER (PARTITION BY playing_level) as total_count
  FROM metric_data
)
SELECT
  'ppu_peak_takeoff_force_trial_value'::TEXT as metric_column,
  playing_level::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- Step 6: Rebuild IMTP Net Peak Force
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    net_peak_vertical_force_trial_value as value,
    playing_level,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE net_peak_vertical_force_trial_value IS NOT NULL
  GROUP BY net_peak_vertical_force_trial_value, playing_level
),
metric_ranked AS (
  SELECT
    value,
    playing_level,
    SUM(athlete_count) OVER (PARTITION BY playing_level ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER (PARTITION BY playing_level) as total_count
  FROM metric_data
)
SELECT
  'net_peak_vertical_force_trial_value'::TEXT as metric_column,
  playing_level::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- Step 7: Rebuild IMTP Relative Strength
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    relative_strength_trial_value as value,
    playing_level,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE relative_strength_trial_value IS NOT NULL
  GROUP BY relative_strength_trial_value, playing_level
),
metric_ranked AS (
  SELECT
    value,
    playing_level,
    SUM(athlete_count) OVER (PARTITION BY playing_level ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER (PARTITION BY playing_level) as total_count
  FROM metric_data
)
SELECT
  'relative_strength_trial_value'::TEXT as metric_column,
  playing_level::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- Step 8: Create Overall percentiles (combining all play levels)
-- CMJ Peak Power - Overall
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    peak_takeoff_power_trial_value as value,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE peak_takeoff_power_trial_value IS NOT NULL
  GROUP BY peak_takeoff_power_trial_value
),
metric_ranked AS (
  SELECT
    value,
    SUM(athlete_count) OVER (ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER () as total_count
  FROM metric_data
)
SELECT
  'peak_takeoff_power_trial_value'::TEXT as metric_column,
  'Overall'::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- CMJ Peak Power/BM - Overall
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    bodymass_relative_takeoff_power_trial_value as value,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE bodymass_relative_takeoff_power_trial_value IS NOT NULL
  GROUP BY bodymass_relative_takeoff_power_trial_value
),
metric_ranked AS (
  SELECT
    value,
    SUM(athlete_count) OVER (ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER () as total_count
  FROM metric_data
)
SELECT
  'bodymass_relative_takeoff_power_trial_value'::TEXT as metric_column,
  'Overall'::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- SJ Peak Power - Overall
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    sj_peak_takeoff_power_trial_value as value,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE sj_peak_takeoff_power_trial_value IS NOT NULL
  GROUP BY sj_peak_takeoff_power_trial_value
),
metric_ranked AS (
  SELECT
    value,
    SUM(athlete_count) OVER (ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER () as total_count
  FROM metric_data
)
SELECT
  'sj_peak_takeoff_power_trial_value'::TEXT as metric_column,
  'Overall'::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- SJ Peak Power/BM - Overall
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    sj_bodymass_relative_takeoff_power_trial_value as value,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL
  GROUP BY sj_bodymass_relative_takeoff_power_trial_value
),
metric_ranked AS (
  SELECT
    value,
    SUM(athlete_count) OVER (ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER () as total_count
  FROM metric_data
)
SELECT
  'sj_bodymass_relative_takeoff_power_trial_value'::TEXT as metric_column,
  'Overall'::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- HJ RSI - Overall
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    hop_mean_rsi_trial_value as value,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE hop_mean_rsi_trial_value IS NOT NULL
  GROUP BY hop_mean_rsi_trial_value
),
metric_ranked AS (
  SELECT
    value,
    SUM(athlete_count) OVER (ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER () as total_count
  FROM metric_data
)
SELECT
  'hop_mean_rsi_trial_value'::TEXT as metric_column,
  'Overall'::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- PPU Peak Force - Overall
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    ppu_peak_takeoff_force_trial_value as value,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL
  GROUP BY ppu_peak_takeoff_force_trial_value
),
metric_ranked AS (
  SELECT
    value,
    SUM(athlete_count) OVER (ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER () as total_count
  FROM metric_data
)
SELECT
  'ppu_peak_takeoff_force_trial_value'::TEXT as metric_column,
  'Overall'::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- IMTP Net Peak Force - Overall
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    net_peak_vertical_force_trial_value as value,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE net_peak_vertical_force_trial_value IS NOT NULL
  GROUP BY net_peak_vertical_force_trial_value
),
metric_ranked AS (
  SELECT
    value,
    SUM(athlete_count) OVER (ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER () as total_count
  FROM metric_data
)
SELECT
  'net_peak_vertical_force_trial_value'::TEXT as metric_column,
  'Overall'::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- IMTP Relative Strength - Overall
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
WITH metric_data AS (
  SELECT
    relative_strength_trial_value as value,
    COUNT(*) as athlete_count
  FROM driveline_seed_data
  WHERE relative_strength_trial_value IS NOT NULL
  GROUP BY relative_strength_trial_value
),
metric_ranked AS (
  SELECT
    value,
    SUM(athlete_count) OVER (ORDER BY value) as cumulative_count,
    SUM(athlete_count) OVER () as total_count
  FROM metric_data
)
SELECT
  'relative_strength_trial_value'::TEXT as metric_column,
  'Overall'::TEXT as play_level,
  value,
  ROUND((cumulative_count::numeric / total_count::numeric) * 100)::INTEGER as percentile,
  total_count::INTEGER
FROM metric_ranked;

-- Verify the rebuild
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
