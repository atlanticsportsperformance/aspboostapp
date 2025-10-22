# Database Migration Status - Cell 4.4

## ⚠️ FIXES APPLIED

### Fix 1: RLS Policy Error
**Issue:** The original migration script referenced a `users` table that doesn't exist in your database.

**Fix Applied:** Updated all RLS policies to use the `staff` table instead:
- Changed `SELECT organization_id FROM users WHERE id = auth.uid()`
- To `SELECT org_id FROM staff WHERE user_id = auth.uid()`

### Fix 2: Organization ID Column Error
**Issue:** The migration tried to create indexes on `workouts.organization_id` and `routines.organization_id` which don't exist.

**Fix Applied:** Commented out these indexes in ADD_OWNERSHIP_CONTEXTS.sql:
- Removed `idx_workouts_templates` index on organization_id
- Removed `idx_routines_templates` index on organization_id
- Organization scoping will be handled through RLS policies instead

**Status:** ✅ Both migration scripts are now ready to run

---

## 📝 Migration Execution Order

Run these migrations **in order** in your Supabase SQL Editor:

### 1. CREATE_TRAINING_PLANS_TABLES.sql ✅ FIXED - READY TO RUN
**File:** `docs/CREATE_TRAINING_PLANS_TABLES.sql`

**What it creates:**
- `training_plans` table (stores plan metadata)
- `plan_calendar` table (schedules workouts to dates)
- Performance indexes
- RLS policies (staff-only access)
- Helper function `get_plan_workouts_count()`

**After running, verify with:**
```sql
SELECT * FROM training_plans LIMIT 1;
SELECT * FROM plan_calendar LIMIT 1;
```

---

### 2. ADD_OWNERSHIP_CONTEXTS.sql - READY TO RUN
**File:** `docs/ADD_OWNERSHIP_CONTEXTS.sql`

**What it does:**
- Adds `plan_id`, `athlete_id`, `source_workout_id` to `workouts` table
- Adds `plan_id`, `athlete_id`, `source_routine_id` to `routines` table
- Adds `placeholder_name` to `routine_exercises` table
- Adds ownership constraints (prevents dual ownership)
- Creates performance indexes
- Adds helper functions `get_workout_context()` and `get_routine_context()`

**After running, verify with:**
```sql
-- Check all existing workouts are templates
SELECT COUNT(*) as template_workouts
FROM workouts
WHERE plan_id IS NULL AND athlete_id IS NULL;

-- Check no ownership violations
SELECT COUNT(*) as invalid_workouts
FROM workouts
WHERE plan_id IS NOT NULL AND athlete_id IS NOT NULL;
-- Should return 0

SELECT COUNT(*) as invalid_routines
FROM routines
WHERE plan_id IS NOT NULL AND athlete_id IS NOT NULL;
-- Should return 0
```

---

## 🎯 After Migration Complete

Once both migrations are successful, you can:

1. **Test the Plans Feature**
   - Navigate to `/dashboard/plans`
   - Create a new training plan
   - View the weekly calendar builder

2. **Test Context Badges**
   - Open any workout in `/dashboard/workouts`
   - You should see a purple "Template Library" badge in the header

3. **Test Placeholder Display**
   - Add a placeholder exercise to a workout
   - Verify it shows with a "PH" badge in the sidebar

---

## 🔄 Rollback (if needed)

If you need to rollback the migrations:

```sql
-- Rollback ADD_OWNERSHIP_CONTEXTS.sql
ALTER TABLE workouts DROP COLUMN IF EXISTS plan_id;
ALTER TABLE workouts DROP COLUMN IF EXISTS athlete_id;
ALTER TABLE workouts DROP COLUMN IF EXISTS source_workout_id;
ALTER TABLE routines DROP COLUMN IF EXISTS plan_id;
ALTER TABLE routines DROP COLUMN IF EXISTS athlete_id;
ALTER TABLE routines DROP COLUMN IF EXISTS source_routine_id;
ALTER TABLE routine_exercises DROP COLUMN IF EXISTS placeholder_name;
DROP FUNCTION IF EXISTS get_workout_context(workouts);
DROP FUNCTION IF EXISTS get_routine_context(routines);

-- Rollback CREATE_TRAINING_PLANS_TABLES.sql
DROP TABLE IF EXISTS plan_calendar CASCADE;
DROP TABLE IF EXISTS training_plans CASCADE;
DROP FUNCTION IF EXISTS get_plan_workouts_count(UUID);
```

---

## 📊 Migration Impact

### Tables Modified:
- `workouts` - 3 new columns
- `routines` - 3 new columns
- `routine_exercises` - 1 new column

### Tables Created:
- `training_plans`
- `plan_calendar`

### Functions Created:
- `get_workout_context(workouts)`
- `get_routine_context(routines)`
- `get_plan_workouts_count(UUID)`

### Indexes Created:
- 8 new indexes on workouts/routines (for ownership queries)
- 4 new indexes on training_plans/plan_calendar

### RLS Policies Created:
- 8 policies (4 for training_plans, 4 for plan_calendar)
- All policies enforce staff-only access via `staff.org_id`

---

## ✅ Pre-Migration Checklist

Before running migrations:

- [ ] Backup your database (Supabase Dashboard → Database → Backups)
- [ ] Confirm you're running migrations on the correct project
- [ ] Verify the `staff` table exists with `org_id` and `user_id` columns
- [ ] Verify the `organizations` table exists
- [ ] Verify the `athletes` table exists
- [ ] Have rollback SQL ready (copy from above)

---

## 🚨 Known Issues

None at this time. Both the RLS policy error and organization_id column error have been fixed.

---

**Last Updated:** October 22, 2025
**Status:** ✅ Ready to migrate
**Next Action:** Run CREATE_TRAINING_PLANS_TABLES.sql first, then ADD_OWNERSHIP_CONTEXTS.sql
