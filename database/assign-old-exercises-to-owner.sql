-- ============================================================================
-- ASSIGN OLD EXERCISES TO SUPER ADMIN (OWNER)
-- ============================================================================
-- This script updates all exercises with NULL created_by to assign them
-- to the super_admin account (Max DiTondo)
-- 
-- This ensures old/legacy exercises are treated as master exercises
-- created by the owner that can be shared with staff via permissions
-- ============================================================================

-- Find the super_admin user ID
-- Expected: Max DiTondo (info@atlanticperformancetraining.com)
DO $$
DECLARE
  super_admin_id uuid;
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
  RAISE NOTICE 'Assigning old exercises to super_admin: %', super_admin_id;

  -- Update all exercises with NULL created_by
  UPDATE public.exercises
  SET created_by = super_admin_id
  WHERE created_by IS NULL;

  -- Show results
  RAISE NOTICE 'Updated % exercises', (SELECT COUNT(*) FROM public.exercises WHERE created_by = super_admin_id);
END $$;

-- Verify the update
SELECT 
  COUNT(*) as total_exercises,
  COUNT(created_by) as exercises_with_creator,
  COUNT(*) - COUNT(created_by) as exercises_without_creator
FROM public.exercises
WHERE is_active = true;

-- Show exercises by creator
SELECT 
  COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') as creator_name,
  p.app_role,
  COUNT(e.id) as exercise_count
FROM public.exercises e
LEFT JOIN public.profiles p ON e.created_by = p.id
WHERE e.is_active = true
GROUP BY p.first_name, p.last_name, p.app_role
ORDER BY exercise_count DESC;
