-- =============================================
-- WORKOUT INSTANCES WITH GROUP INFO VIEW
-- =============================================
-- This migration creates a helper function to fetch group info
-- for workout instances that come from groups
-- =============================================

-- Create function to get group info for a workout instance
CREATE OR REPLACE FUNCTION get_group_for_workout_instance(
  p_source_type TEXT,
  p_source_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_group_info JSON;
BEGIN
  -- Only fetch if source_type is 'group'
  IF p_source_type = 'group' AND p_source_id IS NOT NULL THEN
    SELECT json_build_object(
      'id', g.id,
      'name', g.name,
      'color', g.color
    ) INTO v_group_info
    FROM group_workout_schedules gws
    JOIN groups g ON g.id = gws.group_id
    WHERE gws.id = p_source_id
    LIMIT 1;

    RETURN v_group_info;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_group_for_workout_instance IS 'Returns group info (id, name, color) for workout instances sourced from groups';
