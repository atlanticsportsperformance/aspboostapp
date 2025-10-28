# Permissions System Implementation Roadmap

**Status**: Database & UI Complete | Frontend Implementation Pending
**Last Updated**: 2025-10-27

---

## 📊 Current State

### ✅ What's Complete:
- **Database**: 45+ permission columns in `staff_permissions` table
- **UI**: Full permission editor with 2-column layout showing all permissions
- **Library**: Permission checking functions in `lib/auth/permissions.ts`
- **Super Admin**: Account created (info@atlanticperformancetraining.com) with all permissions

### ❌ What's NOT Connected:
- **UI Buttons**: All "Add/Create/Edit/Delete" buttons show for everyone
- **API Routes**: No permission validation in backend
- **Content Filtering**: Everyone sees all content regardless of visibility settings
- **Navigation**: All nav items visible to everyone

---

## 🎯 Implementation Checklist

## 1. EXERCISES

### Pages/Components to Update:
- `app/dashboard/exercises/page.tsx`
- `components/dashboard/exercises/create-exercise-dialog.tsx`
- `components/dashboard/exercises/exercise-card.tsx` (edit/delete buttons)

### Permissions to Check:
- ✅ `can_create_exercises` - Hide "Add Exercise" button if false
- ✅ `can_edit_own_exercises` - Hide edit button on user's own exercises if false
- ✅ `can_edit_admin_exercises` - Hide edit button on admin exercises if false
- ✅ `can_delete_own_exercises` - Hide delete button on user's own exercises if false
- ✅ `can_delete_admin_exercises` - Hide delete button on admin exercises if false
- ✅ `exercises_visibility` - Filter exercises list by visibility setting

### Implementation Steps:
```typescript
// 1. In exercises page - Hide "Add Exercise" button
const { permissions, userRole } = useStaffPermissions(userId);
const canCreate = await canCreateContent(userId, userRole, 'exercises');

{canCreate && (
  <button onClick={openCreateDialog}>Add Exercise</button>
)}

// 2. Filter exercises list by visibility
const filter = await getContentFilter(userId, userRole, 'exercises');
if (filter.filter === 'all') {
  // Show all exercises
} else {
  // Filter by creatorIds: filter.creatorIds
}

// 3. Check edit permission for each exercise
const canEdit = await canEditContent(userId, userRole, 'exercises', exercise.created_by);
{canEdit && <button>Edit</button>}

// 4. Check delete permission for each exercise
const canDelete = await canDeleteContent(userId, userRole, 'exercises', exercise.created_by);
{canDelete && <button>Delete</button>}
```

### API Routes to Protect:
- `app/api/exercises/create/route.ts` - Check `can_create_exercises`
- `app/api/exercises/[id]/update/route.ts` - Check `can_edit_own_exercises` or `can_edit_admin_exercises`
- `app/api/exercises/[id]/delete/route.ts` - Check `can_delete_own_exercises` or `can_delete_admin_exercises`

---

## 2. WORKOUTS

### Pages/Components to Update:
- `app/dashboard/workouts/page.tsx`
- `components/dashboard/workouts/create-workout-dialog.tsx`
- `components/dashboard/workouts/workout-card.tsx`

### Permissions to Check:
- ✅ `can_create_workouts` - Hide "Add Workout" button
- ✅ `can_edit_own_workouts` - Hide edit button on own workouts
- ✅ `can_edit_admin_workouts` - Hide edit button on admin workouts
- ✅ `can_delete_own_workouts` - Hide delete button on own workouts
- ✅ `can_delete_admin_workouts` - Hide delete button on admin workouts
- ✅ `workouts_visibility` - Filter workouts list

### Implementation Steps:
Same pattern as exercises (replace 'exercises' with 'workouts')

### API Routes to Protect:
- `app/api/workouts/create/route.ts`
- `app/api/workouts/[id]/update/route.ts`
- `app/api/workouts/[id]/delete/route.ts`

---

## 3. ROUTINES

### Pages/Components to Update:
- `app/dashboard/routines/page.tsx`
- `components/dashboard/routines/create-routine-dialog.tsx`
- `components/dashboard/routines/routine-card.tsx`

### Permissions to Check:
- ✅ `can_create_routines`
- ✅ `can_edit_own_routines`
- ✅ `can_edit_admin_routines`
- ✅ `can_delete_own_routines`
- ✅ `can_delete_admin_routines`
- ✅ `routines_visibility`

### Implementation Steps:
Same pattern as exercises (replace 'exercises' with 'routines')

### API Routes to Protect:
- `app/api/routines/create/route.ts`
- `app/api/routines/[id]/update/route.ts`
- `app/api/routines/[id]/delete/route.ts`

---

## 4. PLANS

### Pages/Components to Update:
- `app/dashboard/plans/page.tsx`
- `components/dashboard/plans/create-plan-dialog.tsx`
- `components/dashboard/plans/plan-card.tsx`

### Permissions to Check:
- ✅ `can_create_plans`
- ✅ `can_edit_own_plans`
- ✅ `can_edit_admin_plans`
- ✅ `can_delete_own_plans`
- ✅ `can_delete_admin_plans`
- ✅ `plans_visibility`

### Implementation Steps:
Same pattern as exercises (replace 'exercises' with 'plans')

### API Routes to Protect:
- `app/api/plans/create/route.ts`
- `app/api/plans/[id]/update/route.ts`
- `app/api/plans/[id]/delete/route.ts`

---

## 5. ATHLETES

### Pages/Components to Update:
- `app/dashboard/athletes/page.tsx`
- `app/dashboard/athletes/[id]/page.tsx`
- `components/dashboard/athletes/add-athlete-modal.tsx`
- `components/dashboard/athletes/edit-athlete-profile-modal.tsx`
- `components/dashboard/athletes/athlete-coaches-section.tsx`

### Permissions to Check:
- ✅ `athletes_visibility` - Filter athletes list ('assigned' | 'all')
- ✅ `can_assign_coaches` - Hide coach assignment section if false
- ✅ `can_edit_athlete_profile` - Hide edit profile button if false
- ✅ `can_delete_athletes` - Hide delete athlete button if false

### Implementation Steps:
```typescript
// 1. Filter athletes list
const filter = await getAthleteFilter(userId, userRole);
if (filter.filter === 'all') {
  // Show all athletes
} else {
  // Filter by athleteIds: filter.athleteIds (only assigned)
}

// 2. Check if user can view specific athlete
const canView = await canViewAthlete(userId, userRole, athleteId);
if (!canView) {
  // Redirect or show 403
}

// 3. Hide coach assignment section
{permissions.can_assign_coaches && <CoachesSection />}

// 4. Hide edit profile button
{permissions.can_edit_athlete_profile && <button>Edit Profile</button>}

// 5. Hide delete button
{permissions.can_delete_athletes && <button>Delete Athlete</button>}
```

### API Routes to Protect:
- `app/api/athletes/create/route.ts` - Check if user can create athletes
- `app/api/athletes/[id]/update/route.ts` - Check `can_edit_athlete_profile`
- `app/api/athletes/[id]/delete/route.ts` - Check `can_delete_athletes`
- `app/api/athletes/[id]/assign-coach/route.ts` - Check `can_assign_coaches`

---

## 6. STAFF MANAGEMENT

### Pages/Components to Update:
- `app/dashboard/staff/page.tsx`
- `app/dashboard/staff/[id]/page.tsx`
- `components/dashboard/staff/add-staff-dialog.tsx`
- `components/dashboard/staff/staff-permissions-tab.tsx`
- Navigation sidebar

### Permissions to Check:
- ✅ `can_view_staff` - Hide "Staff" nav item if false
- ✅ `can_manage_staff` - Hide "Add Staff" button if false
- ✅ `can_view_all_staff` - Show only self if false
- ✅ `can_assign_permissions` - Hide "Permissions" tab if false (super_admin only)

### Implementation Steps:
```typescript
// 1. Hide Staff nav item
const canViewStaff = await canViewStaff(userId, userRole);
{canViewStaff && <NavLink href="/dashboard/staff">Staff</NavLink>}

// 2. Hide Add Staff button
const canManage = await canManageStaff(userId, userRole);
{canManage && <button>Add Staff</button>}

// 3. Filter staff list
if (!permissions.can_view_all_staff) {
  // Show only current user in staff list
  staffList = staffList.filter(s => s.user_id === userId);
}

// 4. Hide Permissions tab
const canAssign = await canAssignPermissions(userId, userRole);
{canAssign && <Tab>Permissions</Tab>}
```

### API Routes to Protect:
- `app/api/staff/create/route.ts` - Check `can_manage_staff`
- `app/api/staff/[id]/update/route.ts` - Check `can_manage_staff`
- `app/api/staff/[id]/permissions/route.ts` - Check `can_assign_permissions`

---

## 7. GROUPS MANAGEMENT

### Pages/Components to Update:
- `app/dashboard/groups/page.tsx`
- `app/dashboard/groups/[id]/page.tsx`
- `components/dashboard/groups/create-group-dialog.tsx`
- Navigation sidebar

### Permissions to Check:
- ✅ `can_view_groups` - Hide "Groups" nav item if false
- ✅ `can_create_groups` - Hide "Add Group" button if false
- ✅ `can_edit_own_groups` - Hide edit button on own groups if false
- ✅ `can_edit_all_groups` - Hide edit button on all groups if false
- ✅ `can_delete_own_groups` - Hide delete button on own groups if false
- ✅ `can_delete_all_groups` - Hide delete button on all groups if false
- ✅ `can_assign_athletes_to_groups` - Hide athlete assignment UI if false
- ✅ `groups_visibility` - Filter groups list ('own' | 'assigned' | 'all')

### Implementation Steps:
```typescript
// 1. Hide Groups nav item
const canView = await canViewGroups(userId, userRole);
{canView && <NavLink href="/dashboard/groups">Groups</NavLink>}

// 2. Hide Add Group button
const canCreate = await canCreateGroups(userId, userRole);
{canCreate && <button>Add Group</button>}

// 3. Filter groups list
const filter = await getGroupsFilter(userId, userRole);
if (filter.filter === 'all') {
  // Show all groups
} else {
  // Filter by groupIds: filter.groupIds
}

// 4. Check edit permission for each group
const canEdit = await canEditGroup(userId, userRole, group.created_by);
{canEdit && <button>Edit</button>}

// 5. Check delete permission for each group
const canDelete = await canDeleteGroup(userId, userRole, group.created_by);
{canDelete && <button>Delete</button>}

// 6. Hide athlete assignment
{permissions.can_assign_athletes_to_groups && <AthleteAssignment />}
```

### API Routes to Protect:
- `app/api/groups/create/route.ts` - Check `can_create_groups`
- `app/api/groups/[id]/update/route.ts` - Check `can_edit_own_groups` or `can_edit_all_groups`
- `app/api/groups/[id]/delete/route.ts` - Check `can_delete_own_groups` or `can_delete_all_groups`
- `app/api/groups/[id]/assign-athlete/route.ts` - Check `can_assign_athletes_to_groups`

---

## 8. VALD FORCE PLATES

### Pages/Components to Update:
- `app/dashboard/athletes/[id]/page.tsx` (Force Profile tab)
- `components/dashboard/athletes/force-profile/sync-history-section.tsx`

### Permissions to Check:
- ✅ `can_sync_force_plates` - Hide "Sync Now" button if false

### Implementation Steps:
```typescript
// Hide sync button
{permissions.can_sync_force_plates && (
  <button onClick={syncForcePlates}>Sync Now</button>
)}
```

### API Routes to Protect:
- `app/api/athletes/[id]/vald/sync/route.ts` - Check `can_sync_force_plates`

---

## 9. NAVIGATION / SIDEBAR

### Component to Update:
- `components/navigation/sidebar.tsx` or main layout

### Items to Conditionally Show:
```typescript
// Only show if user has permission
{canViewStaff && <NavItem href="/staff">Staff</NavItem>}
{canViewGroups && <NavItem href="/groups">Groups</NavItem>}
```

---

## 10. DASHBOARD STATS (Phase 3C - Future)

### Component to Update:
- `app/dashboard/page.tsx`

### Dynamic Stats Based on Permissions:
- **Athletes Count**: Only count athletes user can see (based on `athletes_visibility`)
- **Content Count**: Only count exercises/workouts/routines user can see (based on visibility)
- **Groups Count**: Only count groups user can see (based on `groups_visibility`)

---

## 📋 Default Permissions

### Super Admin (role: 'super_admin')
**All permissions = TRUE**
**All visibility = 'all'**

✅ Bypasses all permission checks in code
✅ Can do everything

### Admin (role: 'admin') - Default for new admins
```typescript
{
  // Visibility
  exercises_visibility: 'all',
  workouts_visibility: 'all',
  routines_visibility: 'all',
  plans_visibility: 'all',
  athletes_visibility: 'all',
  groups_visibility: 'all',

  // Content creation
  can_create_exercises: true,
  can_create_workouts: true,
  can_create_routines: true,
  can_create_plans: true,

  // Edit own
  can_edit_own_exercises: true,
  can_edit_own_workouts: true,
  can_edit_own_routines: true,
  can_edit_own_plans: true,

  // Edit admin
  can_edit_admin_exercises: true,
  can_edit_admin_workouts: true,
  can_edit_admin_routines: true,
  can_edit_admin_plans: true,

  // Delete own
  can_delete_own_exercises: true,
  can_delete_own_workouts: true,
  can_delete_own_routines: true,
  can_delete_own_plans: true,

  // Delete admin (configurable per admin)
  can_delete_admin_exercises: false,
  can_delete_admin_workouts: false,
  can_delete_admin_routines: false,
  can_delete_admin_plans: false,

  // Athletes
  can_assign_coaches: true,
  can_edit_athlete_profile: true,
  can_delete_athletes: true,

  // Staff
  can_view_staff: true,
  can_manage_staff: true,
  can_view_all_staff: true,
  can_assign_permissions: false, // Only super_admin

  // Groups
  can_view_groups: true,
  can_create_groups: true,
  can_edit_own_groups: true,
  can_edit_all_groups: true,
  can_delete_own_groups: true,
  can_delete_all_groups: false, // Configurable
  can_assign_athletes_to_groups: true,

  // VALD
  can_sync_force_plates: true
}
```

### Coach (role: 'coach') - Default for new coaches
```typescript
{
  // Visibility - Limited to own + admin content
  exercises_visibility: 'own_and_admin',
  workouts_visibility: 'own_and_admin',
  routines_visibility: 'own_and_admin',
  plans_visibility: 'own_and_admin',
  athletes_visibility: 'assigned', // Only see assigned athletes
  groups_visibility: 'own',

  // Content creation
  can_create_exercises: true,
  can_create_workouts: true,
  can_create_routines: true,
  can_create_plans: true,

  // Edit own only
  can_edit_own_exercises: true,
  can_edit_own_workouts: true,
  can_edit_own_routines: true,
  can_edit_own_plans: true,

  // Cannot edit admin content
  can_edit_admin_exercises: false,
  can_edit_admin_workouts: false,
  can_edit_admin_routines: false,
  can_edit_admin_plans: false,

  // Cannot delete anything
  can_delete_own_exercises: false,
  can_delete_own_workouts: false,
  can_delete_own_routines: false,
  can_delete_own_plans: false,
  can_delete_admin_exercises: false,
  can_delete_admin_workouts: false,
  can_delete_admin_routines: false,
  can_delete_admin_plans: false,

  // Athletes
  can_assign_coaches: false,
  can_edit_athlete_profile: true,
  can_delete_athletes: false,

  // Staff - Limited
  can_view_staff: true,
  can_manage_staff: false,
  can_view_all_staff: false, // Only see self
  can_assign_permissions: false,

  // Groups - Own only
  can_view_groups: true,
  can_create_groups: true,
  can_edit_own_groups: true,
  can_edit_all_groups: false,
  can_delete_own_groups: false,
  can_delete_all_groups: false,
  can_assign_athletes_to_groups: true,

  // VALD
  can_sync_force_plates: false
}
```

---

## 🚀 Implementation Priority

### Phase 1: High Priority (Core Features)
1. ✅ **Exercises** - Most used feature
2. ✅ **Workouts** - Most used feature
3. ✅ **Athletes** - Critical data protection
4. ✅ **Staff** - Prevent unauthorized access

### Phase 2: Medium Priority
5. ✅ **Routines**
6. ✅ **Plans**
7. ✅ **Groups**
8. ✅ **Navigation/Sidebar**

### Phase 3: Low Priority (Nice to Have)
9. ✅ **VALD Force Plates**
10. ✅ **Dynamic Dashboard Stats**

---

## 🔧 Helper Functions Available

All in `lib/auth/permissions.ts`:

### Content Permissions:
- `canCreateContent(userId, userRole, contentType)` → boolean
- `canEditContent(userId, userRole, contentType, creatorId)` → boolean
- `canDeleteContent(userId, userRole, contentType, creatorId)` → boolean
- `canViewContent(userId, userRole, contentType, creatorId)` → boolean
- `getContentFilter(userId, userRole, contentType)` → { filter, creatorIds }

### Athlete Permissions:
- `canViewAthlete(userId, userRole, athleteId)` → boolean
- `getAthleteFilter(userId, userRole)` → { filter, athleteIds }

### Staff Permissions:
- `canViewStaff(userId, userRole)` → boolean
- `canManageStaff(userId, userRole)` → boolean
- `canAssignPermissions(userId, userRole)` → boolean

### Groups Permissions:
- `canViewGroups(userId, userRole)` → boolean
- `canCreateGroups(userId, userRole)` → boolean
- `canEditGroup(userId, userRole, groupCreatorId)` → boolean
- `canDeleteGroup(userId, userRole, groupCreatorId)` → boolean
- `getGroupsFilter(userId, userRole)` → { filter, groupIds }

### Core:
- `getStaffPermissions(staffId)` → StaffPermissions | null
- `getCoachAthleteIds(coachId)` → string[]

---

## ⚠️ Important Notes

1. **Super Admin Bypass**: Always check `if (userRole === 'super_admin') return true` FIRST in all permission functions
2. **Server-side Validation**: ALWAYS validate permissions in API routes, not just UI
3. **Cache Permissions**: Consider caching permissions to avoid excessive DB calls
4. **Error Handling**: Show friendly error messages when users try unauthorized actions
5. **Audit Logging**: Consider logging permission-denied events for security

---

## 📝 Testing Checklist

For each feature, test:
- ✅ Super admin can do everything
- ✅ Admin with permission enabled can do action
- ✅ Admin with permission disabled cannot do action
- ✅ Coach with limited permissions sees filtered content
- ✅ API routes reject unauthorized requests
- ✅ UI buttons are hidden when no permission
- ✅ Direct URL access to unauthorized pages is blocked

---

**End of Roadmap**
