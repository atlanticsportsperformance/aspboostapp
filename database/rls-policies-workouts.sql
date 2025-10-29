-- =============================================================================
-- WORKOUTS RLS POLICIES
-- =============================================================================
-- This script creates Row Level Security policies for the workouts table
-- to enforce permissions at the database level.
--
-- Permissions Enforced:
-- - workouts_visibility: 'all' | 'own' | 'own_and_admin'
-- - can_create_workouts: boolean
-- - can_edit_own_workouts: boolean
-- - can_edit_admin_workouts: boolean
-- - can_delete_own_workouts: boolean
-- - can_delete_admin_workouts: boolean
--
-- DEPLOY INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy this entire script
-- 3. Paste and click "Run"
-- 4. Verify in Database → Policies that 4 policies exist for workouts table
-- =============================================================================

-- Drop ALL existing policies (old and new)
DROP POLICY IF EXISTS "Athletes can update their workouts" ON public.workouts;
DROP POLICY IF EXISTS "Athletes can view their workouts" ON public.workouts;
DROP POLICY IF EXISTS "Staff can manage workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can create workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can view all workouts" ON public.workouts;
DROP POLICY IF EXISTS "workouts_select_policy" ON public.workouts;
DROP POLICY IF EXISTS "workouts_insert_policy" ON public.workouts;
DROP POLICY IF EXISTS "workouts_update_policy" ON public.workouts;
DROP POLICY IF EXISTS "workouts_delete_policy" ON public.workouts;

-- Enable RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SELECT Policy (Visibility)
-- =============================================================================
CREATE POLICY "workouts_select_policy"
ON public.workouts
FOR SELECT
USING (
  -- Super admins can see all workouts
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- ATHLETES: Can view workouts assigned to them
  (
    workouts.athlete_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.app_role = 'athlete'
    )
  )
  OR
  -- STAFF: Check staff permissions for visibility (ONLY for templates: is_template=true)
  (
    workouts.is_template = true
    AND EXISTS (
      SELECT 1 FROM public.staff_permissions sp
      WHERE sp.staff_id = auth.uid()
      AND (
        -- "all" visibility: see all template workouts
        (sp.workouts_visibility = 'all')
        OR
        -- "own" visibility: see only own template workouts
        (sp.workouts_visibility = 'own' AND workouts.created_by = auth.uid())
        OR
        -- "own_and_admin" visibility: see own + admin/super_admin template workouts
        (
          sp.workouts_visibility = 'own_and_admin'
          AND (
            workouts.created_by = auth.uid()
            OR
            EXISTS (
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
  -- STAFF: Can view workouts assigned to athletes (all staff can view athlete workouts)
  (
    workouts.athlete_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.staff_permissions sp
      WHERE sp.staff_id = auth.uid()
    )
  )
);

-- =============================================================================
-- INSERT Policy (Create Permission)
-- =============================================================================
CREATE POLICY "workouts_insert_policy"
ON public.workouts
FOR INSERT
WITH CHECK (
  -- Super admins can always create
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- Check can_create_workouts permission
  EXISTS (
    SELECT 1 FROM public.staff_permissions sp
    WHERE sp.staff_id = auth.uid()
    AND sp.can_create_workouts = true
  )
);

-- =============================================================================
-- UPDATE Policy (Edit Permission)
-- =============================================================================
CREATE POLICY "workouts_update_policy"
ON public.workouts
FOR UPDATE
USING (
  -- Super admins can always edit
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- STAFF: Check edit permissions based on ownership (ONLY for templates)
  (
    workouts.is_template = true
    AND EXISTS (
      SELECT 1 FROM public.staff_permissions sp
      WHERE sp.staff_id = auth.uid()
      AND (
        -- Can edit own template workouts
        (workouts.created_by = auth.uid() AND sp.can_edit_own_workouts = true)
        OR
        -- Can edit admin/super_admin template workouts
        (
          sp.can_edit_admin_workouts = true
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = workouts.created_by
            AND p.app_role IN ('admin', 'super_admin')
          )
        )
      )
    )
  )
  OR
  -- STAFF: Can update athlete-assigned workouts (all staff can edit athlete workouts)
  (
    workouts.athlete_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.staff_permissions sp
      WHERE sp.staff_id = auth.uid()
    )
  )
);

-- =============================================================================
-- DELETE Policy (Delete Permission)
-- =============================================================================
CREATE POLICY "workouts_delete_policy"
ON public.workouts
FOR DELETE
USING (
  -- Super admins can always delete
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- STAFF: Check delete permissions based on ownership (ONLY for templates)
  -- NOTE: Athletes and staff CANNOT delete athlete-assigned workouts
  (
    workouts.is_template = true
    AND EXISTS (
      SELECT 1 FROM public.staff_permissions sp
      WHERE sp.staff_id = auth.uid()
      AND (
        -- Can delete own template workouts
        (workouts.created_by = auth.uid() AND sp.can_delete_own_workouts = true)
        OR
        -- Can delete admin/super_admin template workouts
        (
          sp.can_delete_admin_workouts = true
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = workouts.created_by
            AND p.app_role IN ('admin', 'super_admin')
          )
        )
      )
    )
  )
);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Run this query to verify policies were created:
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'workouts'
ORDER BY policyname;

-- Expected output: 4 policies
-- - workouts_select_policy
-- - workouts_insert_policy
-- - workouts_update_policy
-- - workouts_delete_policy
