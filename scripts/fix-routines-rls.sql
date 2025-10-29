-- Check current RLS policies on routines table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'routines';

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert routines for their plans" ON routines;
DROP POLICY IF EXISTS "Users can insert routines for their workouts" ON routines;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON routines;

-- Create new INSERT policy that allows:
-- 1. Inserting routines for plans they own
-- 2. Inserting routines for athlete workouts they have access to
CREATE POLICY "Allow insert routines for plans and athletes"
ON routines
FOR INSERT
WITH CHECK (
  -- Allow if it's for a plan the user owns
  (plan_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM plans WHERE plans.id = routines.plan_id AND plans.created_by = auth.uid()
  ))
  OR
  -- Allow if it's for an athlete workout
  (athlete_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM athletes WHERE athletes.id = routines.athlete_id
  ))
  OR
  -- Allow if it's for a workout in a plan the user owns
  (workout_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workouts
    JOIN plans ON workouts.plan_id = plans.id
    WHERE workouts.id = routines.workout_id AND plans.created_by = auth.uid()
  ))
  OR
  -- Allow if it's for a workout assigned to an athlete
  (workout_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = routines.workout_id AND workouts.athlete_id IS NOT NULL
  ))
);

-- Verify the policy was created
SELECT policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'routines' AND cmd = 'INSERT';
