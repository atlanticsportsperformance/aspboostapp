# Workouts Permissions - Implementation Complete ✅

**Date**: 2025-01-29
**Status**: ✅ COMPLETE - Frontend + RLS Ready

---

## Summary

The Workouts feature now has **FULL permissions enforcement** at both the UI level and database level.

This implementation follows the same proven pattern as Exercises permissions.

---

## What Was Implemented

### 1. Frontend Permissions (✅ Complete)

**File Modified**: [app/dashboard/workouts/page.tsx](../app/dashboard/workouts/page.tsx)

#### Features Added:

1. **User Authentication & Role Detection**
   - Fetches current user ID and role on page load
   - Uses `useStaffPermissions()` hook to get permissions

2. **Visibility Filtering**
   - Filters workouts query based on `workouts_visibility` setting:
     - **"all"** → Shows all workouts from everyone
     - **"own"** → Shows only workouts created by current user
     - **"own_and_admin"** → Shows user's workouts + admin/super_admin-created workouts
   - Filtering happens at query level for performance

3. **Create Button Permission**
   - "+ Create Workout" button only visible if:
     - User is super_admin, OR
     - `can_create_workouts` permission is true

4. **Duplicate Button Permission**
   - Duplicate button only visible if:
     - User is super_admin, OR
     - `can_create_workouts` permission is true
   - (Duplicating = creating a new workout)

5. **Delete Button Permission (per workout)**
   - Delete button only visible if:
     - User created the workout AND `can_delete_own_workouts` is true, OR
     - Workout was created by admin/super_admin AND `can_delete_admin_workouts` is true
   - Cannot delete other coaches' workouts

6. **Performance Optimization**
   - Permissions for all workouts are computed once after loading
   - Cached in `workoutPermissions` state object
   - Batch query reduces N queries to 1 query
   - No repeated permission checks on render

---

### 2. Database Permissions (📄 RLS Script Ready)

**File Created**: [database/rls-policies-workouts.sql](../database/rls-policies-workouts.sql)

#### Policies Created:

1. **SELECT Policy** (`workouts_select_policy`)
   - **For TEMPLATES** (is_template=true): Enforces visibility based on "workouts_visibility" permission
   - **For ATHLETES**: Can view workouts assigned to them (athlete_id = their ID)
   - **For STAFF**: Can view all athlete-assigned workouts if they have `can_view_athletes` permission
   - Prevents unauthorized data from even reaching the client

2. **INSERT Policy** (`workouts_insert_policy`)
   - Only allows INSERT if `can_create_workouts` is true
   - Super admins bypass this check

3. **UPDATE Policy** (`workouts_update_policy`)
   - **For TEMPLATES**: Only allows UPDATE based on ownership and permissions (`can_edit_own_workouts`, `can_edit_admin_workouts`)
   - **For ATHLETE WORKOUTS**: Staff with `can_view_athletes` can update athlete-assigned workouts
   - **IMPORTANT**: Athletes do NOT have UPDATE permission on workouts table - they only log exercises via `exercise_logs` table

4. **DELETE Policy** (`workouts_delete_policy`)
   - **IMPORTANT**: Only template workouts can be deleted!
   - **For TEMPLATES**: Only allows DELETE based on ownership and permissions (`can_delete_own_workouts`, `can_delete_admin_workouts`)
   - **For ATHLETE WORKOUTS**: Cannot be deleted by anyone except super_admin (prevents accidental data loss)

---

## Permission Matrix

| Permission | Effect |
|------------|--------|
| `workouts_visibility: "all"` | User sees ALL workouts in the list |
| `workouts_visibility: "own"` | User sees ONLY their own workouts |
| `workouts_visibility: "own_and_admin"` | User sees their own + admin/super_admin workouts |
| `can_create_workouts: true` | "+ Create Workout" button is visible |
| `can_create_workouts: false` | "+ Create Workout" button is hidden |
| `can_edit_own_workouts: true` | Can edit user's own workouts |
| `can_edit_admin_workouts: true` | Can edit admin/super_admin workouts |
| `can_delete_own_workouts: true` | Delete button shows on user's own workouts |
| `can_delete_admin_workouts: true` | Delete button shows on admin/super_admin workouts |

---

## Deployment Steps

### Step 1: Assign Old Workouts to Owner (REQUIRED FIRST!)

Old workouts may have `NULL` in the `created_by` field. This will break RLS policies.

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open [database/assign-old-workouts-to-owner.sql](../database/assign-old-workouts-to-owner.sql)
3. Copy the entire script
4. Paste into SQL Editor
5. Click **Run**
6. Verify output shows workouts were updated

### Step 2: Deploy RLS Policies

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open [database/rls-policies-workouts.sql](../database/rls-policies-workouts.sql)
3. Copy the entire script
4. Paste into SQL Editor
5. Click **Run**
6. Verify in **Database** → **Policies** that 4 NEW policies exist for `workouts` table
   - Old policies will be dropped automatically
   - New policies: `workouts_select_policy`, `workouts_insert_policy`, `workouts_update_policy`, `workouts_delete_policy`

---

## Testing Checklist

### Test as Super Admin:
- [ ] Can see ALL workouts (regardless of creator)
- [ ] Can see "+ Create Workout" button
- [ ] Can see Duplicate button on ALL workouts
- [ ] Can see Delete button on ALL workouts

### Test as Admin with Full Permissions:
- [ ] Visibility "all": Can see all workouts
- [ ] Visibility "own_and_admin": Can see own + other admins'/super_admin's workouts
- [ ] Visibility "own": Can see only own workouts
- [ ] Can create workouts (if permission enabled)
- [ ] Can duplicate workouts (if can_create_workouts enabled)
- [ ] Can delete own workouts (if permission enabled)
- [ ] Can delete admin/super_admin workouts (if permission enabled)

### Test as Coach with Restricted Permissions:
- [ ] Visibility "own": Only sees own workouts
- [ ] Cannot see "+ Create Workout" button (if permission disabled)
- [ ] Cannot see Duplicate button (if can_create_workouts disabled)
- [ ] Cannot see Delete button on other coaches' workouts
- [ ] Can only delete own workouts (if permissions enabled)

### Test as Coach with NO Permissions:
- [ ] List is empty (visibility: "own" with no created workouts)
- [ ] No "+ Create Workout" button
- [ ] No Duplicate buttons
- [ ] No Delete buttons

---

## Performance Considerations

1. **Query Filtering**: Visibility filtering happens at the database level using `WHERE created_by IN (...)`, which is indexed and fast

2. **Permission Caching**: After loading workouts, we compute all permissions ONCE and cache them in state. This prevents repeated async calls on every render.

3. **Batch Queries**: Reduced N+1 query problem from O(n) to O(1) by fetching all creator roles in a single batch query

4. **Indexed Columns**: Assumes `created_by` is indexed on workouts table for fast filtering

---

## Key Protection: Athlete-Assigned Workouts

**IMPORTANT**: The RLS policies distinguish between:

1. **Template Workouts** (`is_template = true`, `athlete_id = NULL`)
   - These are in the Workout Library
   - Staff permissions control who can view/edit/delete these
   - Visibility setting applies here

2. **Athlete-Assigned Workouts** (`is_template = false` OR `athlete_id != NULL`)
   - These are workouts assigned to athletes via plans or calendar
   - Athletes can VIEW their own workouts (read-only in workouts table)
   - Athletes LOG exercises via the `exercise_logs` table (separate from workouts table)
   - Staff with `can_view_athletes` can VIEW and UPDATE any athlete workout structure
   - **CANNOT be deleted** by staff (only super_admin can delete)
   - Not affected by "workouts_visibility" permission

This separation ensures:
- ✅ Staff can manage the workout library based on permissions
- ✅ Athletes can view and log their workouts (logging goes to exercise_logs table)
- ✅ Staff can monitor and adjust athlete workout structures
- ✅ Athlete workout data is protected from accidental deletion
- ✅ Athletes cannot accidentally edit workout structures (sets, reps, exercises)

---

## Architecture Notes

### Why No API Routes?

Workouts use **direct Supabase queries** from the client, not API routes. This is common in Supabase applications because:

1. **Supabase handles authentication** via JWT tokens
2. **RLS policies provide backend protection** at the database level
3. **No need for middleware** - the database IS the middleware

This is actually **MORE secure** than API routes because:
- Policies are enforced even if someone bypasses the UI
- Policies are tested and maintained in one place (database)
- No way to circumvent permissions by calling a different endpoint

---

## Files Modified

- ✅ [app/dashboard/workouts/page.tsx](../app/dashboard/workouts/page.tsx) - Added full permissions logic
- ✅ [database/rls-policies-workouts.sql](../database/rls-policies-workouts.sql) - Created RLS policies script
- ✅ [database/assign-old-workouts-to-owner.sql](../database/assign-old-workouts-to-owner.sql) - Script to assign NULL creators
- ✅ [database/check-workout-creators.sql](../database/check-workout-creators.sql) - Query to check workout creators
- ✅ [docs/WORKOUTS_PERMISSIONS_COMPLETE.md](../docs/WORKOUTS_PERMISSIONS_COMPLETE.md) - This documentation

---

## Next Steps

Apply the same pattern to:

1. **Routines** (same permissions structure as Exercises/Workouts)
2. **Plans** (same permissions structure as Exercises/Workouts)
3. **Athletes** (different visibility model: "assigned" vs "all")
4. **Groups** (different visibility model: "own", "assigned", "all")
5. **Staff** (different permissions: `can_view_staff`, `can_manage_staff`)

---

## Questions?

If you encounter issues:

1. Check the browser console for permission errors
2. Verify user has a `staff_permissions` record in the database
3. Verify RLS policies are enabled: `ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;`
4. Check policy logic in Supabase Dashboard → Policies
5. Test with different users to isolate permission issues
6. Ensure old workouts have `created_by` set (run assign script)

---

**Status**: ✅ Ready for Testing & Deployment
