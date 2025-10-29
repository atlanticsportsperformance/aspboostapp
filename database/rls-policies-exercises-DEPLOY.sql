-- ============================================================================
-- RLS POLICIES FOR EXERCISES TABLE - DEPLOYMENT SCRIPT
-- ============================================================================
-- This script DROPS existing policies and recreates them with new logic
-- Safe to run multiple times
-- ============================================================================

-- Drop existing policies if they exist (ignore errors if they don't exist)
DROP POLICY IF EXISTS "exercises_select_policy" ON public.exercises;
DROP POLICY IF EXISTS "exercises_insert_policy" ON public.exercises;
DROP POLICY IF EXISTS "exercises_update_policy" ON public.exercises;
DROP POLICY IF EXISTS "exercises_delete_policy" ON public.exercises;

-- Enable RLS on exercises table (does nothing if already enabled)
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT POLICIES (Visibility)
-- ============================================================================

-- Policy: Allow users to SELECT exercises based on their visibility settings
CREATE POLICY "exercises_select_policy"
ON public.exercises
FOR SELECT
USING (
  -- Super admins can see all exercises
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- Check staff permissions for visibility
  EXISTS (
    SELECT 1 FROM public.staff_permissions sp
    WHERE sp.staff_id = auth.uid()
    AND (
      -- "See All" visibility
      (sp.exercises_visibility = 'all')
      OR
      -- "See Their Own" visibility
      (sp.exercises_visibility = 'own' AND exercises.created_by = auth.uid())
      OR
      -- "See Their Own + Admin" visibility
      (
        sp.exercises_visibility = 'own_and_admin'
        AND (
          exercises.created_by = auth.uid()
          OR
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = exercises.created_by
            AND p.app_role = 'admin'
          )
        )
      )
    )
  )
);

-- ============================================================================
-- INSERT POLICIES (Create)
-- ============================================================================

-- Policy: Allow users to INSERT exercises if they have can_create_exercises permission
CREATE POLICY "exercises_insert_policy"
ON public.exercises
FOR INSERT
WITH CHECK (
  -- Super admins can create exercises
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- Check staff permissions for create
  EXISTS (
    SELECT 1 FROM public.staff_permissions sp
    WHERE sp.staff_id = auth.uid()
    AND sp.can_create_exercises = true
  )
);

-- ============================================================================
-- UPDATE POLICIES (Edit)
-- ============================================================================

-- Policy: Allow users to UPDATE exercises based on ownership and permissions
CREATE POLICY "exercises_update_policy"
ON public.exercises
FOR UPDATE
USING (
  -- Super admins can edit all exercises
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- Check staff permissions for edit
  EXISTS (
    SELECT 1 FROM public.staff_permissions sp
    WHERE sp.staff_id = auth.uid()
    AND (
      -- Can edit their own exercises
      (exercises.created_by = auth.uid() AND sp.can_edit_own_exercises = true)
      OR
      -- Can edit admin exercises
      (
        sp.can_edit_admin_exercises = true
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = exercises.created_by
          AND p.app_role = 'admin'
        )
      )
    )
  )
);

-- ============================================================================
-- DELETE POLICIES (Delete/Soft Delete)
-- ============================================================================

-- Policy: Allow users to DELETE exercises based on ownership and permissions
-- Note: In practice, exercises are soft-deleted (is_active = false) via UPDATE
-- This policy covers hard deletes if ever used
CREATE POLICY "exercises_delete_policy"
ON public.exercises
FOR DELETE
USING (
  -- Super admins can delete all exercises
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- Check staff permissions for delete
  EXISTS (
    SELECT 1 FROM public.staff_permissions sp
    WHERE sp.staff_id = auth.uid()
    AND (
      -- Can delete their own exercises
      (exercises.created_by = auth.uid() AND sp.can_delete_own_exercises = true)
      OR
      -- Can delete admin exercises
      (
        sp.can_delete_admin_exercises = true
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = exercises.created_by
          AND p.app_role = 'admin'
        )
      )
    )
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify policies were created:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'exercises';
