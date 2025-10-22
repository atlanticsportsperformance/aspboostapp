# Routine Library System - Complete

## Overview
Created a complete standalone Routine Library system that allows coaches to create reusable routines and import them into workouts or assign directly to the calendar.

## What Was Built

### 1. Database Changes
**File**: [docs/ROUTINE_LIBRARY_MIGRATION.sql](../docs/ROUTINE_LIBRARY_MIGRATION.sql)

- Made `routines.workout_id` nullable (routines can exist standalone)
- Added `is_standalone` boolean flag to routines table
- Added `description`, `created_by`, `created_at`, `updated_at` to routines
- Created `routine_imports` junction table to track when standalone routines are imported into workouts
- Added constraint: routine must either have `workout_id` OR be `is_standalone`
- Created indexes and RLS policies

### 2. Routine Library Page
**File**: [app/dashboard/routines/page.tsx](../app/dashboard/routines/page.tsx)

Features:
- Grid view of all standalone routines
- Search by name
- Filter by scheme (Straight Sets, Superset, Circuit, EMOM, AMRAP, Giant Set)
- Create new routine
- Duplicate routine (with all exercises)
- Delete routine
- Color-coded scheme badges
- Shows exercise count per routine

### 3. Routine Builder Page
**File**: [app/dashboard/routines/[id]/page.tsx](../app/dashboard/routines/[id]/page.tsx)

Features:
- Edit routine name, scheme, description
- Configure superset block names and text info
- Set rest between rounds
- Add exercises with full target configuration
- Reorder exercises (up/down buttons)
- Remove exercises
- Supports all intensity types (% 1RM, Absolute, % Max Velocity, RPE, None)
- Auto-saves on changes

### 4. Import Routine Dialog
**File**: [components/dashboard/workouts/import-routine-dialog.tsx](../components/dashboard/workouts/import-routine-dialog.tsx)

Features:
- Modal dialog showing all standalone routines
- Search routines by name
- Filter by scheme type
- Click to import routine into current workout
- Shows routine description and exercise count

### 5. Workout Builder Integration
**File**: [app/dashboard/workouts/[id]/page.tsx](../app/dashboard/workouts/[id]/page.tsx)

Added:
- "📥 Import Routine" button next to "+ New Routine"
- `handleImportRoutine()` function that:
  - Fetches the standalone routine with all exercises
  - Creates a copy as a workout-specific routine
  - Copies all exercises with targets/intensity
  - Records the import relationship in `routine_imports` table
  - Refreshes workout to show the imported routine

### 6. Navigation Update
**File**: [app/dashboard/layout.tsx](../app/dashboard/layout.tsx)

Added "Routines" link in Programming section:
- Exercises
- **Routines** ← NEW
- Workouts
- Plans
- Calendar

## How It Works

### Creating Standalone Routines
1. Go to `/dashboard/routines`
2. Click "+ Create Routine"
3. Build the routine with exercises, schemes, targets
4. Save

### Importing Routines into Workouts
1. Go to workout builder (`/dashboard/workouts/[id]`)
2. Click "📥 Import Routine"
3. Select a routine from the library
4. Routine is copied into the workout with all exercises intact

### Why This Architecture?
- **Standalone routines** are reusable templates (like "Upper Body Strength" or "Speed Circuit")
- **Workout routines** are specific instances within a workout
- Importing creates a **copy** so changes to the standalone routine don't affect existing workouts
- The `routine_imports` table tracks provenance (where did this routine come from?)

## Database Schema

```sql
-- Routines can be standalone OR belong to a workout
routines:
  - workout_id (uuid, nullable) -- NULL for standalone
  - is_standalone (boolean) -- true for library routines
  - description (text) -- standalone routines have descriptions
  - created_by (uuid) -- who created it

-- Tracks when standalone routines are imported into workouts
routine_imports:
  - workout_id (uuid) -- the workout it was imported into
  - source_routine_id (uuid) -- the original standalone routine
  - imported_routine_id (uuid) -- the new workout-specific copy
  - imported_at (timestamptz)
```

## Migrations Needed

Run these in order:

1. **[FIX_WEEK_NUMBER_CONSTRAINT.sql](../docs/FIX_WEEK_NUMBER_CONSTRAINT.sql)**
   ```sql
   ALTER TABLE workouts ALTER COLUMN week_number DROP NOT NULL;
   ```
   This allows standalone workouts to exist without being part of a plan.

2. **[ROUTINE_LIBRARY_MIGRATION.sql](../docs/ROUTINE_LIBRARY_MIGRATION.sql)**
   This adds all the routine library functionality.

## Next Steps

Future enhancements:
- Allow assigning standalone routines directly to calendar (without a workout)
- Show "imported from" badge on workout routines
- Sync updates: option to push changes from standalone routine to all instances
- Routine categories/tags for better organization
- Routine templates by sport/training phase

## Files Created/Modified

### Created:
1. `docs/ROUTINE_LIBRARY_MIGRATION.sql`
2. `docs/FIX_WEEK_NUMBER_CONSTRAINT.sql`
3. `app/dashboard/routines/page.tsx`
4. `app/dashboard/routines/[id]/page.tsx`
5. `components/dashboard/workouts/import-routine-dialog.tsx`
6. `docs/ROUTINE_LIBRARY_COMPLETE.md` (this file)

### Modified:
1. `app/dashboard/layout.tsx` - Added Routines nav link
2. `app/dashboard/workouts/[id]/page.tsx` - Added import routine functionality
3. `app/dashboard/workouts/page.tsx` - Fixed week_number and query filter issues

## Summary

The Routine Library system is complete and ready to use! Coaches can now:
- ✅ Create reusable routines in a dedicated library
- ✅ Import routines into any workout
- ✅ Search and filter routines by scheme
- ✅ Duplicate and modify routines
- ✅ Full exercise configuration with all intensity types

Just run the two migrations and you're good to go!
