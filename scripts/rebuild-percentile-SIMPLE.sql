-- SIMPLIFIED REBUILD - Do one metric at a time to avoid errors

-- Step 1: Clear table
TRUNCATE percentile_lookup;

-- Step 2: Rebuild each metric separately

-- PPU (the one causing errors)
WITH ppu_data AS (
  SELECT ppu_peak_takeoff_force_trial_value as val, playing_level as lvl
  FROM driveline_seed_data
  WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL

  UNION ALL

  SELECT ppu_peak_takeoff_force_trial_value, playing_level
  FROM athlete_percentile_contributions
  WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL
),
ranked AS (
  SELECT
    val,
    lvl,
    ROW_NUMBER() OVER (PARTITION BY lvl ORDER BY val ASC) - 1 as rnk,
    COUNT(*) OVER (PARTITION BY lvl) as tot
  FROM ppu_data
),
calcs AS (
  SELECT
    'ppu_peak_takeoff_force_trial_value' as metric_column,
    lvl as play_level,
    val as value,
    CASE
      WHEN tot <= 1 THEN 0
      ELSE ROUND((rnk::numeric / (tot - 1)) * 100)::integer
    END as percentile,
    tot as total_count
  FROM ranked
),
deduped AS (
  SELECT
    metric_column,
    play_level,
    percentile,
    AVG(value) as value,
    MAX(total_count) as total_count
  FROM calcs
  GROUP BY metric_column, play_level, percentile
)
INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
SELECT * FROM deduped;

SELECT 'PPU rebuilt' as status, COUNT(*) as rows FROM percentile_lookup WHERE metric_column = 'ppu_peak_takeoff_force_trial_value';
