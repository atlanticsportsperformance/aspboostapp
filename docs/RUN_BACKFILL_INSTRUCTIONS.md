# Run Backfill Script - Instructions

## Current Status

You have **3 Youth athletes**:

1. **f8f13a34...** - Has 1 test each (CMJ, SJ, HJ, PPU, IMTP) → NO contributions ✅ Correct
2. **cb209d13...** (Emmitt Bliss-Chin) - Has 3+ CMJ, 4 SJ, 2 HJ, 2 IMTP → 4 contributions ✅ Already in database
3. **90ae7b7b...** (Chris Stracco) - Has 2 CMJ, 2 SJ, 2 HJ, 2 PPU → ❌ **MISSING 4 contributions**

### Problem:
Chris Stracco's contributions were not created. The backfill script needs to be run to add his 4 missing contributions.

### Solution:
Re-run the backfill script. It uses `ON CONFLICT DO NOTHING` so it won't duplicate Emmitt's existing contributions.

## How to Run the Backfill Script

### Option 1: Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy the Backfill Script**
   - Open: `scripts/backfill-contributions.sql`
   - Copy the ENTIRE contents (all 165 lines)

4. **Paste and Run**
   - Paste into the SQL Editor
   - Click "Run" button

5. **Verify Results**
   - You should see output showing contributions by test type
   - Check for errors in the output panel

### Option 2: Command Line (If you have PostgreSQL installed)

```bash
psql <your-database-url> -f scripts/backfill-contributions.sql
```

## After Running the Backfill

### Verify it worked:

Run this command:

```bash
node -r dotenv/config scripts/check-actual-contributions.js dotenv_config_path=.env.local
```

**Expected output:**
```
Total Youth contributions in database: 8

CONTRIBUTIONS BY ATHLETE:

Athlete 1: cb209d13... (Emmitt)
   CMJ - ...
   SJ - ...
   HJ - ...
   IMTP - ...

Athlete 2: 90ae7b7b... (Chris)
   CMJ - ...
   SJ - ...
   HJ - ...
   PPU - ...

✅ CORRECT! All expected contributions are present.
```

## What the Backfill Does

The script:

1. **Scans all test tables** (cmj_tests, sj_tests, hj_tests, ppu_tests, imtp_tests)
2. **For each athlete with 2+ tests:**
   - Takes the MOST RECENT test (by `recorded_utc DESC`)
   - Inserts into `athlete_percentile_contributions`
3. **Uses ON CONFLICT DO NOTHING:**
   - Won't duplicate existing contributions
   - Safe to run multiple times

### Example:

Chris Stracco has 2 CMJ tests:
- 2025-09-02 (older) → Not selected
- 2025-10-27 (newer) → **SELECTED** for contribution

## Next Steps After Backfill

Once all 8 contributions are in the database:

### 1. Calculate Youth Percentiles

The `percentile_lookup` table needs Youth data.

**Run this SQL:**
- Open: `scripts/calculate-youth-percentiles.sql`
- Copy and paste into Supabase SQL Editor
- Click "Run"

This will:
- Calculate percentiles based on your 2-3 Youth athletes
- Populate the `percentile_lookup` table with Youth data

### 2. Verify Percentiles

```bash
node -r dotenv/config scripts/check-percentile-lookup.js dotenv_config_path=.env.local
```

**Expected output:**
```
1. PLAY LEVELS IN LOOKUP TABLE:
   - College
   - High School
   - Youth         ← NEW!
```

### 3. Test with an Athlete

1. Go to a Youth athlete's profile
2. Click "Sync VALD Data"
3. Check the Force Profile page
4. Percentiles should now show actual values instead of 0

## Important Notes

### Small Sample Size

With only 2-3 Youth athletes:
- Percentiles won't be statistically meaningful
- Every value will be near 0%, 50%, or 100%
- Need 10-20+ athletes for accurate benchmarks

### When to Re-run

Re-run the backfill when:
- New Youth athletes take their 2nd test
- You notice missing contributions
- After bulk importing historical data

### When to Recalculate Percentiles

Re-run `calculate-youth-percentiles.sql` when:
- New Youth athletes are added (monthly/quarterly)
- You want to update benchmarks with latest data
- Sample size grows significantly (e.g., from 5 to 20 athletes)

## Troubleshooting

### Issue: "No changes" after running backfill

**Possible causes:**
1. Athlete doesn't have `play_level` set
2. Athlete has less than 2 tests
3. SQL syntax error

**Check:**
```sql
-- Verify athlete has play_level
SELECT id, first_name, last_name, play_level
FROM athletes
WHERE id = '90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9';

-- Verify test counts
SELECT COUNT(*) FROM cmj_tests WHERE athlete_id = '90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9';
SELECT COUNT(*) FROM sj_tests WHERE athlete_id = '90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9';
```

### Issue: Duplicate contributions

**This shouldn't happen** due to `ON CONFLICT DO NOTHING`, but if it does:

```sql
-- Find duplicates
SELECT athlete_id, test_type, playing_level, COUNT(*)
FROM athlete_percentile_contributions
GROUP BY athlete_id, test_type, playing_level
HAVING COUNT(*) > 1;

-- Delete duplicates (keep most recent)
-- Be careful with this! Backup first
```

## Summary

**Right now, you need to:**

1. ✅ Run `scripts/backfill-contributions.sql` in Supabase SQL Editor
2. ✅ Verify with `node -r dotenv/config scripts/check-actual-contributions.js dotenv_config_path=.env.local`
3. ✅ Run `scripts/calculate-youth-percentiles.sql` in Supabase SQL Editor
4. ✅ Verify with `node -r dotenv/config scripts/check-percentile-lookup.js dotenv_config_path=.env.local`

Then Youth percentiles will work correctly!
