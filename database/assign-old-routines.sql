-- =====================================================
-- ASSIGN CREATED_BY TO EXISTING ROUTINES
-- =====================================================
-- This script assigns the super_admin (Max Ditondo) as the creator
-- of all existing routines that don't have a creator set.
-- Run this ONCE after implementing routines permissions.

-- Step 1: Find the super_admin user ID
-- (Replace this with your actual super_admin user ID if different)
DO $$
DECLARE
  super_admin_id UUID;
BEGIN
  -- Get the super_admin user ID
  SELECT id INTO super_admin_id
  FROM profiles
  WHERE app_role = 'super_admin'
  LIMIT 1;

  IF super_admin_id IS NULL THEN
    RAISE NOTICE 'No super_admin found. Please check your profiles table.';
  ELSE
    RAISE NOTICE 'Found super_admin ID: %', super_admin_id;

    -- Update all routines without a creator
    UPDATE routines
    SET created_by = super_admin_id,
        updated_at = NOW()
    WHERE created_by IS NULL;

    RAISE NOTICE 'Updated % routines', (SELECT COUNT(*) FROM routines WHERE created_by = super_admin_id);
  END IF;
END $$;

-- Verify the update
SELECT
  COUNT(*) as total_routines,
  COUNT(created_by) as routines_with_creator,
  COUNT(*) - COUNT(created_by) as routines_without_creator
FROM routines;

-- Show routines by creator
SELECT
  p.first_name || ' ' || p.last_name as creator_name,
  p.app_role,
  COUNT(r.id) as routine_count
FROM routines r
LEFT JOIN profiles p ON p.id = r.created_by
WHERE r.is_standalone = true
GROUP BY p.id, p.first_name, p.last_name, p.app_role
ORDER BY routine_count DESC;
