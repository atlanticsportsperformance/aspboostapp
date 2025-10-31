-- Create a PostgreSQL function to rebuild percentile_lookup table
-- This can be called from the API via supabase.rpc('rebuild_percentile_lookup')

CREATE OR REPLACE FUNCTION rebuild_percentile_lookup()
RETURNS TABLE(
  out_metric_column text,
  out_play_level text,
  out_row_count bigint
) AS $$
BEGIN
  -- Step 1: Clear everything
  TRUNCATE percentile_lookup;

  -- Step 2: Build from both sources
  WITH all_data AS (
    -- CMJ Peak Power (W)
    SELECT 'peak_takeoff_power_trial_value' as metric, playing_level as level, peak_takeoff_power_trial_value as val
    FROM driveline_seed_data WHERE peak_takeoff_power_trial_value IS NOT NULL
    UNION ALL
    SELECT 'peak_takeoff_power_trial_value', playing_level, peak_takeoff_power_trial_value
    FROM athlete_percentile_contributions WHERE peak_takeoff_power_trial_value IS NOT NULL

    UNION ALL

    -- CMJ Peak Power/BM (W/kg)
    SELECT 'bodymass_relative_takeoff_power_trial_value', playing_level, bodymass_relative_takeoff_power_trial_value
    FROM driveline_seed_data WHERE bodymass_relative_takeoff_power_trial_value IS NOT NULL
    UNION ALL
    SELECT 'bodymass_relative_takeoff_power_trial_value', playing_level, bodymass_relative_takeoff_power_trial_value
    FROM athlete_percentile_contributions WHERE bodymass_relative_takeoff_power_trial_value IS NOT NULL

    UNION ALL

    -- SJ Peak Power (W)
    SELECT 'sj_peak_takeoff_power_trial_value', playing_level, sj_peak_takeoff_power_trial_value
    FROM driveline_seed_data WHERE sj_peak_takeoff_power_trial_value IS NOT NULL
    UNION ALL
    SELECT 'sj_peak_takeoff_power_trial_value', playing_level, sj_peak_takeoff_power_trial_value
    FROM athlete_percentile_contributions WHERE sj_peak_takeoff_power_trial_value IS NOT NULL

    UNION ALL

    -- SJ Peak Power/BM (W/kg)
    SELECT 'sj_bodymass_relative_takeoff_power_trial_value', playing_level, sj_bodymass_relative_takeoff_power_trial_value
    FROM driveline_seed_data WHERE sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL
    UNION ALL
    SELECT 'sj_bodymass_relative_takeoff_power_trial_value', playing_level, sj_bodymass_relative_takeoff_power_trial_value
    FROM athlete_percentile_contributions WHERE sj_bodymass_relative_takeoff_power_trial_value IS NOT NULL

    UNION ALL

    -- HJ RSI
    SELECT 'hop_mean_rsi_trial_value', playing_level, hop_mean_rsi_trial_value
    FROM driveline_seed_data WHERE hop_mean_rsi_trial_value IS NOT NULL
    UNION ALL
    SELECT 'hop_mean_rsi_trial_value', playing_level, hop_mean_rsi_trial_value
    FROM athlete_percentile_contributions WHERE hop_mean_rsi_trial_value IS NOT NULL

    UNION ALL

    -- PPU Peak Force
    SELECT 'ppu_peak_takeoff_force_trial_value', playing_level, ppu_peak_takeoff_force_trial_value
    FROM driveline_seed_data WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL
    UNION ALL
    SELECT 'ppu_peak_takeoff_force_trial_value', playing_level, ppu_peak_takeoff_force_trial_value
    FROM athlete_percentile_contributions WHERE ppu_peak_takeoff_force_trial_value IS NOT NULL

    UNION ALL

    -- IMTP Net Peak Force
    SELECT 'net_peak_vertical_force_trial_value', playing_level, net_peak_vertical_force_trial_value
    FROM driveline_seed_data WHERE net_peak_vertical_force_trial_value IS NOT NULL
    UNION ALL
    SELECT 'net_peak_vertical_force_trial_value', playing_level, net_peak_vertical_force_trial_value
    FROM athlete_percentile_contributions WHERE net_peak_vertical_force_trial_value IS NOT NULL

    UNION ALL

    -- IMTP Relative Strength
    SELECT 'relative_strength_trial_value', playing_level, relative_strength_trial_value
    FROM driveline_seed_data WHERE relative_strength_trial_value IS NOT NULL
    UNION ALL
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

  -- Return summary statistics
  RETURN QUERY
  SELECT
    pl.metric_column::text as out_metric_column,
    pl.play_level::text as out_play_level,
    COUNT(*)::bigint as out_row_count
  FROM percentile_lookup pl
  GROUP BY pl.metric_column, pl.play_level
  ORDER BY pl.metric_column, pl.play_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION rebuild_percentile_lookup() TO authenticated;
GRANT EXECUTE ON FUNCTION rebuild_percentile_lookup() TO service_role;

-- Test it
SELECT * FROM rebuild_percentile_lookup();
