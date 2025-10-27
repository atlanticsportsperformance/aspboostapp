-- ============================================================================
-- AUTO-CONTRIBUTION TRIGGER SYSTEM
-- ============================================================================
-- Purpose: Automatically add athletes to percentile_contributions after 2 complete test sessions
-- A "complete session" = all 5 tests (CMJ, SJ, HJ, PPU, IMTP) on the same calendar day
-- ============================================================================

-- ============================================================================
-- STEP 1: Create the trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_add_percentile_contribution()
RETURNS TRIGGER AS $$
DECLARE
  complete_sessions_count INT;
  session_date DATE;
  athlete_play_level TEXT;
  current_test_type TEXT;
BEGIN
  -- Only proceed if athlete_id exists
  IF NEW.athlete_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the athlete's play level
  SELECT play_level INTO athlete_play_level
  FROM athletes
  WHERE id = NEW.athlete_id;

  IF athlete_play_level IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the session date (calendar day) of this test
  session_date := DATE(NEW.recorded_utc);

  -- Count how many COMPLETE sessions this athlete has
  -- A complete session = all 5 tests on the same day
  SELECT COUNT(DISTINCT session_day) INTO complete_sessions_count
  FROM (
    -- Find days where athlete has all 5 test types
    SELECT DATE(recorded_utc) as session_day
    FROM (
      SELECT recorded_utc, 'CMJ' as test_type FROM cmj_tests WHERE athlete_id = NEW.athlete_id
      UNION ALL
      SELECT recorded_utc, 'SJ' FROM sj_tests WHERE athlete_id = NEW.athlete_id
      UNION ALL
      SELECT recorded_utc, 'HJ' FROM hj_tests WHERE athlete_id = NEW.athlete_id
      UNION ALL
      SELECT recorded_utc, 'PPU' FROM ppu_tests WHERE athlete_id = NEW.athlete_id
      UNION ALL
      SELECT recorded_utc, 'IMTP' FROM imtp_tests WHERE athlete_id = NEW.athlete_id
    ) all_tests
    GROUP BY DATE(recorded_utc)
    HAVING COUNT(DISTINCT test_type) = 5
  ) complete_days;

  -- If athlete has 2+ complete sessions, add them to contributions
  IF complete_sessions_count >= 2 THEN
    -- Get the test type from the trigger's table name
    CASE TG_TABLE_NAME
      WHEN 'cmj_tests' THEN current_test_type := 'CMJ';
      WHEN 'sj_tests' THEN current_test_type := 'SJ';
      WHEN 'hj_tests' THEN current_test_type := 'HJ';
      WHEN 'ppu_tests' THEN current_test_type := 'PPU';
      WHEN 'imtp_tests' THEN current_test_type := 'IMTP';
      ELSE current_test_type := NULL;
    END CASE;

    IF current_test_type IS NOT NULL THEN
      -- Insert into athlete_percentile_contributions
      INSERT INTO athlete_percentile_contributions (
        athlete_id,
        test_type,
        playing_level,
        test_id,
        test_date
      )
      VALUES (
        NEW.athlete_id,
        current_test_type,
        athlete_play_level,
        NEW.test_id,
        NEW.recorded_utc
      )
      ON CONFLICT (athlete_id, test_type, playing_level) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
