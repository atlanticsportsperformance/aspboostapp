-- Check if any workouts have NULL created_by
SELECT
  COUNT(*) as total_workouts,
  COUNT(created_by) as workouts_with_creator,
  COUNT(*) - COUNT(created_by) as workouts_without_creator
FROM public.workouts
WHERE is_template = true;

-- Show workouts without creators
SELECT
  id,
  name,
  created_at,
  is_template
FROM public.workouts
WHERE created_by IS NULL
  AND is_template = true
ORDER BY created_at DESC;

-- Show workouts by creator
SELECT
  COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') as creator_name,
  p.app_role,
  COUNT(w.id) as workout_count
FROM public.workouts w
LEFT JOIN public.profiles p ON w.created_by = p.id
WHERE w.is_template = true
GROUP BY p.first_name, p.last_name, p.app_role
ORDER BY workout_count DESC;
