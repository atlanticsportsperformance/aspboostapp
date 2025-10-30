-- Fix the add_to_percentile_contributions function to remove jump_height_trial_value
-- This column doesn't exist in athlete_percentile_contributions and shouldn't be there

-- Drop the old function
DROP FUNCTION IF EXISTS add_to_percentile_contributions(
  p_athlete_id uuid,
  p_test_type text,
  p_playing_level text,
  p_test_id text,
  p_test_date timestamptz,
  p_peak_takeoff_power_trial_value numeric,
  p_bodymass_relative_takeoff_power_trial_value numeric,
  p_sj_peak_takeoff_power_trial_value numeric,
  p_sj_bodymass_relative_takeoff_power_trial_value numeric,
  p_net_peak_vertical_force_trial_value numeric,
  p_relative_strength_trial_value numeric,
  p_hop_mean_rsi_trial_value numeric,
  p_ppu_peak_takeoff_force_trial_value numeric
);

-- Recreate the function WITHOUT jump_height_trial_value
CREATE OR REPLACE FUNCTION add_to_percentile_contributions(
  p_athlete_id uuid,
  p_test_type text,
  p_playing_level text,
  p_test_id text,
  p_test_date timestamptz,
  p_peak_takeoff_power_trial_value numeric DEFAULT NULL,
  p_bodymass_relative_takeoff_power_trial_value numeric DEFAULT NULL,
  p_sj_peak_takeoff_power_trial_value numeric DEFAULT NULL,
  p_sj_bodymass_relative_takeoff_power_trial_value numeric DEFAULT NULL,
  p_net_peak_vertical_force_trial_value numeric DEFAULT NULL,
  p_relative_strength_trial_value numeric DEFAULT NULL,
  p_hop_mean_rsi_trial_value numeric DEFAULT NULL,
  p_ppu_peak_takeoff_force_trial_value numeric DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_test_count integer;
BEGIN
  -- Check if this is the athlete's 2nd+ test at this playing level
  SELECT COUNT(*)
  INTO v_test_count
  FROM athlete_percentile_history
  WHERE athlete_id = p_athlete_id
    AND test_type = p_test_type
    AND playing_level = p_playing_level;

  -- Only add contribution if this is 2nd+ test
  IF v_test_count >= 2 THEN
    -- Upsert into athlete_percentile_contributions
    INSERT INTO athlete_percentile_contributions (
      athlete_id,
      test_type,
      playing_level,
      test_id,
      test_date,
      peak_takeoff_power_trial_value,
      bodymass_relative_takeoff_power_trial_value,
      sj_peak_takeoff_power_trial_value,
      sj_bodymass_relative_takeoff_power_trial_value,
      net_peak_vertical_force_trial_value,
      relative_strength_trial_value,
      hop_mean_rsi_trial_value,
      ppu_peak_takeoff_force_trial_value
    ) VALUES (
      p_athlete_id,
      p_test_type,
      p_playing_level,
      p_test_id,
      p_test_date,
      p_peak_takeoff_power_trial_value,
      p_bodymass_relative_takeoff_power_trial_value,
      p_sj_peak_takeoff_power_trial_value,
      p_sj_bodymass_relative_takeoff_power_trial_value,
      p_net_peak_vertical_force_trial_value,
      p_relative_strength_trial_value,
      p_hop_mean_rsi_trial_value,
      p_ppu_peak_takeoff_force_trial_value
    )
    ON CONFLICT (athlete_id, test_type, playing_level)
    DO UPDATE SET
      test_id = EXCLUDED.test_id,
      test_date = EXCLUDED.test_date,
      peak_takeoff_power_trial_value = EXCLUDED.peak_takeoff_power_trial_value,
      bodymass_relative_takeoff_power_trial_value = EXCLUDED.bodymass_relative_takeoff_power_trial_value,
      sj_peak_takeoff_power_trial_value = EXCLUDED.sj_peak_takeoff_power_trial_value,
      sj_bodymass_relative_takeoff_power_trial_value = EXCLUDED.sj_bodymass_relative_takeoff_power_trial_value,
      net_peak_vertical_force_trial_value = EXCLUDED.net_peak_vertical_force_trial_value,
      relative_strength_trial_value = EXCLUDED.relative_strength_trial_value,
      hop_mean_rsi_trial_value = EXCLUDED.hop_mean_rsi_trial_value,
      ppu_peak_takeoff_force_trial_value = EXCLUDED.ppu_peak_takeoff_force_trial_value,
      updated_at = CURRENT_TIMESTAMP;

    RETURN TRUE; -- Contribution added
  ELSE
    RETURN FALSE; -- Skipped (first test)
  END IF;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION add_to_percentile_contributions IS 'Adds athlete contribution to percentile calculations for 2nd+ tests at a playing level. Does NOT include jump_height_trial_value.';

SELECT '✅ Function add_to_percentile_contributions recreated without jump_height_trial_value' AS status;
