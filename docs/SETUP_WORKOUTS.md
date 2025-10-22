# Setup Workouts System - Quick Start

## Problem

The workouts system is built but the database tables don't exist yet. You're seeing an error when trying to create a workout because the `workouts`, `routines`, and `routine_exercises` tables haven't been created in Supabase.

## Solution

Run the complete migration SQL in Supabase to create all required tables.

## Steps

### 1. Open Supabase Dashboard
- Go to https://supabase.com/dashboard
- Select your project: `tadqnotafpeasaevofjc`

### 2. Open SQL Editor
- Click "SQL Editor" in the left sidebar
- Click "New Query"

### 3. Run the Migration
- Open the file: `docs/CELL_4.2_FULL_MIGRATION.sql`
- Copy the entire contents
- Paste into the Supabase SQL Editor
- Click "Run" (or press Ctrl/Cmd + Enter)

### 4. Verify Success
You should see:
```
✅ Cell 4.2 Complete Migration Successful!
Tables created: workouts, routines, routine_exercises, instance_exercise_overrides
Ready to create workouts in the UI!
```

### 5. Test the System
- Go to http://localhost:3001/dashboard/workouts
- Click "+ Create Workout"
- You should now be redirected to the workout builder
- No errors!

## What Gets Created

### Tables:
1. **workouts** - Main workout container
2. **routines** - Exercise groupings (supersets, circuits, etc.)
3. **routine_exercises** - Individual exercises with targets
4. **instance_exercise_overrides** - Single workout customization

### Columns Added to Existing Tables:
- `workout_instances.placeholder_resolutions`
- `workout_instances.is_custom_override`

### Indexes Created:
- 13 performance indexes for fast queries

## If You See Errors

**Error: "relation workouts already exists"**
- This is fine! It means the table was already created
- The migration uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times

**Error: "column already exists"**
- This is fine! The migration uses `ADD COLUMN IF NOT EXISTS`
- Safe to run multiple times

**Error: "constraint already exists"**
- This is fine! The migration checks for existing constraints
- Safe to run multiple times

## After Migration

The workouts system is fully functional:

1. **Create workouts** - `/dashboard/workouts` (click "+ Create Workout")
2. **Build workouts** - Add routines, exercises, configure sets/reps/intensity
3. **Use templates** - Create placeholder exercises for personalized programs
4. **Assign workouts** - To athletes or teams
5. **Track progress** - (Future phase: log completed workouts)

## Next Steps

Once the migration runs successfully:

1. Create your first workout
2. Add a routine
3. Add exercises
4. Configure targets (sets, reps, intensity)
5. Assign to an athlete
6. Check the athlete's calendar (future phase)

---

**🚀 Ready to program workouts like a pro!**
