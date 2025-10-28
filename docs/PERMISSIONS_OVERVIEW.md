# Staff Permissions System - Visual Overview

## The Problem

Right now:
- All coaches can see all exercises, workouts, routines
- All coaches can see all athletes
- No way to restrict what coaches can access

## The Solution

### 1. Coach-Athlete Assignments

```
Athlete: Colin Ma
├── Primary Coach: Tom Martinez
└── Assistant Coach: Lisa Anderson

Coach: Tom Martinez
├── Athlete: Colin Ma (primary)
├── Athlete: Jake Thompson (primary)
└── Athlete: Emma Davis (assistant)
```

**`coach_athletes` table:**
| coach_id | athlete_id | is_primary | assigned_by |
|----------|-----------|------------|-------------|
| tom-id | colin-id | true | admin-id |
| lisa-id | colin-id | false | admin-id |
| tom-id | jake-id | true | admin-id |

### 2. Content Visibility Matrix

**Coach: Tom Martinez**

| Content Type | Visibility Setting | What Tom Sees |
|--------------|-------------------|---------------|
| Exercises | Own + Admin | ✅ Exercises Tom created<br>✅ Exercises Admin created<br>❌ Exercises Lisa created |
| Workouts | Own Only | ✅ Workouts Tom created<br>❌ Workouts Admin created<br>❌ Workouts Lisa created |
| Routines | All | ✅ All routines (everyone's) |
| Athletes | Assigned Only | ✅ Colin Ma (assigned)<br>✅ Jake Thompson (assigned)<br>❌ Emma Davis (not assigned) |

### 3. Permission Flags

**Coach: Tom Martinez**

| Feature | Allowed? |
|---------|----------|
| Create Exercises | ✅ Yes |
| Edit Own Exercises | ✅ Yes |
| Delete Own Exercises | ❌ No |
| Edit Admin Exercises | ❌ No |
| Assign Coaches to Athletes | ❌ No |

## Data Flow

### Exercise List (Coach View)

```
1. Tom logs in (app_role: coach)
   ↓
2. Load Tom's staff_permissions
   ├── exercises_visibility: "own_and_admin"
   ├── can_create_exercises: true
   └── can_delete_own_exercises: false
   ↓
3. Query exercises table
   WHERE created_by IN (tom-id, admin-id)  -- Based on visibility setting
   ↓
4. Render exercises with actions
   ├── "Create Exercise" button: ✅ Show (can_create_exercises)
   ├── Edit button: ✅ Show (if exercise.created_by === tom-id)
   └── Delete button: ❌ Hide (can_delete_own_exercises = false)
```

### Athlete List (Coach View)

```
1. Tom logs in (app_role: coach)
   ↓
2. Load Tom's staff_permissions
   └── athletes_visibility: "assigned"
   ↓
3. Load Tom's coach_athletes assignments
   └── [colin-id, jake-id]
   ↓
4. Query athletes table
   WHERE id IN (colin-id, jake-id)  -- Only assigned athletes
   ↓
5. Render athlete list
   ├── Colin Ma ✅
   ├── Jake Thompson ✅
   └── Emma Davis ❌ (not in Tom's assignments)
```

## Admin UI - Staff Permissions Page

```
┌─────────────────────────────────────────────────────────┐
│ Staff Permissions Management                             │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Coach: Tom Martinez                               │   │
│ │                                                   │   │
│ │ Content Visibility                                │   │
│ │ ├─ Exercises:  [Own + Admin ▼]                   │   │
│ │ ├─ Workouts:   [Own Only ▼]                      │   │
│ │ └─ Routines:   [All ▼]                           │   │
│ │                                                   │   │
│ │ Athlete Access                                    │   │
│ │ └─ Athletes:   [○ Assigned Only  ○ All]          │   │
│ │                                                   │   │
│ │ Feature Permissions                               │   │
│ │ ├─ [✓] Can create exercises                      │   │
│ │ ├─ [✓] Can edit own exercises                    │   │
│ │ ├─ [ ] Can delete own exercises                  │   │
│ │ ├─ [✓] Can create workouts                       │   │
│ │ └─ [ ] Can assign coaches to athletes            │   │
│ │                                                   │   │
│ │ Assigned Athletes (3)                             │   │
│ │ ├─ Colin Ma [Primary] [Remove]                   │   │
│ │ ├─ Jake Thompson [Primary] [Remove]              │   │
│ │ └─ Emma Davis [Remove]                           │   │
│ │                                                   │   │
│ │ [+ Assign Athlete]  [Save Changes]               │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Coach: Lisa Anderson                              │   │
│ │ ...                                               │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Implementation Order (38 Steps)

### Foundation (Steps 1-9)
1. ✅ Check existing tables
2. Add `created_by` to exercises
3. Add `created_by` to workouts
4. Create `coach_athletes` table
5. Create `staff_permissions` table
6. Seed default permissions
7. Create `lib/auth/permissions.ts`
8. Create `useStaffPermissions()` hook
9. Create `useCoachAthletes()` hook

### Admin UI (Steps 10-13)
10. Create staff permissions page
11. Build staff list with cards
12. Create permission editor form
13. Create coach assignment interface

### Filtering (Steps 14-22)
14-16. Update exercises/workouts/routines APIs
17-18. Add UI filters and badges
19-22. Update athlete list and assignments

### Protection (Steps 23-30)
23-26. Add permission checks to APIs
27-30. Add UI guards and indicators

### Testing (Steps 31-38)
31-38. Test all permission scenarios

## Key Benefits

✅ **Granular Control** - Admin decides exactly what each coach can access
✅ **Multi-Coach Support** - Athletes can have multiple assigned coaches
✅ **Secure by Default** - Permissions enforced at database and API level
✅ **Scalable** - Easy to add new permissions as features grow
✅ **User-Friendly** - Clear UI for managing permissions
