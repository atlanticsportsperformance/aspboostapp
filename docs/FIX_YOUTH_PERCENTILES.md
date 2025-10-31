# Fix Youth Percentiles Issue

## Problem Summary

Youth athletes are showing **null values** and **0 counts** in the `percentile_lookup` table because:

1. ✅ **Data IS in `athlete_percentile_contributions`** - The backfill script worked!
2. ❌ **Data NOT in `percentile_lookup`** - Youth percentiles have never been calculated

The `percentile_lookup` table only contains:
- **College** - 808 records (from Driveline baseline data)
- **High School** - 808 records (from Driveline baseline data)
- **No Youth data** - Missing!
- **No Pro data** - Missing!

## Root Cause

The `percentile_lookup` table was populated with Driveline's baseline data, which only covers College and High School play levels. You need to **calculate Youth and Pro percentiles from your own athlete data**.

## Solution

Calculate percentiles from the `athlete_percentile_contributions` table.

### Step 1: Verify You Have Youth Contributions

Run this to check:

```bash
node -r dotenv/config scripts/run-calculate-youth-percentiles.js dotenv_config_path=.env.local
```

Expected output:
```
Youth Contributions by Test Type:
   CMJ: X athletes
   SJ: X athletes
   HJ: X athletes
   ...
```

**IMPORTANT:** You currently only have **1 Youth athlete** (Emmitt Bliss-Chin) with contributions. This means:
- Percentiles will only be based on 1 athlete
- Every value will be at the 100th percentile (since there's only one data point)

**To get meaningful Youth percentiles, you need:**
- More Youth athletes in your system
- Each Youth athlete to have taken at least 2 tests (so they contribute to the percentile pool)

### Step 2: Calculate Youth Percentiles

You have two options:

#### Option A: Use Supabase SQL Editor (Recommended)

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: SQL Editor
3. Open the file: `scripts/calculate-youth-percentiles.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click "Run"

#### Option B: Use PostgreSQL CLI

If you have `psql` installed:

```bash
psql <your-database-url> -f scripts/calculate-youth-percentiles.sql
```

### Step 3: Verify the Calculation Worked

Run the diagnostic script:

```bash
node -r dotenv/config scripts/check-percentile-lookup.js dotenv_config_path=.env.local
```

You should see:
```
1. PLAY LEVELS IN LOOKUP TABLE:
   - College
   - High School
   - Youth         ← NEW!

3. YOUTH METRICS IN LOOKUP TABLE:
   ✅ Youth data found!
```

### Step 4: Test with a Youth Athlete

After calculating percentiles, sync a Youth athlete's test data to see if percentiles appear:

1. Go to an athlete with Youth play level
2. Click "Sync VALD Data"
3. Check the Force Profile page
4. Percentiles should now show up (instead of 0)

## Expected Behavior After Fix

### Before Fix:
```sql
-- percentile_history shows 0 for Youth
percentile_play_level: 0
percentile_overall: 0
```

### After Fix:
```sql
-- percentile_history shows actual percentiles
percentile_play_level: 45  ← Based on Youth athletes only
percentile_overall: 23     ← Based on all athletes
```

## How Percentiles Are Calculated

The calculation uses this logic:

1. **Group all values** from `athlete_percentile_contributions` for Youth play level
2. **Rank them** from lowest to highest
3. **Calculate percentile** = (cumulative count / total count) × 100
4. **Store in lookup table** with 100+ data points per metric

### Example:

If you have 10 Youth athletes who took CMJ tests:

| Athlete | Peak Power (W) | Percentile |
|---------|---------------|------------|
| A       | 1000          | 10         |
| B       | 1100          | 20         |
| C       | 1200          | 30         |
| ...     | ...           | ...        |
| J       | 1900          | 100        |

When athlete K takes a test and scores 1500W:
- System looks up 1500W in Youth percentile_lookup
- Finds closest value ≤ 1500W
- Returns that percentile (e.g., 60th percentile)

## Important Notes

### 1. Sample Size Matters

With only 1 Youth athlete:
- Every metric will be 100th percentile
- Not statistically meaningful
- Need more Youth athletes for accurate benchmarks

**Recommendation:** Wait until you have at least 10-20 Youth athletes with 2+ tests before relying on Youth percentiles.

### 2. Automatic Updates

**Current behavior:** Percentiles are NOT automatically updated when new tests come in.

You'll need to:
- **Re-run the calculation script periodically** to update Youth percentiles as more athletes test
- Or **create a scheduled job** to recalculate monthly/quarterly

### 3. Pro Athletes

If you have Pro athletes, you'll also need to calculate Pro percentiles. Use:
- `scripts/calculate-all-custom-percentiles.sql` - Calculates BOTH Youth and Pro percentiles

## Files Created

| File | Purpose |
|------|---------|
| `scripts/calculate-youth-percentiles.sql` | SQL script to calculate Youth percentiles |
| `scripts/calculate-all-custom-percentiles.sql` | Calculate Youth + Pro percentiles (uses dynamic function) |
| `scripts/run-calculate-youth-percentiles.js` | Node.js helper to check contributions |
| `scripts/check-percentile-lookup.js` | Diagnostic script to verify lookup table |
| `scripts/check-youth-contributions.js` | Check specific Youth athlete data |

## Next Steps

1. **Immediate:** Run `calculate-youth-percentiles.sql` to populate Youth percentiles (even with just 1 athlete)
2. **Short-term:** Sync more VALD data to get more Youth athletes into the system
3. **Long-term:** Set up automated recalculation (monthly) as your athlete pool grows

## Troubleshooting

### Issue: "No Youth contributions found"

**Cause:** Backfill script hasn't been run or no Youth athletes have 2+ tests

**Fix:**
1. Run: `scripts/backfill-contributions.sql`
2. Verify Youth athletes have at least 2 tests per test type

### Issue: "Percentiles still showing 0"

**Cause:** Application code is caching old data or lookup table wasn't updated

**Fix:**
1. Verify Youth data in lookup table: `scripts/check-percentile-lookup.js`
2. Hard refresh the browser (Ctrl+Shift+R)
3. Re-sync the athlete's VALD data

### Issue: "All percentiles are 100"

**Cause:** You only have 1 Youth athlete contributing data

**Fix:** This is expected behavior. Add more Youth athletes to the system.

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  VALD Sync Process (when athlete takes test)               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   cmj_tests         │ ← Raw test data (ALL tests)
         │   sj_tests          │
         │   hj_tests, etc.    │
         └──────┬───────┬──────┘
                │       │
        ┌───────┘       └─────────┐
        ▼                         ▼
┌──────────────────┐    ┌────────────────────────────┐
│ percentile       │    │ athlete_percentile         │
│ _history         │    │ _contributions             │
│                  │    │                            │
│ (EVERY test)     │    │ (2nd+ test only - via SQL  │
│ Created by app   │    │  triggers)                 │
│ code             │    │                            │
└──────────────────┘    └────────┬───────────────────┘
                                 │
                                 │ Monthly calculation
                                 ▼
                        ┌────────────────────┐
                        │ percentile_lookup  │ ← Percentile benchmarks
                        │                    │   (Youth, Pro calculated
                        │ - College (808)    │    from contributions)
                        │ - High School(808) │
                        │ - Youth (NEW!)     │
                        │ - Pro (NEW!)       │
                        └────────────────────┘
```

## Summary

✅ **Problem identified:** Youth percentiles not calculated
✅ **Solution created:** SQL script to calculate from contributions
✅ **Next step:** Run the SQL script in Supabase SQL Editor

Once you run the script, Youth athletes will have proper percentile rankings!
