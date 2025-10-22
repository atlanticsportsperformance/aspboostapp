# Fix Workouts System - Run This Migration

## The Problem

You're seeing this error when clicking "+ Create Workout":
```
ERROR: column "scheme" of relation "routines" does not exist
```

**Why**: The `workouts`, `routines`, and `routine_exercises` tables exist in your database (from seed data), but they're missing the new columns needed for the template/placeholder system.

## The Solution

Run this ONE simple migration: `RUN_THIS_MIGRATION.sql`

It ONLY adds missing columns - it doesn't try to recreate existing tables.

## Steps

### 1. Open Supabase
- Go to: https://supabase.com/dashboard
- Project: `tadqnotafpeasaevofjc`

### 2. Open SQL Editor
- Click "SQL Editor" in left sidebar
- Click "New Query"

### 3. Copy and Run
- Open: `docs/RUN_THIS_MIGRATION.sql`
- Copy entire contents
- Paste into Supabase SQL Editor
- Click "Run" or press Ctrl/Cmd + Enter

### 4. Verify Success
You should see:
```
✅ Cell 4.2 Migration Complete!
All columns added successfully
Go to /dashboard/workouts and click Create Workout!
```

### 5. Test It
- Go to: http://localhost:3001/dashboard/workouts
- Click "+ Create Workout"
- Should redirect to workout builder
- No errors!

## What This Migration Does

### Adds to `workouts` table:
- `is_template` (boolean)
- `placeholder_definitions` (jsonb)

### Adds to `routines` table:
- `scheme` (text) - straight/superset/circuit/emom/amrap
- `superset_block_name` (text) - e.g., "A1/A2"
- `text_info` (text) - coaching notes

### Adds to `routine_exercises` table:
- `is_placeholder` (boolean)
- `placeholder_id` (text)
- `intensity_percent` (int)
- `intensity_type` (text)
- `target_load` (decimal)
- `target_rpe` (int)
- `target_time_seconds` (int)
- Makes `exercise_id` nullable

### Adds to `workout_instances` table:
- `placeholder_resolutions` (jsonb)
- `is_custom_override` (boolean)

### Creates new table:
- `instance_exercise_overrides` - for single workout customization

### Creates indexes:
- 4 performance indexes

## This Migration is SAFE

- Uses `ADD COLUMN IF NOT EXISTS` - won't error if column already there
- Uses `CREATE TABLE IF NOT EXISTS` - won't error if table already there
- Uses `CREATE INDEX IF NOT EXISTS` - won't error if index already there
- Safe to run multiple times
- Won't affect existing data

## After Migration Works

✅ Create workouts
✅ Add routines with 5 scheme types
✅ Add exercises with full targets
✅ Configure intensity (% 1RM, % Max Velo, RPE, etc.)
✅ Create template workouts with placeholders
✅ Assign to athletes/teams
✅ Everything fully functional!

---

**Just run `RUN_THIS_MIGRATION.sql` in Supabase and you're done!** 🚀
