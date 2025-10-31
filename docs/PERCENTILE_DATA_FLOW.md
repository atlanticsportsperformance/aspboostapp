# PERCENTILE DATA FLOW - Complete Architecture

## The Three Tables and Their Purposes

### 1. **Raw Test Tables** (cmj_tests, sj_tests, etc.)
- **Purpose**: Store ALL raw test data from VALD
- **Contains**: Every single test ever taken, all metrics, all trials
- **Never deleted**: Historical record of every test

### 2. **athlete_percentile_history**
- **Purpose**: Track percentile rankings over time for each test
- **Contains**: One row per metric per test (multiple rows per test)
- **Use case**: "Show me how this athlete's percentiles changed over time"
- **Example**: If Lincoln takes 5 CMJ tests, this table has 10 rows (2 metrics × 5 tests)

### 3. **athlete_percentile_contributions**
- **Purpose**: Contribute to percentile calculations (the lookup table)
- **Contains**: ONE row per test type per athlete (most recent test only)
- **Use case**: "What data should we use to calculate percentile benchmarks?"
- **Constraint**: `UNIQUE (athlete_id, test_type, playing_level)` - only ONE contribution per athlete per test type

---

## DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          VALD SYNC PROCESS                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: INSERT INTO RAW TEST TABLE (e.g., cmj_tests)                    │
│                                                                          │
│  INSERT INTO cmj_tests (                                                │
│    athlete_id,                                                          │
│    test_id,                                                             │
│    recorded_utc,                                                        │
│    peak_takeoff_power_trial_value,                                      │
│    bodymass_relative_takeoff_power_trial_value,                         │
│    ... all other metrics ...                                            │
│  )                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│ TRIGGER: auto_add_cmj_contribution│  │ APPLICATION CODE:                │
│                                  │  │ saveTestPercentileHistory()      │
│ Fires AFTER INSERT               │  │                                  │
│                                  │  │ Called from sync route           │
└──────────────────────────────────┘  └──────────────────────────────────┘
                    │                               │
                    │ Checks:                       │ Calculates percentiles
                    │ - Count tests for athlete     │ for each metric
                    │ - Get athlete's play_level    │
                    │ - Is this 2nd+ test?         │
                    │                               │
                    ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2a: INSERT INTO athlete_percentile_contributions                   │
│                                                                          │
│  IF test count >= 2:                                                    │
│    INSERT INTO athlete_percentile_contributions (                       │
│      athlete_id,                                                        │
│      test_type = 'CMJ',                                                 │
│      playing_level,                                                     │
│      test_id,                                                           │
│      test_date,                                                         │
│      peak_takeoff_power_trial_value,                                    │
│      bodymass_relative_takeoff_power_trial_value                        │
│    )                                                                    │
│    ON CONFLICT (athlete_id, test_type, playing_level)                  │
│    DO UPDATE ... (replaces old test with new test)                     │
│                                                                          │
│  ELSE:                                                                  │
│    SKIP - First test doesn't contribute                                 │
└─────────────────────────────────────────────────────────────────────────┘
                    │                               │
                    │                               ▼
                    │              ┌──────────────────────────────────┐
                    │              │ STEP 2b: INSERT INTO             │
                    │              │ athlete_percentile_history       │
                    │              │                                  │
                    │              │ Multiple rows (one per metric):  │
                    │              │ - Peak Power (W)                 │
                    │              │ - Peak Power / BM (W/kg)         │
                    │              │                                  │
                    │              │ Each row contains:               │
                    │              │ - percentile_play_level          │
                    │              │ - percentile_overall             │
                    │              └──────────────────────────────────┘
                    │                               │
                    ▼                               │
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: TRIGGER ON athlete_percentile_contributions                     │
│                                                                          │
│  Fires: auto_update_percentiles                                         │
│  Purpose: Recalculate percentile_lookup table                          │
│  Status: TODO - needs implementation                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## EXAMPLE: LINCOLN BELIVEAU TAKES 2 CMJ TESTS

### TEST #1 (First CMJ ever)

**Raw Test Table:**
```sql
cmj_tests:
| id | athlete_id | test_id | recorded_utc | peak_power | rel_power |
|----|------------|---------|--------------|------------|-----------|
| 1  | lincoln    | test-1  | 2025-10-15   | 1234.5     | 45.6      |
```

**Percentile History:** (2 rows created by application code)
```sql
athlete_percentile_history:
| athlete_id | test_type | metric_name        | value  | percentile_play_level | percentile_overall |
|------------|-----------|--------------------|---------|-----------------------|-------------------|
| lincoln    | CMJ       | Peak Power (W)     | 1234.5  | 65                    | 72                |
| lincoln    | CMJ       | Peak Power/BM      | 45.6    | 68                    | 75                |
```

**Contributions Table:** ❌ EMPTY (first test doesn't contribute)
```sql
athlete_percentile_contributions:
(no rows)
```

---

### TEST #2 (Second CMJ)

**Raw Test Table:** (new row added)
```sql
cmj_tests:
| id | athlete_id | test_id | recorded_utc | peak_power | rel_power |
|----|------------|---------|--------------|------------|-----------|
| 1  | lincoln    | test-1  | 2025-10-15   | 1234.5     | 45.6      |
| 2  | lincoln    | test-2  | 2025-10-20   | 1456.7     | 48.2      | ← NEW
```

**Percentile History:** (2 more rows added - now 4 total)
```sql
athlete_percentile_history:
| athlete_id | test_type | test_id | metric_name        | value  | percentile_play_level |
|------------|-----------|---------|--------------------|---------|-----------------------|
| lincoln    | CMJ       | test-1  | Peak Power (W)     | 1234.5  | 65                    |
| lincoln    | CMJ       | test-1  | Peak Power/BM      | 45.6    | 68                    |
| lincoln    | CMJ       | test-2  | Peak Power (W)     | 1456.7  | 72                    | ← NEW
| lincoln    | CMJ       | test-2  | Peak Power/BM      | 48.2    | 75                    | ← NEW
```

**Contributions Table:** ✅ NOW HAS DATA (2nd test triggers contribution)
```sql
athlete_percentile_contributions:
| athlete_id | test_type | playing_level | test_id | peak_power | rel_power |
|------------|-----------|---------------|---------|------------|-----------|
| lincoln    | CMJ       | Youth         | test-2  | 1456.7     | 48.2      | ← ADDED
```

---

## WHY YOUR YOUTH ATHLETES AREN'T GETTING ADDED

The issue is likely one of these:

### Problem 1: Triggers Don't Exist Yet
The triggers in my SQL file need to be run first. Check if they exist:

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%contribution%';
```

If no results → **Triggers don't exist** → Run `setup-percentile-contributions-triggers.sql`

### Problem 2: Tests Were Inserted BEFORE Triggers Were Created
If the tests were already in `cmj_tests` before you created the triggers, they won't retroactively add contributions.

**Solution**: Manually backfill contributions for existing athletes with 2+ tests

### Problem 3: Athlete Has No play_level Set
The trigger checks `athletes.play_level` - if it's NULL, the trigger skips adding contribution.

```sql
-- Check if athlete has play_level
SELECT id, first_name, last_name, play_level
FROM athletes
WHERE play_level IS NULL;
```

---

## BACKFILL SCRIPT (If triggers were added after tests)

```sql
-- Manually add contributions for athletes with 2+ tests
-- Run this AFTER setting up triggers to catch existing tests

-- CMJ
INSERT INTO athlete_percentile_contributions (
  athlete_id,
  test_type,
  playing_level,
  test_id,
  test_date,
  peak_takeoff_power_trial_value,
  bodymass_relative_takeoff_power_trial_value
)
SELECT DISTINCT ON (c.athlete_id)
  c.athlete_id,
  'CMJ',
  a.play_level,
  c.test_id,
  c.recorded_utc,
  c.peak_takeoff_power_trial_value,
  c.bodymass_relative_takeoff_power_trial_value
FROM cmj_tests c
JOIN athletes a ON a.id = c.athlete_id
WHERE a.play_level IS NOT NULL
  AND (
    SELECT COUNT(*)
    FROM cmj_tests
    WHERE athlete_id = c.athlete_id
  ) >= 2
ORDER BY c.athlete_id, c.recorded_utc DESC
ON CONFLICT (athlete_id, test_type, playing_level) DO NOTHING;

-- Repeat for SJ, HJ, PPU, IMTP...
```

---

## SUMMARY

**Data Flow:**
1. **cmj_tests** (raw data) → ALL tests stored here
2. **athlete_percentile_history** (historical tracking) → Created by application code for EVERY test
3. **athlete_percentile_contributions** (for calculations) → Created by SQL trigger for 2nd+ test ONLY

**Two Separate Processes:**
- ✅ Application code → Creates `athlete_percentile_history` rows
- ✅ SQL Trigger → Creates `athlete_percentile_contributions` rows

**They are independent!** Both happen, but serve different purposes.

**Why your Youth athletes aren't showing up:**
Most likely: Triggers weren't set up yet when tests were inserted. Need to backfill.
