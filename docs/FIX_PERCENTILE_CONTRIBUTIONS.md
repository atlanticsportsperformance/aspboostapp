# How to Fix Percentile Contributions System

## Problem
Youth athletes with 2+ tests are not showing up in `athlete_percentile_contributions` table.

## Root Cause
The SQL triggers were not set up when the tests were initially inserted, so the data wasn't automatically added to the contributions table.

## Solution (3 Steps)

### Step 1: Diagnose the Problem
Run this in Supabase SQL Editor to see what's wrong:

```sql
\i scripts/diagnose-youth-contributions.sql
```

This will show you:
- ✅ Which triggers exist (or ❌ which are missing)
- List of Youth athletes with 2+ tests but no contributions
- Sample test data to verify tests exist

### Step 2: Set Up the Triggers
Run this to create all the automatic triggers:

```sql
\i scripts/setup-percentile-contributions-triggers.sql
```

This creates:
- `trigger_cmj_contribution` on `cmj_tests`
- `trigger_sj_contribution` on `sj_tests`
- `trigger_hj_contribution` on `hj_tests`
- `trigger_ppu_contribution` on `ppu_tests`
- `trigger_imtp_contribution` on `imtp_tests`
- Helper functions to count tests and check eligibility

**After this step:** All NEW tests will automatically add contributions.

### Step 3: Backfill Existing Data
Run this to add contributions for tests that were inserted BEFORE the triggers existed:

```sql
\i scripts/backfill-contributions.sql
```

This will:
- Find all athletes with 2+ tests of each type
- Take their MOST RECENT test data
- Insert it into `athlete_percentile_contributions`
- Skip any that already exist (ON CONFLICT DO NOTHING)

## Verify It Worked

Run the verification script:

```sql
\i scripts/verify-percentile-system.sql
```

Look for:
- ✅ OK - Athlete has correct contributions
- ✅ OK (1st test) - Athlete only has 1 test (correctly not contributing)
- ❌ MISSING - Athlete should have contribution but doesn't (problem!)

## Example Output After Fix

Before:
```
| athlete_id | first_name | cmj_tests | cmj_contrib | cmj_status |
|------------|------------|-----------|-------------|------------|
| lincoln    | Lincoln    | 2         | 0           | ❌ MISSING |
```

After:
```
| athlete_id | first_name | cmj_tests | cmj_contrib | cmj_status |
|------------|------------|-----------|-------------|------------|
| lincoln    | Lincoln    | 2         | 1           | ✅ OK      |
```

## How It Works Going Forward

Once triggers are set up, the system is **fully automatic**:

1. Athlete takes Test #1 → Saved to `cmj_tests`, NOT added to contributions
2. Athlete takes Test #2 → Saved to `cmj_tests`, ADDED to contributions ✅
3. Athlete takes Test #3 → Saved to `cmj_tests`, UPDATES existing contribution

No application code needed - it's all SQL triggers!

## Files Reference

- `setup-percentile-contributions-triggers.sql` - Create all triggers
- `diagnose-youth-contributions.sql` - Check what's wrong
- `backfill-contributions.sql` - Fix existing data
- `verify-percentile-system.sql` - Verify everything works
- `PERCENTILE_DATA_FLOW.md` - Technical documentation of how data flows

## Quick Commands

```bash
# In Supabase SQL Editor, run these in order:

-- 1. See the problem
\i scripts/diagnose-youth-contributions.sql

-- 2. Set up triggers
\i scripts/setup-percentile-contributions-triggers.sql

-- 3. Fix existing data
\i scripts/backfill-contributions.sql

-- 4. Verify it worked
\i scripts/verify-percentile-system.sql
```

Done! 🎉
