# Permissions System - Phase 3: Staff & Groups Management

## Overview
Extend the permissions system to control staff and group visibility/management, plus dynamic dashboard stats based on assigned content.

---

## New Permissions to Add

### 1. Staff Management Permissions
```typescript
// Add to staff_permissions table
can_view_staff: boolean              // Can see Staff page
can_manage_staff: boolean            // Can add/edit/delete staff
can_view_all_staff: boolean          // See all staff vs only themselves
can_assign_permissions: boolean      // Can edit other staff permissions
```

**Use Cases:**
- **Super Admin**: Can see and manage all staff
- **Admin**: Can see all staff but maybe not edit permissions
- **Coach**: Can only see themselves, no management access
- **Intern**: Cannot see staff page at all

---

### 2. Groups Management Permissions
```typescript
// Add to staff_permissions table
can_view_groups: boolean             // Can see Groups page
can_create_groups: boolean           // Can create new groups
can_edit_own_groups: boolean         // Can edit groups they created
can_edit_all_groups: boolean         // Can edit any group
can_delete_own_groups: boolean       // Can delete groups they created
can_delete_all_groups: boolean       // Can delete any group
can_assign_athletes_to_groups: boolean  // Can add/remove athletes from groups

// New visibility setting
groups_visibility: 'own' | 'assigned' | 'all'
// - own: Only groups they created
// - assigned: Groups they're assigned to manage
// - all: All groups in organization
```

**Use Cases:**
- **Head Coach**: Can see all groups, edit all, manage athletes
- **Position Coach**: Can only see groups they're assigned to
- **Assistant Coach**: Can see all groups but only edit their own

---

### 3. Group-to-Staff Assignments

**New Table: `staff_groups`**
```sql
CREATE TABLE staff_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, group_id)
);
```

**Purpose:**
- Assign coaches/staff to specific groups
- Staff can only see/manage groups they're assigned to (if `groups_visibility = 'assigned'`)
- One staff member can be "owner" of the group (creator)

---

### 4. Dynamic Dashboard Stats

**Current Problem:**
- Dashboard shows stats for ALL athletes/workouts regardless of permissions

**Solution:**
- Filter dashboard stats based on:
  - `athletes_visibility` (assigned vs all)
  - `exercises/workouts/routines_visibility` (own vs all)
  - Assigned groups (if using group-based filtering)

**Stats to Filter:**
```typescript
// Dashboard should show:
- Total Athletes (only those coach can see)
- Active Athletes (only assigned if athletes_visibility = 'assigned')
- Total Workouts (only visible workouts based on workouts_visibility)
- Recent Activity (only from athletes they can see)
- Assigned Groups (only groups from staff_groups where staff_id = user)
```

---

## Implementation Phases

### Phase 3A: Staff Permissions (First)
1. ✅ Add 4 new columns to `staff_permissions` table
2. ✅ Update permission checking functions
3. ✅ Hide/show Staff page based on `can_view_staff`
4. ✅ Filter staff list based on `can_view_all_staff`
5. ✅ Disable edit buttons if `!can_manage_staff`

### Phase 3B: Groups Permissions (Second)
1. ✅ Add 7 new columns to `staff_permissions` table
2. ✅ Create `staff_groups` junction table
3. ✅ Update Groups page to check permissions
4. ✅ Filter groups list based on `groups_visibility`
5. ✅ Add UI to assign staff to groups
6. ✅ Add UI to assign groups to staff (bidirectional)

### Phase 3C: Dynamic Dashboard (Third)
1. ✅ Update dashboard queries to filter by permissions
2. ✅ Show correct athlete count (assigned vs all)
3. ✅ Show correct workout/exercise counts (own vs all)
4. ✅ Filter recent activity by visible athletes
5. ✅ Show "Your Groups" if groups are assigned

---

## Database Migration Scripts

### Script 1: Add Staff Permissions
```sql
-- Add staff management permissions
ALTER TABLE staff_permissions
ADD COLUMN IF NOT EXISTS can_view_staff BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_manage_staff BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_view_all_staff BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_assign_permissions BOOLEAN DEFAULT false;

-- Super admins and admins get all staff permissions
UPDATE staff_permissions
SET
  can_view_staff = true,
  can_manage_staff = true,
  can_view_all_staff = true,
  can_assign_permissions = true
WHERE staff_id IN (
  SELECT id FROM profiles WHERE app_role IN ('super_admin', 'admin')
);

-- Coaches can only view staff, not manage
UPDATE staff_permissions
SET
  can_view_staff = true,
  can_manage_staff = false,
  can_view_all_staff = true,
  can_assign_permissions = false
WHERE staff_id IN (
  SELECT id FROM profiles WHERE app_role = 'coach'
);
```

### Script 2: Add Groups Permissions
```sql
-- Add groups management permissions
ALTER TABLE staff_permissions
ADD COLUMN IF NOT EXISTS can_view_groups BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_create_groups BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_edit_own_groups BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_edit_all_groups BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete_own_groups BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete_all_groups BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_assign_athletes_to_groups BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS groups_visibility TEXT DEFAULT 'all'
  CHECK (groups_visibility IN ('own', 'assigned', 'all'));

-- Create staff_groups junction table
CREATE TABLE IF NOT EXISTS staff_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_groups_staff ON staff_groups(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_groups_group ON staff_groups(group_id);
```

---

## Permission Checking Functions to Add

### Staff Permissions
```typescript
export async function canViewStaff(userId: string, userRole: string): Promise<boolean>
export async function canManageStaff(userId: string, userRole: string): Promise<boolean>
export async function canViewAllStaff(userId: string, userRole: string): Promise<boolean>
export async function canAssignPermissions(userId: string, userRole: string): Promise<boolean>
```

### Groups Permissions
```typescript
export async function canViewGroups(userId: string, userRole: string): Promise<boolean>
export async function canCreateGroups(userId: string, userRole: string): Promise<boolean>
export async function canEditGroup(userId: string, userRole: string, groupOwnerId: string): Promise<boolean>
export async function canDeleteGroup(userId: string, userRole: string, groupOwnerId: string): Promise<boolean>
export async function getVisibleGroups(userId: string, userRole: string): Promise<string[]>
```

---

## UI Updates Required

### Staff Page
- Hide "Staff" nav link if `!can_view_staff`
- Hide "Add Staff" button if `!can_manage_staff`
- Filter staff list to show only self if `!can_view_all_staff`
- Disable edit/delete buttons if `!can_manage_staff`
- Hide Permissions tab if `!can_assign_permissions`

### Groups Page
- Hide "Groups" nav link if `!can_view_groups`
- Hide "Create Group" button if `!can_create_groups`
- Filter groups based on `groups_visibility`:
  - `own`: Only show groups where `created_by = userId`
  - `assigned`: Only show groups in `staff_groups` table
  - `all`: Show all groups
- Show "Assign Staff" button for group owners
- Add edit/delete buttons based on permissions

### Dashboard
- Replace hardcoded counts with filtered queries
- Add "Your Athletes" vs "All Athletes" label
- Show "Your Groups" section if staff is assigned to groups
- Filter recent activity by visible content

---

## Current Status

### ✅ Completed (Phase 1 & 2):
- Basic permission system structure
- Content visibility (exercises, workouts, routines)
- Athlete visibility (assigned vs all)
- Feature permissions (create, edit, delete)
- Super admin bypass

### 🔄 In Progress (Phase 3):
- Staff visibility permissions
- Groups visibility permissions
- Staff-to-group assignments
- Dynamic dashboard filtering

### ⏳ Not Started:
- Plans/Routines assignment permissions
- Workout execution permissions
- Exercise library sharing between staff
- Organization-level permission templates

---

## Testing Checklist

### Staff Permissions
- [ ] Super admin can see all staff
- [ ] Admin can see all staff but can/cannot manage (configurable)
- [ ] Coach can only see themselves
- [ ] Staff page hidden for users with `can_view_staff = false`

### Groups Permissions
- [ ] Coach with `groups_visibility = 'own'` only sees their groups
- [ ] Coach with `groups_visibility = 'assigned'` sees assigned groups
- [ ] Coach with `groups_visibility = 'all'` sees all groups
- [ ] Staff can be assigned to groups bidirectionally

### Dashboard
- [ ] Coach with `athletes_visibility = 'assigned'` sees correct count
- [ ] Coach with `workouts_visibility = 'own'` sees only their workouts
- [ ] Recent activity only shows visible athletes
- [ ] "Your Groups" section shows assigned groups

---

## Notes

- Super admins ALWAYS bypass ALL permission checks
- Regular admins are now subject to permissions (configurable)
- Default permissions are generous (most things enabled)
- Permissions can be tightened per staff member as needed
- Group assignments are separate from group visibility permissions

