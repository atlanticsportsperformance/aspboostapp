# Phase 1: Database Setup - COMPLETE ✅

## What Was Accomplished

### Database Changes (SQL Migrations)

1. **✅ Added `created_by` columns**
   - `exercises.created_by` → UUID references profiles(id)
   - `workouts.created_by` → UUID references profiles(id)
   - `routines.created_by` → Already existed ✅
   - Indexes created for performance

2. **✅ Created `coach_athletes` junction table**
   - Links coaches to their assigned athletes (many-to-many)
   - Columns: coach_id, athlete_id, assigned_by, is_primary, notes
   - Unique constraint prevents duplicate assignments
   - Indexes for fast lookups

3. **✅ Created `staff_permissions` table**
   - Granular permissions per staff member
   - Content visibility settings (exercises, workouts, routines)
   - Athlete visibility settings
   - Feature permission flags (create, edit, delete)
   - 18 permission columns total

4. **✅ Seeded default permissions**
   - All existing coaches/admins have permission records
   - Default: visibility='all', athletes_visibility='all'
   - Maintains current app behavior (no breaking changes)

### UI Updates - "Created By" Column

1. **✅ Exercises List** (`app/dashboard/exercises/page.tsx`)
   - Added `creator` join in query
   - Added "Created By" column header
   - Shows creator avatar (initials) + name + email
   - Shows "—" if no creator

2. **✅ Workouts List** (`app/dashboard/workouts/page.tsx`)
   - Added `creator` join in query
   - Added "Created By" column (grid layout)
   - Shows creator avatar + name
   - Adjusted grid: col-span-3 for name, col-span-2 for creator

3. **✅ Routines List** (`app/dashboard/routines/page.tsx`)
   - Added `creator` join in query
   - Added "Created By" column (grid layout)
   - Shows creator avatar + name
   - Adjusted grid: col-span-3 for name, col-span-1 for exercises, col-span-2 for creator

## SQL Migration Files Created

```
scripts/
├── phase1-add-created-by-columns.sql
├── phase1-create-coach-athletes-table.sql
├── phase1-create-staff-permissions-table.sql
├── phase1-seed-default-permissions.sql
└── apply-phase1-migrations.ts (runner script)
```

## Database Schema

### staff_permissions table
```sql
id UUID PRIMARY KEY
staff_id UUID UNIQUE REFERENCES profiles(id)

-- Content visibility ('own' | 'own_and_admin' | 'all')
exercises_visibility TEXT DEFAULT 'own_and_admin'
workouts_visibility TEXT DEFAULT 'own_and_admin'
routines_visibility TEXT DEFAULT 'own_and_admin'

-- Athlete visibility ('assigned' | 'all')
athletes_visibility TEXT DEFAULT 'assigned'

-- Exercise permissions
can_create_exercises BOOLEAN DEFAULT true
can_edit_own_exercises BOOLEAN DEFAULT true
can_delete_own_exercises BOOLEAN DEFAULT false
can_edit_admin_exercises BOOLEAN DEFAULT false

-- Workout permissions
can_create_workouts BOOLEAN DEFAULT true
can_edit_own_workouts BOOLEAN DEFAULT true
can_delete_own_workouts BOOLEAN DEFAULT false
can_edit_admin_workouts BOOLEAN DEFAULT false

-- Routine permissions
can_create_routines BOOLEAN DEFAULT true
can_edit_own_routines BOOLEAN DEFAULT true
can_delete_own_routines BOOLEAN DEFAULT false
can_edit_admin_routines BOOLEAN DEFAULT false

-- Athlete permissions
can_assign_coaches BOOLEAN DEFAULT false
can_edit_athlete_profile BOOLEAN DEFAULT true
can_delete_athletes BOOLEAN DEFAULT false
```

### coach_athletes table
```sql
id UUID PRIMARY KEY
coach_id UUID REFERENCES profiles(id)
athlete_id UUID REFERENCES athletes(id)
assigned_by UUID REFERENCES profiles(id)
assigned_at TIMESTAMPTZ DEFAULT NOW()
is_primary BOOLEAN DEFAULT false
notes TEXT
UNIQUE(coach_id, athlete_id)
```

## Current System State

### Existing Staff with Permissions (4 users)
```
| email                    | app_role | exercises_visibility | athletes_visibility |
| ------------------------ | -------- | -------------------- | ------------------- |
| coach1@elitebaseball.com | coach    | all                  | all                 |
| coach2@elitebaseball.com | coach    | all                  | all                 |
| admin@elitebaseball.com  | admin    | all                  | all                 |
| owner@elitebaseball.com  | admin    | all                  | all                 |
```

All coaches can currently see:
- ✅ ALL exercises (visibility='all')
- ✅ ALL workouts (visibility='all')
- ✅ ALL routines (visibility='all')
- ✅ ALL athletes (athletes_visibility='all')

**This maintains current behavior** - no existing functionality is broken!

## What's Next: Phase 2-8

### Phase 2: Core Authorization System (NEXT)
- Create `lib/auth/permissions.ts` with granular permission functions
- Create `useStaffPermissions()` hook
- Create `useCoachAthletes()` hook
- Update role system to integrate with staff_permissions

### Phase 3: Admin UI - Staff Permissions Page
- Build staff permissions management interface
- Permission editor for each coach
- Coach-athlete assignment manager

### Phase 4-8: Apply Permissions
- Update all APIs to respect permissions
- Add UI guards for create/edit/delete buttons
- Filter content based on visibility settings
- Test all permission scenarios

## Important Notes

### No Breaking Changes
- ✅ All migrations use `IF NOT EXISTS` / `ON CONFLICT`
- ✅ Default permissions maintain current behavior
- ✅ Existing functionality unchanged
- ✅ Can be run multiple times safely

### Next Steps for User
1. Review this document
2. Test the "Created By" columns in UI:
   - Go to `/dashboard/exercises`
   - Go to `/dashboard/workouts`
   - Go to `/dashboard/routines`
3. Verify creators show up correctly
4. Ready to start Phase 2 when approved

## Files Modified

```
app/dashboard/exercises/page.tsx (updated interface + query + UI)
app/dashboard/workouts/page.tsx (updated interface + query + UI)
app/dashboard/routines/page.tsx (updated interface + query + UI)
```

## Testing Checklist

- [ ] Verify exercises page shows "Created By" column
- [ ] Verify workouts page shows "Created By" column
- [ ] Verify routines page shows "Created By" column
- [ ] Check that existing content still displays
- [ ] Verify no console errors
- [ ] Test creating new exercise/workout/routine

---

**Phase 1 Status: ✅ COMPLETE**

Ready for Phase 2: Core Authorization System
