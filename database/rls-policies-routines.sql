-- =====================================================
-- RLS POLICIES FOR ROUTINES
-- =====================================================
-- These policies enforce permissions at the database level
-- for template routines (is_standalone=true, plan_id=null, athlete_id=null)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "routines_select_policy" ON public.routines;
DROP POLICY IF EXISTS "routines_insert_policy" ON public.routines;
DROP POLICY IF EXISTS "routines_update_policy" ON public.routines;
DROP POLICY IF EXISTS "routines_delete_policy" ON public.routines;

-- Enable RLS on routines table
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SELECT Policy (Visibility)
-- =====================================================
CREATE POLICY "routines_select_policy"
ON public.routines
FOR SELECT
USING (
  -- Super admins can see all routines
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- STAFF: Check staff permissions for visibility (ONLY for templates)
  (
    routines.is_standalone = true
    AND routines.plan_id IS NULL
    AND routines.athlete_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.staff_permissions sp
      WHERE sp.staff_id = auth.uid()
      AND (
        (sp.routines_visibility = 'all')
        OR
        (sp.routines_visibility = 'own' AND routines.created_by = auth.uid())
        OR
        (
          sp.routines_visibility = 'own_and_admin'
          AND (
            routines.created_by = auth.uid()
            OR
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = routines.created_by
              AND p.app_role IN ('admin', 'super_admin')
            )
          )
        )
      )
    )
  )
  OR
  -- Non-template routines: accessible to staff (in workouts/plans)
  (
    (routines.is_standalone = false OR routines.plan_id IS NOT NULL OR routines.athlete_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.staff_permissions sp
      WHERE sp.staff_id = auth.uid()
    )
  )
);

-- =====================================================
-- INSERT Policy (Create)
-- =====================================================
CREATE POLICY "routines_insert_policy"
ON public.routines
FOR INSERT
WITH CHECK (
  -- Super admins can create any routine
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- Staff can create routines if they have create permission
  EXISTS (
    SELECT 1 FROM public.staff_permissions sp
    WHERE sp.staff_id = auth.uid()
    AND sp.can_create_routines = true
  )
);

-- =====================================================
-- UPDATE Policy (Edit)
-- =====================================================
CREATE POLICY "routines_update_policy"
ON public.routines
FOR UPDATE
USING (
  -- Super admins can update any routine
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- Template routines: check edit permissions
  (
    routines.is_standalone = true
    AND routines.plan_id IS NULL
    AND routines.athlete_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.staff_permissions sp
      WHERE sp.staff_id = auth.uid()
      AND (
        (routines.created_by = auth.uid() AND sp.can_edit_own_routines = true)
        OR
        (
          sp.can_edit_admin_routines = true
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = routines.created_by
            AND p.app_role IN ('admin', 'super_admin')
          )
        )
      )
    )
  )
  OR
  -- Non-template routines: staff can edit if they have general access
  (
    (routines.is_standalone = false OR routines.plan_id IS NOT NULL OR routines.athlete_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.staff_permissions sp
      WHERE sp.staff_id = auth.uid()
    )
  )
);

-- =====================================================
-- DELETE Policy
-- =====================================================
CREATE POLICY "routines_delete_policy"
ON public.routines
FOR DELETE
USING (
  -- Super admins can delete any routine
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role = 'super_admin'
  )
  OR
  -- Template routines: check delete permissions
  (
    routines.is_standalone = true
    AND routines.plan_id IS NULL
    AND routines.athlete_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.staff_permissions sp
      WHERE sp.staff_id = auth.uid()
      AND (
        (routines.created_by = auth.uid() AND sp.can_delete_own_routines = true)
        OR
        (
          sp.can_delete_admin_routines = true
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = routines.created_by
            AND p.app_role IN ('admin', 'super_admin')
          )
        )
      )
    )
  )
  OR
  -- Non-template routines: staff can delete if they have general access
  (
    (routines.is_standalone = false OR routines.plan_id IS NOT NULL OR routines.athlete_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.staff_permissions sp
      WHERE sp.staff_id = auth.uid()
    )
  )
);

-- =====================================================
-- NOTES
-- =====================================================
-- Template routines have strict permissions based on:
--   - routines_visibility (own, own_and_admin, all)
--   - can_create_routines
--   - can_edit_own_routines / can_edit_admin_routines
--   - can_delete_own_routines / can_delete_admin_routines
--
-- Non-template routines (in workouts/plans/assigned to athletes) are
-- accessible to all staff with basic permissions.
