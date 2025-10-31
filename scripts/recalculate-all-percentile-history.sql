-- RECALCULATE ALL PERCENTILE HISTORY
-- Run this AFTER rebuilding percentile_lookup to update all historical percentiles

-- This updates existing athlete_percentile_history records with fresh percentile calculations
-- based on the current percentile_lookup table

DO $$
DECLARE
  history_record RECORD;
  new_percentile_play_level INTEGER;
  new_percentile_overall INTEGER;
  metric_column_name TEXT;
BEGIN
  -- Loop through all athlete_percentile_history records
  FOR history_record IN
    SELECT id, test_type, metric_name, value, play_level
    FROM athlete_percentile_history
  LOOP
    -- Map metric_name back to column name
    metric_column_name := CASE
      -- CMJ
      WHEN history_record.metric_name = 'Peak Power (W)' AND history_record.test_type = 'CMJ'
        THEN 'peak_takeoff_power_trial_value'
      WHEN history_record.metric_name = 'Peak Power / BM (W/kg)' AND history_record.test_type = 'CMJ'
        THEN 'bodymass_relative_takeoff_power_trial_value'

      -- SJ
      WHEN history_record.metric_name = 'Peak Power (W)' AND history_record.test_type = 'SJ'
        THEN 'sj_peak_takeoff_power_trial_value'
      WHEN history_record.metric_name = 'Peak Power / BM (W/kg)' AND history_record.test_type = 'SJ'
        THEN 'sj_bodymass_relative_takeoff_power_trial_value'

      -- HJ
      WHEN history_record.metric_name = 'Reactive Strength Index'
        THEN 'hop_mean_rsi_trial_value'

      -- PPU
      WHEN history_record.metric_name = 'Peak Takeoff Force (N)'
        THEN 'ppu_peak_takeoff_force_trial_value'

      -- IMTP
      WHEN history_record.metric_name = 'Net Peak Force (N)'
        THEN 'net_peak_vertical_force_trial_value'
      WHEN history_record.metric_name = 'Relative Strength'
        THEN 'relative_strength_trial_value'

      ELSE NULL
    END;

    IF metric_column_name IS NULL THEN
      RAISE WARNING 'Unknown metric: % for test type %', history_record.metric_name, history_record.test_type;
      CONTINUE;
    END IF;

    -- Get percentile vs play level
    SELECT percentile INTO new_percentile_play_level
    FROM percentile_lookup
    WHERE metric_column = metric_column_name
      AND play_level = history_record.play_level
      AND value <= history_record.value
    ORDER BY value DESC
    LIMIT 1;

    -- Default to 0 if no match found (below all thresholds)
    new_percentile_play_level := COALESCE(new_percentile_play_level, 0);

    -- Get percentile vs Overall
    SELECT percentile INTO new_percentile_overall
    FROM percentile_lookup
    WHERE metric_column = metric_column_name
      AND play_level = 'Overall'
      AND value <= history_record.value
    ORDER BY value DESC
    LIMIT 1;

    -- Default to 0 if no match found
    new_percentile_overall := COALESCE(new_percentile_overall, 0);

    -- Update the record
    UPDATE athlete_percentile_history
    SET
      percentile_play_level = new_percentile_play_level,
      percentile_overall = new_percentile_overall
    WHERE id = history_record.id;

  END LOOP;

  RAISE NOTICE '✅ Recalculated all percentile history records';
END $$;

-- Show summary of changes
SELECT
  test_type,
  play_level,
  metric_name,
  COUNT(*) as record_count,
  AVG(percentile_play_level) as avg_play_level_percentile,
  AVG(percentile_overall) as avg_overall_percentile
FROM athlete_percentile_history
GROUP BY test_type, play_level, metric_name
ORDER BY test_type, play_level, metric_name;
