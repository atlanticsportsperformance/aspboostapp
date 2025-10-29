-- =====================================================
-- RLS Policies for Training Plans
-- =====================================================
-- This file sets up Row Level Security policies for the training_plans table
-- following the permissions model defined in staff_permissions.

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "plans_select_policy" ON public.training_plans;
DROP POLICY IF EXISTS "plans_insert_policy" ON public.training_plans;
DROP POLICY IF EXISTS "plans_update_policy" ON public.training_plans;
DROP POLICY IF EXISTS "plans_delete_policy" ON public.training_plans;

-- Enable RLS on training_plans table
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SELECT Policy (Visibility)
-- =====================================================
-- Users can see plans based on their plans_visibility setting:
-- - 'all': See all plans
-- - 'own': See only their own plans
-- - 'own_and_admin': See their own plans + plans created by admins/super_admins
-- Super admins always see all plans

CREATE POLICY "plans_select_policy"
ON public.training_plans
FOR SELECT
USING (
  -- Super admins can see all plans
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- Staff can see plans based on their visibility settings
  EXISTS (
    SELECT 1 FROM public.staff_permissions sp
    WHERE sp.staff_id = auth.uid()
    AND (
      -- Can see all plans
      (sp.plans_visibility = 'all')
      OR
      -- Can see only own plans
      (sp.plans_visibility = 'own' AND training_plans.created_by = auth.uid())
      OR
      -- Can see own plans + admin/super_admin plans
      (
        sp.plans_visibility = 'own_and_admin'
        AND (
          training_plans.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = training_plans.created_by
            AND p.app_role IN ('admin', 'super_admin')
          )
        )
      )
    )
  )
);

-- =====================================================
-- INSERT Policy (Create Plans)
-- =====================================================
-- Users can create plans if they have can_create_plans permission
-- Super admins can always create plans

CREATE POLICY "plans_insert_policy"
ON public.training_plans
FOR INSERT
WITH CHECK (
  -- Super admins can always create plans
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- Staff can create if they have permission
  EXISTS (
    SELECT 1 FROM public.staff_permissions sp
    WHERE sp.staff_id = auth.uid()
    AND sp.can_create_plans = true
  )
);

-- =====================================================
-- UPDATE Policy (Edit Plans)
-- =====================================================
-- Users can edit plans based on:
-- - can_edit_own_plans: Edit their own plans
-- - can_edit_admin_plans: Edit plans created by admins/super_admins
-- Super admins can edit all plans

CREATE POLICY "plans_update_policy"
ON public.training_plans
FOR UPDATE
USING (
  -- Super admins can edit all plans
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- Staff can edit based on their permissions
  EXISTS (
    SELECT 1 FROM public.staff_permissions sp
    WHERE sp.staff_id = auth.uid()
    AND (
      -- Can edit own plans
      (
        training_plans.created_by = auth.uid()
        AND sp.can_edit_own_plans = true
      )
      OR
      -- Can edit admin/super_admin plans
      (
        sp.can_edit_admin_plans = true
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = training_plans.created_by
          AND p.app_role IN ('admin', 'super_admin')
        )
      )
    )
  )
);

-- =====================================================
-- DELETE Policy (Delete Plans)
-- =====================================================
-- Users can delete plans based on:
-- - can_delete_own_plans: Delete their own plans
-- - can_delete_admin_plans: Delete plans created by admins/super_admins
-- Super admins can delete all plans

CREATE POLICY "plans_delete_policy"
ON public.training_plans
FOR DELETE
USING (
  -- Super admins can delete all plans
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- Staff can delete based on their permissions
  EXISTS (
    SELECT 1 FROM public.staff_permissions sp
    WHERE sp.staff_id = auth.uid()
    AND (
      -- Can delete own plans
      (
        training_plans.created_by = auth.uid()
        AND sp.can_delete_own_plans = true
      )
      OR
      -- Can delete admin/super_admin plans
      (
        sp.can_delete_admin_plans = true
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = training_plans.created_by
          AND p.app_role IN ('admin', 'super_admin')
        )
      )
    )
  )
);

-- =====================================================
-- Summary of Policies
-- =====================================================
-- SELECT: Based on plans_visibility (all/own/own_and_admin)
-- INSERT: Based on can_create_plans
-- UPDATE: Based on can_edit_own_plans / can_edit_admin_plans
-- DELETE: Based on can_delete_own_plans / can_delete_admin_plans
-- Super admins: Always have full access to all plans
