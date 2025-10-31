# Youth Percentile Complete Fix Summary

## Problem Identified

You have **3 Youth athletes** with test data in `athlete_percentile_history`, but only **1 athlete** has contributions in `athlete_percentile_contributions`, and **0 Youth percentiles** exist in `percentile_lookup`.

### Root Causes:

1. **Missing Contributions** - 1 athlete (Chris Stracco) has 2+ tests but no contributions
2. **Missing Percentiles** - Youth percentiles have never been calculated for `percentile_lookup`
3. **Application Error** - Sync route was calling non-existent SQL function `add_to_percentile_contributions`

## Analysis Results

### Youth Athletes Breakdown:

| Athlete | CMJ | SJ | HJ | PPU | IMTP | Expected Contributions |
|---------|-----|----|----|-----|------|----------------------|
| **f8f13a34...** | 1 | 1 | 1 | 1 | 1 | 0 (all first tests) ✅ |
| **cb209d13...** (Emmitt) | 3 | 4 | 2 | 1 | 2 | CMJ, SJ, HJ, IMTP (4) ✅ |
| **90ae7b7b...** (Chris) | 2 | 2 | 2 | 2 | 1 | CMJ, SJ, HJ, PPU (4) ❌ MISSING |

**Expected:** 8 total contributions
**Actual:** 4 contributions (Emmitt only)
**Missing:** Chris Stracco's 4 contributions

## Fixes Applied

### Fix 1: Removed TypeScript Contribution Code ✅

**File:** `app/api/athletes/[id]/vald/sync/route.ts`

**Changed:**
- Removed import: `import { addPercentileContribution, extractMetricsFromTest }`
- Removed lines 295-316 that called `addPercentileContribution()`
- Added comment explaining SQL triggers handle this now

**Reason:**
- You wanted "SQL only" approach (no TypeScript)
- The function `add_to_percentile_contributions` doesn't exist in database
- SQL triggers will handle this automatically once deployed

### Fix 2: Created Backfill Script

**File:** `scripts/backfill-contributions.sql` (already existed)

**Purpose:**
- Retroactively adds contributions for tests inserted before triggers were created
- Uses `ON CONFLICT DO NOTHING` so it's safe to run multiple times
- Will add Chris Stracco's 4 missing contributions

### Fix 3: Created Percentile Calculation Scripts

**Files:**
- `scripts/calculate-youth-percentiles.sql` - Calculate Youth percentiles only
- `scripts/calculate-all-custom-percentiles.sql` - Calculate Youth + Pro percentiles

**Purpose:**
- Populate `percentile_lookup` table with Youth data
- Calculate percentiles from `athlete_percentile_contributions` data

### Fix 4: Created Diagnostic Tools

**Files:**
- `scripts/check-youth-contributions.js` - Check specific athlete
- `scripts/check-actual-contributions.js` - Verify all contributions
- `scripts/check-percentile-lookup.js` - Verify lookup table
- `scripts/analyze-youth-history.js` - Analyze history data
- `scripts/diagnose-missing-athlete.js` - Debug specific athlete

### Fix 5: Created Documentation

**Files:**
- `docs/FIX_YOUTH_PERCENTILES.md` - Complete fix guide
- `docs/RUN_BACKFILL_INSTRUCTIONS.md` - Step-by-step backfill instructions
- `docs/YOUTH_PERCENTILE_COMPLETE_FIX.md` - This summary

## Next Steps

### Step 1: Deploy SQL Triggers (If Not Already Done)

Open Supabase SQL Editor and run:

```sql
-- File: scripts/setup-percentile-contributions-triggers.sql
```

This creates triggers on all test tables (cmj_tests, sj_tests, etc.) that automatically add contributions when an athlete takes their 2nd+ test.

### Step 2: Run Backfill Script

Open Supabase SQL Editor and run:

```sql
-- File: scripts/backfill-contributions.sql
```

This will:
- Add Chris Stracco's 4 missing contributions
- Won't duplicate Emmitt's existing contributions (due to ON CONFLICT)

**Verify it worked:**

```bash
node -r dotenv/config scripts/check-actual-contributions.js dotenv_config_path=.env.local
```

Expected output: `Total Youth contributions in database: 8`

### Step 3: Calculate Youth Percentiles

Open Supabase SQL Editor and run:

```sql
-- File: scripts/calculate-youth-percentiles.sql
```

This will populate the `percentile_lookup` table with Youth percentile data.

**Verify it worked:**

```bash
node -r dotenv/config scripts/check-percentile-lookup.js dotenv_config_path=.env.local
```

Expected output:
```
1. PLAY LEVELS IN LOOKUP TABLE:
   - College
   - High School
   - Youth         ← NEW!
```

### Step 4: Test with an Athlete

1. Go to a Youth athlete's profile
2. Click "Sync VALD Data"
3. Check Force Profile page
4. Percentiles should show actual values instead of 0

## How It Works Now

### Data Flow:

```
┌──────────────────────────────────────────────────┐
│  1. Athlete Takes Test (VALD Force Plates)      │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  2. Sync API Called  │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────────────────┐
         │  3. Test Data Inserted           │
         │     cmj_tests, sj_tests, etc.    │
         └────────┬─────────────────────────┘
                  │
          ┌───────┴────────┐
          │                │
          ▼                ▼
┌─────────────────┐   ┌────────────────────────────┐
│ 4a. TypeScript  │   │ 4b. SQL Trigger Fires      │
│ Code Runs       │   │ (AFTER INSERT)             │
│                 │   │                            │
│ Saves to:       │   │ IF athlete has 2+ tests:   │
│ - percentile_   │   │   INSERT INTO percentile_  │
│   history       │   │   contributions            │
│ (ALL tests)     │   │ (2nd+ tests only)          │
└─────────────────┘   └────────────────────────────┘
                               │
                               ▼
                    ┌────────────────────────┐
                    │ 5. Monthly Job         │
                    │ (Manual for now)       │
                    │                        │
                    │ Runs:                  │
                    │ calculate-youth-       │
                    │ percentiles.sql        │
                    └──────────┬─────────────┘
                               │
                               ▼
                    ┌────────────────────────┐
                    │ 6. Percentile Lookup   │
                    │ Table Updated          │
                    │                        │
                    │ Youth benchmarks       │
                    │ recalculated           │
                    └────────────────────────┘
```

### Two Independent Tables:

1. **`athlete_percentile_history`**
   - Created by: TypeScript code (every test)
   - Purpose: Track individual athlete percentile changes over time
   - One row per test per metric
   - Example: Emmitt's CMJ on 10/15 was 43rd percentile

2. **`athlete_percentile_contributions`**
   - Created by: SQL triggers (2nd+ test only)
   - Purpose: Contribute to percentile benchmark calculations
   - One row per athlete per test type
   - Example: Use Emmitt's most recent CMJ for Youth benchmarks

3. **`percentile_lookup`**
   - Created by: Running calculate SQL scripts (manually for now)
   - Purpose: Fast percentile lookups
   - Many rows per metric (100+ percentile points)
   - Example: CMJ Peak Power 1400W = 35th percentile for Youth

## Important Notes

### Sample Size

With only 2-3 Youth athletes:
- Percentiles will be based on very small sample
- Not statistically meaningful
- Every value will cluster near 0%, 50%, or 100%

**Recommendation:** Wait for 10-20+ Youth athletes before relying on Youth percentiles.

### Maintenance

**When to re-run backfill:**
- After bulk importing historical data
- If you notice missing contributions

**When to recalculate percentiles:**
- Monthly or quarterly as more athletes are added
- When sample size grows significantly (e.g., 5 → 20 athletes)
- After correcting/cleaning athlete data

**Future enhancement:**
- Create automated job to recalculate percentiles monthly
- Use Supabase Edge Functions or cron job

## Verification Checklist

After completing all steps, verify:

- [ ] No errors in Supabase SQL Editor output
- [ ] 8 Youth contributions in `athlete_percentile_contributions` table
- [ ] Youth data exists in `percentile_lookup` table (all metrics)
- [ ] Sync API runs without errors (no `add_to_percentile_contributions` error)
- [ ] Youth athlete pages show actual percentile values (not 0)
- [ ] Force Profile page displays correctly

## Troubleshooting

### Issue: Sync API still shows error

**Solution:** Make sure you've saved the changes to `sync/route.ts` and restarted your dev server.

### Issue: Contributions still missing after backfill

**Possible causes:**
1. Athlete doesn't have `play_level` set
2. Athlete has < 2 tests for that test type
3. SQL error in backfill (check Supabase logs)

**Debug:**
```bash
node -r dotenv/config scripts/diagnose-missing-athlete.js dotenv_config_path=.env.local
```

### Issue: Percentiles still showing 0

**Possible causes:**
1. `percentile_lookup` table doesn't have Youth data
2. Column name mismatch (e.g., expecting `sj_peak_power` but lookup has `peak_power`)
3. Caching issue in browser

**Debug:**
```bash
node -r dotenv/config scripts/check-percentile-lookup.js dotenv_config_path=.env.local
```

## Summary

✅ **Fixed Application Error** - Removed non-existent function call
✅ **Identified Missing Data** - Chris Stracco needs 4 contributions
✅ **Created Backfill Script** - Will add missing contributions
✅ **Created Percentile Script** - Will populate Youth benchmarks
✅ **Created Diagnostic Tools** - For troubleshooting and verification

**Current State:**
- 4/8 contributions present (Emmitt only)
- 0 Youth percentiles in lookup table
- Application code fixed (no more errors)

**After Running Scripts:**
- 8/8 contributions present (Emmitt + Chris)
- Youth percentiles populated in lookup table
- Youth athletes will see real percentile values

All files are ready to run. You just need to execute the SQL scripts in Supabase SQL Editor.
