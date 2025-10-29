-- =====================================================
-- RLS Policies for Workouts - Plan Visibility Fix
-- =====================================================
-- This updates the SELECT policy to allow staff to see workouts
-- that are part of plans they have access to, regardless of
-- workout visibility permissions.
--
-- Key Change: Workouts with plan_id should be visible to anyone
-- who can see that plan, not restricted by workouts_visibility.

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "workouts_select_policy" ON public.workouts;

-- Create updated SELECT policy
CREATE POLICY "workouts_select_policy"
ON public.workouts
FOR SELECT
USING (
  -- Super admins can see ALL workouts
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- Workouts that belong to a PLAN: visible to anyone who can see that plan
  -- (plan permissions take precedence over workout permissions)
  (
    workouts.plan_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.staff_permissions sp
      WHERE sp.staff_id = auth.uid()
      AND (
        -- Can see all plans
        (sp.plans_visibility = 'all')
        OR
        -- Can see own plans + this workout is in user's plan
        (sp.plans_visibility = 'own' AND EXISTS (
          SELECT 1 FROM public.training_plans tp
          WHERE tp.id = workouts.plan_id
          AND tp.created_by = auth.uid()
        ))
        OR
        -- Can see own + admin plans + this workout is in admin's plan
        (sp.plans_visibility = 'own_and_admin' AND EXISTS (
          SELECT 1 FROM public.training_plans tp
          JOIN public.profiles p ON p.id = tp.created_by
          WHERE tp.id = workouts.plan_id
          AND (tp.created_by = auth.uid() OR p.app_role IN ('admin', 'super_admin'))
        ))
      )
    )
  )
  OR
  -- Template workouts (is_template=true, no plan_id, no athlete_id):
  -- Apply workouts_visibility permissions
  (
    workouts.is_template = true
    AND workouts.plan_id IS NULL
    AND workouts.athlete_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.staff_permissions sp
      WHERE sp.staff_id = auth.uid()
      AND (
        -- Can see all workouts
        (sp.workouts_visibility = 'all')
        OR
        -- Can see only own workouts
        (sp.workouts_visibility = 'own' AND workouts.created_by = auth.uid())
        OR
        -- Can see own + admin/super_admin workouts
        (
          sp.workouts_visibility = 'own_and_admin'
          AND (
            workouts.created_by = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = workouts.created_by
              AND p.app_role IN ('admin', 'super_admin')
            )
          )
        )
      )
    )
  )
  OR
  -- Athlete-assigned workouts: visible to athlete AND all staff
  (
    workouts.athlete_id IS NOT NULL
    AND (
      -- Athlete can see their own workouts
      workouts.athlete_id IN (
        SELECT id FROM public.athletes WHERE user_id = auth.uid()
      )
      OR
      -- Staff can see all athlete workouts
      EXISTS (
        SELECT 1 FROM public.staff_permissions sp
        WHERE sp.staff_id = auth.uid()
      )
    )
  )
);

-- =====================================================
-- Summary of Changes
-- =====================================================
-- BEFORE: All workouts with plan_id were restricted by workouts_visibility
-- AFTER: Workouts with plan_id are visible based on plans_visibility instead
--
-- This means:
-- - If a workout is in a plan, plan permissions control visibility
-- - If a workout is a template (no plan), workout permissions control visibility
-- - If a workout is assigned to an athlete, athlete visibility controls access
--
-- Example: Coach with workouts_visibility='own' can now see ALL workouts
-- in plans they have access to, even if those workouts were created by others.
