-- =====================================================
-- FIX: Add test_id to athlete_percentile_contributions INSERT
-- =====================================================
-- The trigger was failing because athlete_percentile_contributions.test_id
-- has a NOT NULL constraint, but the trigger wasn't inserting it.

CREATE OR REPLACE FUNCTION auto_add_contribution_from_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  test_count INTEGER;
  column_name TEXT;
  metric_value DOUBLE PRECISION;
BEGIN
  -- Only process if this is a metric row (not FORCE_PROFILE composite)
  IF NEW.metric_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count how many DISTINCT tests this athlete has for this test type at this play level
  SELECT COUNT(DISTINCT test_id)
  INTO test_count
  FROM athlete_percentile_history
  WHERE athlete_id = NEW.athlete_id
    AND test_type = NEW.test_type
    AND play_level = NEW.play_level
    AND test_id IS NOT NULL;

  -- If this is the 2nd test or later, add/update contribution
  IF test_count >= 2 THEN
    -- Map metric display name to column name based on test type
    column_name := CASE
      -- CMJ metrics
      WHEN NEW.test_type = 'CMJ' AND NEW.metric_name = 'Peak Power (W)' THEN 'peak_takeoff_power_trial_value'
      WHEN NEW.test_type = 'CMJ' AND NEW.metric_name = 'Peak Power / BM (W/kg)' THEN 'bodymass_relative_takeoff_power_trial_value'
      -- SJ metrics (need sj_ prefix)
      WHEN NEW.test_type = 'SJ' AND NEW.metric_name = 'Peak Power (W)' THEN 'sj_peak_takeoff_power_trial_value'
      WHEN NEW.test_type = 'SJ' AND NEW.metric_name = 'Peak Power / BM (W/kg)' THEN 'sj_bodymass_relative_takeoff_power_trial_value'
      -- HJ metrics
      WHEN NEW.test_type = 'HJ' AND NEW.metric_name = 'Reactive Strength Index' THEN 'hop_mean_rsi_trial_value'
      -- PPU metrics (need ppu_ prefix)
      WHEN NEW.test_type = 'PPU' AND NEW.metric_name = 'Peak Takeoff Force (N)' THEN 'ppu_peak_takeoff_force_trial_value'
      -- IMTP metrics
      WHEN NEW.test_type = 'IMTP' AND NEW.metric_name = 'Net Peak Force (N)' THEN 'net_peak_vertical_force_trial_value'
      WHEN NEW.test_type = 'IMTP' AND NEW.metric_name = 'Relative Strength' THEN 'relative_strength_trial_value'
      ELSE NULL
    END;

    metric_value := NEW.value;

    -- Insert or update the contribution (NOW INCLUDING test_id AND test_date)
    IF column_name IS NOT NULL AND metric_value IS NOT NULL AND NEW.test_id IS NOT NULL AND NEW.test_date IS NOT NULL THEN
      EXECUTE format(
        'INSERT INTO athlete_percentile_contributions
         (athlete_id, test_type, test_id, test_date, playing_level, %I, contributed_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (athlete_id, test_type, playing_level)
         DO UPDATE SET %I = $6, test_id = $3, test_date = $4, contributed_at = NOW()',
        column_name, column_name
      ) USING NEW.athlete_id, NEW.test_type, NEW.test_id, NEW.test_date, NEW.play_level, metric_value;

      RAISE NOTICE 'Added contribution: athlete=% test=% test_id=% test_date=% metric=% value=%',
        NEW.athlete_id, NEW.test_type, NEW.test_id, NEW.test_date, NEW.metric_name, metric_value;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

SELECT '✅ Fixed trigger function to include test_id AND test_date' as status;
