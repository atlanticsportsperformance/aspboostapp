# Auto-Contribution System for Percentile Database

## Overview

This system automatically adds qualified athletes to the `athlete_percentile_contributions` table, which feeds into percentile calculations alongside Driveline seed data.

## How It Works

### The Goal

Create a **self-growing percentile database** where:
1. Athletes start by being compared against Driveline seed data (baseline)
2. After completing 2 full test sessions, their data gets "locked in"
3. Future percentile calculations use BOTH Driveline + your athletes
4. Database continuously improves with more real-world data

### Qualification Criteria

An athlete qualifies for contribution when:
- ✅ They have completed **2 or more complete test sessions**
- ✅ A "complete session" = all 5 tests on the same calendar day:
  - CMJ (Counter Movement Jump)
  - SJ (Squat Jump)
  - HJ (Hop Test)
  - PPU (Prone Push-Up)
  - IMTP (Isometric Mid-Thigh Pull)

### Database Structure

```sql
athlete_percentile_contributions (
  athlete_id,           -- UUID of athlete
  test_type,            -- CMJ, SJ, HJ, PPU, or IMTP
  playing_level,        -- Youth, High School, College, Pro
  test_id,              -- VALD test ID
  test_date,            -- When test was recorded
  [50+ metric columns], -- All test metrics for calculations

  UNIQUE(athlete_id, test_type, playing_level)  -- One contribution per test type
)
```

## System Components

### 1. Trigger Function

**Function:** `check_and_add_percentile_contribution()`

**What it does:**
1. Fires after every test insert
2. Counts athlete's complete sessions (days with all 5 tests)
3. If count >= 2, inserts contribution row
4. Unique constraint prevents duplicates

### 2. Triggers

**Triggers on:**
- `cmj_tests` → `auto_add_contribution_cmj`
- `sj_tests` → `auto_add_contribution_sj`
- `hj_tests` → `auto_add_contribution_hj`
- `ppu_tests` → `auto_add_contribution_ppu`
- `imtp_tests` → `auto_add_contribution_imtp`

**Timing:** AFTER INSERT (doesn't block the insert)

## Installation

### Option 1: Run Master Script (Recommended)

```bash
# Set environment variables and run complete setup
set -a && source .env.local && set +a
npx tsx scripts/setup-auto-contribution-complete.ts
```

This will:
1. ✅ Apply SQL migration (create triggers + function)
2. ✅ Backfill Colin Ma's missing contributions
3. ✅ Run tests to verify everything works

### Option 2: Step-by-Step Manual Setup

```bash
# 1. Apply SQL migration
npx tsx scripts/apply-auto-contribution-system.ts

# 2. Backfill existing athletes
npx tsx scripts/backfill-colin-contributions.ts

# 3. Test the system
npx tsx scripts/test-auto-contribution-system.ts
```

### Option 3: Direct SQL (Supabase Dashboard)

1. Open Supabase SQL Editor
2. Copy contents of `scripts/create-auto-contribution-system.sql`
3. Execute the SQL
4. Run test script to verify

## Expected Behavior

### Scenario 1: New Athlete - First Session

```
Day 1: Athlete completes all 5 tests
  ↓
VALD Sync runs
  ↓
Tests inserted into cmj_tests, sj_tests, hj_tests, ppu_tests, imtp_tests
  ↓
Triggers fire → Check complete sessions
  ↓
Result: Only 1 complete session found
  ↓
❌ NOT added to athlete_percentile_contributions (waiting for 2nd session)
```

### Scenario 2: New Athlete - Second Session

```
Day 15: Athlete completes all 5 tests again
  ↓
VALD Sync runs
  ↓
Tests inserted into test tables
  ↓
Triggers fire → Check complete sessions
  ↓
Result: 2 complete sessions found!
  ↓
✅ 5 rows inserted into athlete_percentile_contributions
    - CMJ contribution
    - SJ contribution
    - HJ contribution
    - PPU contribution
    - IMTP contribution
  ↓
Athlete now part of percentile calculations!
```

### Scenario 3: Existing Contributor - Third Session

```
Day 30: Athlete completes tests again
  ↓
Tests inserted
  ↓
Triggers fire → Check if already contributing
  ↓
Result: UNIQUE constraint prevents duplicate
  ↓
✅ No duplicate created (working as designed)
  ↓
Tests stored for progress tracking only
```

## Verification Queries

### Check All Triggers Exist

```sql
SELECT
  event_object_table,
  trigger_name,
  action_timing || ' ' || event_manipulation as trigger_action
FROM information_schema.triggers
WHERE event_object_table IN ('cmj_tests', 'sj_tests', 'hj_tests', 'ppu_tests', 'imtp_tests')
  AND trigger_schema = 'public'
ORDER BY event_object_table;

-- Expected: 5 rows (one per test table)
```

### Check Function Exists

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'check_and_add_percentile_contribution';

-- Expected: 1 row
```

### Check Athlete Contributions

```sql
SELECT
  a.first_name,
  a.last_name,
  apc.test_type,
  apc.playing_level,
  apc.test_date
FROM athlete_percentile_contributions apc
JOIN athletes a ON a.id = apc.athlete_id
ORDER BY a.last_name, apc.test_type;
```

### Find Athletes Eligible for Contribution

```sql
-- Count complete sessions per athlete
WITH session_dates AS (
  SELECT athlete_id, DATE(recorded_utc) as session_date, 'CMJ' as test_type FROM cmj_tests
  UNION ALL
  SELECT athlete_id, DATE(recorded_utc), 'SJ' FROM sj_tests
  UNION ALL
  SELECT athlete_id, DATE(recorded_utc), 'HJ' FROM hj_tests
  UNION ALL
  SELECT athlete_id, DATE(recorded_utc), 'PPU' FROM ppu_tests
  UNION ALL
  SELECT athlete_id, DATE(recorded_utc), 'IMTP' FROM imtp_tests
),
complete_sessions AS (
  SELECT
    athlete_id,
    session_date,
    COUNT(DISTINCT test_type) as tests_completed
  FROM session_dates
  GROUP BY athlete_id, session_date
  HAVING COUNT(DISTINCT test_type) = 5
)
SELECT
  a.first_name,
  a.last_name,
  COUNT(*) as complete_session_count,
  CASE
    WHEN COUNT(*) >= 2 THEN 'Should contribute'
    ELSE 'Needs more sessions'
  END as status
FROM complete_sessions cs
JOIN athletes a ON a.id = cs.athlete_id
GROUP BY a.id, a.first_name, a.last_name
ORDER BY complete_session_count DESC;
```

## Troubleshooting

### Problem: Triggers not firing

**Check:**
```sql
-- Verify triggers exist
SELECT * FROM information_schema.triggers
WHERE trigger_name LIKE 'auto_add_contribution%';
```

**Fix:**
```bash
# Re-apply migration
npx tsx scripts/apply-auto-contribution-system.ts
```

### Problem: Athlete has 2 sessions but no contributions

**Check:**
1. Do they have 2 COMPLETE sessions (all 5 tests same day)?
2. Is their play_level set?
3. Are the tests on different calendar days?

**Debug Query:**
```sql
-- Replace {athlete_id} with actual UUID
WITH session_dates AS (
  SELECT DATE(recorded_utc) as session_date, 'CMJ' as test_type FROM cmj_tests WHERE athlete_id = '{athlete_id}'
  UNION ALL
  SELECT DATE(recorded_utc), 'SJ' FROM sj_tests WHERE athlete_id = '{athlete_id}'
  UNION ALL
  SELECT DATE(recorded_utc), 'HJ' FROM hj_tests WHERE athlete_id = '{athlete_id}'
  UNION ALL
  SELECT DATE(recorded_utc), 'PPU' FROM ppu_tests WHERE athlete_id = '{athlete_id}'
  UNION ALL
  SELECT DATE(recorded_utc), 'IMTP' FROM imtp_tests WHERE athlete_id = '{athlete_id}'
)
SELECT
  session_date,
  COUNT(DISTINCT test_type) as tests_completed,
  STRING_AGG(DISTINCT test_type, ', ') as tests
FROM session_dates
GROUP BY session_date
ORDER BY session_date;

-- Each row with tests_completed = 5 is a complete session
```

### Problem: Duplicate contributions error

**This is normal!** The UNIQUE constraint prevents duplicates.

The trigger uses `ON CONFLICT DO NOTHING`, so duplicate attempts are silently ignored.

### Problem: Athlete added too early (only 1 session)

**This should not happen** if triggers are working correctly.

**Check:**
```sql
-- Manually verify complete session count for athlete
-- (Use debug query above)
```

If bug confirmed, file issue with reproduction steps.

## Files Created

### SQL Migration
- `scripts/create-auto-contribution-system.sql` - Complete SQL for triggers + function

### TypeScript Scripts
- `scripts/apply-auto-contribution-system.ts` - Applies SQL migration
- `scripts/backfill-colin-contributions.ts` - Backfills missing contributions
- `scripts/test-auto-contribution-system.ts` - Tests entire system
- `scripts/setup-auto-contribution-complete.ts` - Master setup script (runs all 3)

### Analysis Scripts
- `scripts/analyze-colin-percentile-contributions.ts` - Analyzes why Colin only had IMTP
- `scripts/check-trigger-system.ts` - Checks if triggers exist

### Documentation
- `docs/AUTO_CONTRIBUTION_SYSTEM.md` - This file

## Summary

### Before This System
- ❌ Manual process to add athletes to contributions
- ❌ Easy to forget or miss athletes
- ❌ Colin Ma only had IMTP (manually added)
- ❌ No automation

### After This System
- ✅ Fully automated after 2nd complete session
- ✅ No manual intervention needed
- ✅ Colin Ma has all 5 contributions
- ✅ System scales automatically
- ✅ Database grows with every qualified athlete
- ✅ Percentiles become more accurate over time

## Next Steps

1. ✅ **Apply the system** - Run `setup-auto-contribution-complete.ts`
2. ✅ **Verify it works** - Check test results
3. 🧪 **Test with real data** - Sync a new athlete with 2 sessions
4. 📊 **Monitor growth** - Watch contributions table grow
5. 🎯 **Enjoy accurate percentiles** - Your data + Driveline = best rankings

---

**Questions?** Review the troubleshooting section or check `scripts/test-auto-contribution-system.ts` output.
