# Comprehensive Staff Permissions System - Implementation Plan

## Overview

Build a granular permission system where admins can control what each coach can see and do.

## Key Features

### 1. Coach-Athlete Assignment (NEW REQUIREMENT)
- **Multiple coaches can be assigned to one athlete**
- **Coach can only see/edit athletes assigned to them** (unless admin gives broader access)

### 2. Content Visibility Permissions
For each content type (exercises, workouts, routines, plans):
- **"Own Only"** - Coach can only see content they created
- **"Own + Admin"** - Coach can see their content + admin-created content

### 3. Athlete Visibility Permissions
- **"Assigned Only"** - Coach can only see athletes assigned to them
- **"All Athletes"** - Coach can see all athletes in the org

## Database Changes Needed

### 1. Add `created_by` columns
```sql
-- exercises table
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- workouts table
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- routines already has created_by ✅
```

### 2. Create `coach_athletes` junction table
```sql
CREATE TABLE coach_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id), -- who assigned this coach
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_primary BOOLEAN DEFAULT false, -- mark one coach as primary
  notes TEXT,
  UNIQUE(coach_id, athlete_id)
);

CREATE INDEX idx_coach_athletes_coach ON coach_athletes(coach_id);
CREATE INDEX idx_coach_athletes_athlete ON coach_athletes(athlete_id);
```

### 3. Create `staff_permissions` table
```sql
CREATE TABLE staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

  -- Content visibility (for each: 'own' | 'own_and_admin' | 'all')
  exercises_visibility TEXT DEFAULT 'own_and_admin',
  workouts_visibility TEXT DEFAULT 'own_and_admin',
  routines_visibility TEXT DEFAULT 'own_and_admin',

  -- Athlete visibility ('assigned' | 'all')
  athletes_visibility TEXT DEFAULT 'assigned',

  -- Feature permissions (boolean flags)
  can_create_exercises BOOLEAN DEFAULT true,
  can_edit_own_exercises BOOLEAN DEFAULT true,
  can_delete_own_exercises BOOLEAN DEFAULT false,

  can_create_workouts BOOLEAN DEFAULT true,
  can_edit_own_workouts BOOLEAN DEFAULT true,
  can_delete_own_workouts BOOLEAN DEFAULT false,

  can_create_routines BOOLEAN DEFAULT true,
  can_edit_own_routines BOOLEAN DEFAULT true,
  can_delete_own_routines BOOLEAN DEFAULT false,

  can_assign_coaches BOOLEAN DEFAULT false, -- can assign other coaches to athletes
  can_edit_athlete_profile BOOLEAN DEFAULT true,
  can_delete_athletes BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default permissions for existing staff
INSERT INTO staff_permissions (staff_id)
SELECT id FROM profiles WHERE app_role IN ('coach', 'admin')
ON CONFLICT (staff_id) DO NOTHING;
```

## Authorization System Updates

### Updated Permission Functions

**`lib/auth/permissions.ts`** (new file)
```typescript
export type ContentVisibility = 'own' | 'own_and_admin' | 'all';
export type AthleteVisibility = 'assigned' | 'all';

export interface StaffPermissions {
  staff_id: string;

  // Visibility settings
  exercises_visibility: ContentVisibility;
  workouts_visibility: ContentVisibility;
  routines_visibility: ContentVisibility;
  athletes_visibility: AthleteVisibility;

  // Feature flags
  can_create_exercises: boolean;
  can_edit_own_exercises: boolean;
  can_delete_own_exercises: boolean;
  // ... etc
}

// Get coach's assigned athlete IDs
export async function getCoachAthleteIds(coachId: string): Promise<string[]>

// Check if coach can see exercise
export function canViewExercise(
  user: UserWithRole,
  exercise: { created_by?: string },
  permissions: StaffPermissions
): boolean

// Get content filter for queries
export function getContentFilter(
  user: UserWithRole,
  permissions: StaffPermissions,
  contentType: 'exercises' | 'workouts' | 'routines'
): QueryFilter
```

## Implementation Steps (Top to Bottom)

### Phase 1: Database Setup
1. ✅ Check existing tables and columns
2. Add `created_by` to exercises and workouts tables
3. Create `coach_athletes` junction table
4. Create `staff_permissions` table
5. Seed default permissions for existing staff

### Phase 2: Core Authorization System
6. Create `lib/auth/permissions.ts` with granular permission functions
7. Update `lib/auth/roles.ts` to integrate with staff_permissions
8. Create `useStaffPermissions()` hook
9. Create `useCoachAthletes()` hook for getting assigned athletes

### Phase 3: Admin UI - Staff Permissions Page
10. Create `app/dashboard/admin/staff-permissions/page.tsx`
11. Build staff list with permission cards
12. Create permission editor modal/form:
    - Content visibility dropdowns (exercises, workouts, routines)
    - Athlete visibility toggle
    - Feature permission checkboxes
13. Create coach-athlete assignment interface

### Phase 4: Content Filtering System
14. Update exercises API to filter by `created_by` + permissions
15. Update workouts API to filter by `created_by` + permissions
16. Update routines API to filter by `created_by` + permissions
17. Add "Created by" badges/filters to list views
18. Update create/edit forms to set `created_by`

### Phase 5: Athlete Filtering System
19. Update athlete list API to filter by coach assignments
20. Create coach assignment selector for athlete profile page
21. Add "My Athletes" vs "All Athletes" toggle (based on permissions)
22. Update athlete dashboard to respect coach assignments

### Phase 6: API Protection
23. Add permission checks to all create operations
24. Add permission checks to all edit operations
25. Add permission checks to all delete operations
26. Add permission checks to all list/query operations

### Phase 7: UI Updates
27. Add permission guards to create buttons
28. Add permission guards to edit/delete actions
29. Update navigation based on permissions
30. Add visual indicators (badges, tooltips) for permission-restricted items

### Phase 8: Testing & Polish
31. Test admin can manage all permissions
32. Test coach with "own only" can't see others' content
33. Test coach with "assigned only" can't see unassigned athletes
34. Test coach-athlete assignments work correctly
35. Test multi-coach assignment to single athlete
36. Add error messages for permission violations
37. Add loading states for permission checks

## File Structure

```
lib/auth/
├── roles.ts (existing - basic roles)
├── permissions.ts (NEW - granular permissions)
├── use-user-role.ts (existing)
├── use-staff-permissions.ts (NEW)
└── use-coach-athletes.ts (NEW)

components/auth/
├── role-guard.tsx (existing)
└── permission-guard.tsx (NEW)

app/dashboard/admin/
├── staff-permissions/
│   ├── page.tsx (staff permissions management)
│   ├── permission-editor.tsx (modal/form)
│   └── coach-assignment-manager.tsx

components/staff/
├── permission-settings-card.tsx
├── visibility-selector.tsx
└── feature-toggle.tsx

components/athletes/
└── coach-assignment-selector.tsx
```

## API Endpoints Needed

```
GET  /api/admin/staff-permissions - List all staff permissions
GET  /api/admin/staff-permissions/[id] - Get staff permission details
PUT  /api/admin/staff-permissions/[id] - Update staff permissions
GET  /api/coach-athletes - Get coach's assigned athletes
POST /api/coach-athletes - Assign coach to athlete
DELETE /api/coach-athletes/[id] - Remove coach assignment
GET  /api/athletes/[id]/coaches - Get coaches assigned to athlete
```

## Example Usage After Implementation

```tsx
// Coach viewing exercises list
function ExercisesList() {
  const { user } = useUserRole();
  const { permissions } = useStaffPermissions(user?.id);

  // API automatically filters based on permissions
  const { data: exercises } = useExercises(); // Only shows allowed exercises

  return (
    <div>
      {exercises.map(exercise => (
        <ExerciseCard
          exercise={exercise}
          canEdit={canEditExercise(user, exercise, permissions)}
          canDelete={canDeleteExercise(user, exercise, permissions)}
        />
      ))}
    </div>
  );
}

// Admin managing staff permissions
function StaffPermissionsPage() {
  const coaches = useStaff({ role: 'coach' });

  return (
    <div>
      {coaches.map(coach => (
        <PermissionCard
          coach={coach}
          onUpdate={handleUpdatePermissions}
        />
      ))}
    </div>
  );
}

// Athlete profile with coach assignments
function AthleteProfile({ athleteId }) {
  const coaches = useAthleteCoaches(athleteId);

  return (
    <div>
      <h3>Assigned Coaches</h3>
      {coaches.map(coach => (
        <CoachBadge coach={coach} isPrimary={coach.is_primary} />
      ))}
      <AdminOnly>
        <button>Assign Coach</button>
      </AdminOnly>
    </div>
  );
}
```

## Summary

**3 Main Components:**
1. **Coach-Athlete Assignments** - Junction table linking coaches to specific athletes
2. **Granular Content Permissions** - Control what content each coach can see
3. **Staff Permissions Management UI** - Admin interface to configure all permissions

**Result:**
- Admins have full control over coach capabilities
- Coaches only see content they're allowed to see
- Athletes can have multiple coaches
- System is scalable and maintainable
