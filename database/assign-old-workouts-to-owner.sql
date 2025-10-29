-- =============================================================================
-- ASSIGN OLD WORKOUTS TO SUPER ADMIN
-- =============================================================================
-- This script assigns all workouts with NULL created_by to the super_admin user.
-- This ensures all workouts have a creator for RLS policies to work correctly.
--
-- RUN THIS BEFORE deploying RLS policies!
-- =============================================================================

DO $$
DECLARE
  super_admin_id uuid;
  updated_count integer;
BEGIN
  -- Get the super_admin user ID
  SELECT id INTO super_admin_id
  FROM public.profiles
  WHERE app_role = 'super_admin'
  LIMIT 1;

  -- Verify we found a super_admin
  IF super_admin_id IS NULL THEN
    RAISE EXCEPTION 'No super_admin found in profiles table!';
  END IF;

  -- Show who we're assigning to
  RAISE NOTICE 'Assigning old workouts to super_admin: %', super_admin_id;

  -- Update all workouts with NULL created_by
  UPDATE public.workouts
  SET created_by = super_admin_id
  WHERE created_by IS NULL;

  -- Get the count of updated rows
  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Show results
  RAISE NOTICE 'Updated % workouts', updated_count;
END $$;

-- Verify the update
SELECT
  COUNT(*) as total_workouts,
  COUNT(created_by) as workouts_with_creator,
  COUNT(*) - COUNT(created_by) as workouts_without_creator
FROM public.workouts;

-- Show workouts by creator
SELECT
  COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') as creator_name,
  p.app_role,
  COUNT(w.id) as workout_count
FROM public.workouts w
LEFT JOIN public.profiles p ON w.created_by = p.id
GROUP BY p.first_name, p.last_name, p.app_role
ORDER BY workout_count DESC;
