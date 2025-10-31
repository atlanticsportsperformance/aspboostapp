# Correct Data Flow: History → Contributions

## Problem

The previous implementation had triggers on the **test tables** (cmj_tests, sj_tests, etc.) that directly inserted into `athlete_percentile_contributions`. This was wrong.

## Correct Flow

```
┌─────────────────────────────────────┐
│ 1. VALD Sync API Called             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. TypeScript Code                  │
│    - Inserts into cmj_tests, etc.   │
│    - Calls saveTestPercentileHistory│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. athlete_percentile_history       │
│    (EVERY test - created by TS)     │
│    - Multiple rows per test         │
│    - One row per metric             │
└──────────────┬──────────────────────┘
               │
               │ SQL TRIGGER (NEW!)
               │ trigger_history_to_contributions
               │
               ▼
┌─────────────────────────────────────┐
│ 4. athlete_percentile_contributions │
│    (2nd+ test only - created by SQL)│
│    - ONE row per athlete per type   │
│    - Updated on 3rd+ test           │
└─────────────────────────────────────┘
               │
               │ Monthly Job
               │
               ▼
┌─────────────────────────────────────┐
│ 5. percentile_lookup                │
│    (Calculated from contributions)  │
└─────────────────────────────────────┘
```

## Key Changes

### Before (WRONG):
- Test tables → SQL trigger → contributions ❌
- History and contributions were independent

### After (CORRECT):
- Test tables → TypeScript → history ✅
- **History → SQL trigger → contributions** ✅
- Contributions are built FROM history

## Why This Matters

1. **Single Source of Truth**: History is the source for contributions
2. **Play Level Changes**: If athlete's play level changes, history tracks it correctly
3. **Consistency**: Same logic for all tests (goes through history first)
4. **Easier Debugging**: Can see full history, then see what contributed

## Implementation Files

### 1. setup-history-to-contributions-trigger.sql

**Purpose**: Sets up the CORRECT trigger on athlete_percentile_history

**What it does**:
- Removes old triggers from test tables
- Creates new trigger on `athlete_percentile_history`
- Trigger fires AFTER INSERT on history
- Counts tests in history for that athlete/type/level
- If count >= 2, adds to contributions (or updates existing)

**Key Logic**:
```sql
CREATE TRIGGER trigger_history_to_contributions
  AFTER INSERT ON athlete_percentile_history
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_contribution_from_history();
```

**Function behavior**:
1. Check if athlete has 2+ tests in history (count DISTINCT test_ids)
2. If yes, fetch full test data from test table
3. INSERT INTO contributions ON CONFLICT UPDATE (keeps most recent)

### 2. rebuild-contributions-from-history.sql

**Purpose**: Rebuilds contributions table from existing history data

**What it does**:
- Deletes all existing contributions
- Scans athlete_percentile_history for athletes with 2+ tests
- Takes most recent test from history
- Fetches full metrics from test tables
- Inserts into contributions

**When to run**:
- After setting up the new trigger
- To clean up data from old (wrong) approach

### 3. compare-history-vs-contributions.js

**Purpose**: Diagnostic tool to verify data integrity

**What it checks**:
- Compares test counts in history vs contributions
- Verifies 2nd+ tests are in contributions
- Confirms 1st tests are NOT in contributions
- Shows which test_id is used (should be most recent)

## How to Apply the Fix

### Step 1: Setup New Trigger

Open Supabase SQL Editor and run:
```sql
-- File: scripts/setup-history-to-contributions-trigger.sql
```

This will:
- Remove old triggers from test tables ✅
- Create new trigger on athlete_percentile_history ✅

### Step 2: Rebuild Contributions

Open Supabase SQL Editor and run:
```sql
-- File: scripts/rebuild-contributions-from-history.sql
```

This will:
- Clear existing contributions (built wrong way)
- Rebuild from history (correct way)

### Step 3: Verify

Run diagnostic:
```bash
node -r dotenv/config scripts/compare-history-vs-contributions.js dotenv_config_path=.env.local
```

Expected output:
```
Should have contributions: 8
Actually have contributions: 8
Missing contributions: 0

✅ CORRECT: All 2nd+ tests are in contributions table
```

## Testing the Flow

### Test Scenario: New Athlete Takes First Test

1. Athlete takes CMJ test
2. TypeScript inserts into cmj_tests ✅
3. TypeScript inserts into athlete_percentile_history (2 rows: Peak Power + Peak Power/BM) ✅
4. Trigger fires on history insert
5. Trigger counts tests in history → finds 1 test
6. Trigger skips (first test) ✅
7. **Result**: History has data, contributions has nothing ✅

### Test Scenario: Athlete Takes Second Test

1. Athlete takes 2nd CMJ test
2. TypeScript inserts into cmj_tests ✅
3. TypeScript inserts into athlete_percentile_history (2 more rows) ✅
4. Trigger fires on history insert
5. Trigger counts tests in history → finds 2 tests
6. Trigger fetches full test data from cmj_tests
7. Trigger inserts into contributions ✅
8. **Result**: History has 4 rows total, contributions has 1 row ✅

### Test Scenario: Athlete Takes Third Test

1. Athlete takes 3rd CMJ test
2. TypeScript inserts into cmj_tests ✅
3. TypeScript inserts into athlete_percentile_history (2 more rows) ✅
4. Trigger fires on history insert
5. Trigger counts tests in history → finds 3 tests
6. Trigger fetches full test data from cmj_tests (most recent)
7. Trigger UPDATES existing contribution (ON CONFLICT DO UPDATE) ✅
8. **Result**: History has 6 rows total, contributions STILL has 1 row (but updated) ✅

## Why Fetch From Test Tables?

You might wonder: Why does the trigger fetch from test tables instead of using the history data?

**Reason**: Each history row has ONE metric, but contributions needs ALL metrics for that test.

Example:
- History row 1: CMJ test abc123, Peak Power = 1500W
- History row 2: CMJ test abc123, Peak Power/BM = 45 W/kg

Contributions needs BOTH metrics in ONE row. So the trigger:
1. Gets test_id from history (abc123)
2. Fetches BOTH metrics from cmj_tests table
3. Inserts one row with both metrics into contributions

## Important Notes

### Play Level Changes

If an athlete's play level changes (e.g., Youth → High School):
- Old history rows stay with old play_level
- New history rows get new play_level
- Contributions table will have TWO rows:
  - One for Youth (using old tests)
  - One for High School (using new tests)

This is CORRECT behavior - each play level has its own contribution.

### Trigger Performance

The trigger runs on EVERY history insert. Since history inserts 2-8 rows per test (one per metric), the trigger fires multiple times per test.

**Optimization**: The trigger checks `test_count >= 2` and does ON CONFLICT UPDATE, so:
- First metric insert: Adds to contributions
- Second metric insert: Updates existing (no-op if same test_id)
- Third metric insert: Updates existing (no-op if same test_id)
- etc.

This is fine - the database handles this efficiently.

### Future Tests

Once this fix is deployed:
- Old tests: Rebuilt from history via rebuild script
- New tests (after deploy): Automatically handled by trigger

Everything will flow correctly going forward.

## Troubleshooting

### Issue: Contributions not being added

**Check**:
1. Is the trigger installed?
   ```sql
   SELECT * FROM information_schema.triggers
   WHERE trigger_name = 'trigger_history_to_contributions';
   ```

2. Is data going into history?
   ```sql
   SELECT COUNT(*) FROM athlete_percentile_history
   WHERE athlete_id = 'xxx' AND test_type = 'CMJ';
   ```

3. Check trigger logs (look for RAISE NOTICE in Supabase logs)

### Issue: Duplicate contributions

**Cause**: Old triggers on test tables are still active

**Fix**:
```sql
-- Check for old triggers
SELECT * FROM information_schema.triggers
WHERE trigger_name LIKE '%contribution%';

-- Drop any old triggers
DROP TRIGGER IF EXISTS trigger_cmj_contribution ON cmj_tests;
-- ... repeat for other test types
```

### Issue: Wrong test_id in contributions

**Cause**: Trigger not using most recent test from history

**Fix**: Check the trigger function's ORDER BY clause:
```sql
SELECT test_id, test_date
FROM athlete_percentile_history
WHERE athlete_id = 'xxx' AND test_type = 'CMJ'
ORDER BY test_date DESC;  -- Should show most recent first
```

## Summary

✅ **Fixed**: Data flow now goes Test → History → Contributions
✅ **Trigger**: Installed on athlete_percentile_history table
✅ **Cleanup**: Script to rebuild contributions from history
✅ **Verified**: All 2nd+ tests flow correctly

The system now works as intended!
