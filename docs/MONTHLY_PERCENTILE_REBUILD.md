# Monthly Percentile Lookup Rebuild

## Overview

The percentile_lookup table is automatically rebuilt on the **1st of each month at 12:01 AM EST** via a Vercel Cron Job.

This system prevents race conditions during real-time test syncing while ensuring percentile benchmarks stay up-to-date with the latest athlete data.

## Architecture

```
1st of month, 12:01 AM EST
    ↓
Vercel Cron Job triggers
    ↓
POST /api/cron/monthly-percentile-rebuild
    ↓
Calls rebuild_percentile_lookup() stored procedure
    ↓
Truncates percentile_lookup table
    ↓
Rebuilds from driveline_seed_data + athlete_percentile_contributions
    ↓
Returns statistics (rows inserted per metric/play_level)
    ↓
✅ Percentile lookup updated for next month!
```

## Setup Instructions

### 1. Create the PostgreSQL Stored Procedure

Run this SQL script in Supabase SQL Editor:

```sql
-- File: scripts/create-rebuild-percentile-function.sql
```

This creates the `rebuild_percentile_lookup()` function that:
- Truncates the percentile_lookup table
- Combines data from both driveline_seed_data and athlete_percentile_contributions
- Calculates percentiles 0-100 for each metric/play_level combination
- Returns summary statistics

### 2. Set Up Vercel Cron Secret

The cron job requires authentication to prevent unauthorized access.

**In Vercel Dashboard:**
1. Go to your project settings
2. Navigate to Environment Variables
3. Add a new variable:
   - **Name**: `CRON_SECRET`
   - **Value**: Generate a secure random string (e.g., use `openssl rand -base64 32`)
   - **Environments**: Production, Preview, Development

### 3. Deploy to Vercel

The cron configuration is already in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/nightly-force-plate-sync",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/monthly-percentile-rebuild",
      "schedule": "1 5 1 * *"
    }
  ]
}
```

**Schedule format**: `1 5 1 * *`
- Minute: 1 (12:01 AM)
- Hour: 5 (5:00 AM UTC = 12:00 AM EST, with 1 minute offset)
- Day of month: 1 (1st of every month)
- Month: * (every month)
- Day of week: * (any day)

Deploy your changes:
```bash
git add .
git commit -m "Add monthly percentile rebuild cron job"
git push
```

Vercel will automatically register the cron job on deployment.

## Manual Trigger (For Testing)

You can manually trigger the rebuild by calling the endpoint with the correct authorization header:

```bash
curl -X GET \
  https://your-app.vercel.app/api/cron/monthly-percentile-rebuild \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Percentile lookup rebuilt successfully: 3232 rows inserted",
  "timestamp": "2025-11-01T05:01:00.000Z",
  "summary": {
    "totalRows": 3232,
    "breakdown": {
      "peak_takeoff_power_trial_value": {
        "High School": 101,
        "College": 101,
        "Pro": 101,
        "Overall": 101
      },
      "bodymass_relative_takeoff_power_trial_value": {
        "High School": 101,
        "College": 101,
        "Pro": 101,
        "Overall": 101
      },
      ...
    }
  }
}
```

## Monitoring

### Check Cron Job Status

**In Vercel Dashboard:**
1. Go to your project
2. Click on "Deployments"
3. Select your production deployment
4. Click on "Functions" tab
5. Look for `/api/cron/monthly-percentile-rebuild` logs

### Check Next Scheduled Run

Vercel shows the next scheduled run time in the Functions tab.

### View Execution Logs

All execution logs are available in the Vercel dashboard under the specific cron job execution.

Look for these log messages:
- `📊 Starting monthly percentile lookup rebuild...`
- `Calling rebuild_percentile_lookup() stored procedure...`
- `✅ Rebuilt percentile_lookup table`
- `📊 Rebuild summary:`

## Data Flow

### What Gets Rebuilt

The rebuild combines two data sources:

1. **Driveline Seed Data** (`driveline_seed_data` table)
   - Baseline normative data from Driveline
   - Covers High School, College, Pro, and Overall play levels
   - 160 High School data points, etc.

2. **Athlete Contributions** (`athlete_percentile_contributions` table)
   - Athletes' 2nd+ tests (1st test doesn't contribute to normative data)
   - Grows over time as more athletes complete tests
   - Organized by playing_level

### Metrics Included

- **CMJ**: Peak Power (W), Peak Power/BM (W/kg)
- **SJ**: Peak Power (W), Peak Power/BM (W/kg)
- **HJ**: Mean RSI
- **PPU**: Peak Takeoff Force (N)
- **IMTP**: Net Peak Vertical Force (N), Relative Strength (N/kg)

### Percentile Calculation

For each metric and play level:
1. Combine all values from Driveline + Contributions
2. Rank values from lowest to highest
3. Calculate percentile: `(rank / (total - 1)) * 100`
4. Handle duplicates by averaging values
5. Force percentiles into 0-100 range
6. Insert 101 rows (percentiles 0-100)

## Troubleshooting

### Issue: Cron Job Not Running

**Check 1**: Verify CRON_SECRET is set in Vercel environment variables

**Check 2**: Check Vercel deployment logs for cron job registration

**Check 3**: Verify vercel.json is in the root directory

### Issue: Stored Procedure Not Found

**Error**: `function rebuild_percentile_lookup() does not exist`

**Fix**: Run `scripts/create-rebuild-percentile-function.sql` in Supabase SQL Editor

### Issue: Permission Denied

**Error**: `permission denied for table percentile_lookup`

**Fix**: The stored procedure is created with `SECURITY DEFINER`, so it runs with the creator's permissions. Make sure you're running the create script as a superuser or owner of the tables.

### Issue: Empty Percentile Lookup

**Check 1**: Verify driveline_seed_data has data
```sql
SELECT COUNT(*) FROM driveline_seed_data;
```

**Check 2**: Verify athlete_percentile_contributions has data
```sql
SELECT COUNT(*) FROM athlete_percentile_contributions;
```

**Check 3**: Check Vercel logs for SQL errors during rebuild

## Benefits

### 1. No Race Conditions
Real-time test syncing doesn't conflict with percentile recalculation since it only happens once per month.

### 2. Always Fresh Data
Percentile benchmarks include all athlete data collected in the previous month.

### 3. Automated
No manual intervention required - set it and forget it!

### 4. Efficient
Only runs once per month instead of after every test, reducing database load.

### 5. Predictable
Runs at a consistent time (1st of month, 12:01 AM EST) when usage is typically low.

## Alternative: Manual Rebuild

If you need to rebuild percentiles outside the monthly schedule, you can:

### Option 1: Call the API Endpoint
```bash
curl -X GET \
  https://your-app.vercel.app/api/cron/monthly-percentile-rebuild \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option 2: Call the Stored Procedure Directly
Run in Supabase SQL Editor:
```sql
SELECT * FROM rebuild_percentile_lookup();
```

### Option 3: Run the Original SQL Script
Run `scripts/rebuild-percentile-FIXED.sql` in Supabase SQL Editor

All three methods produce the same result.

## Summary

✅ **Automatic**: Runs on the 1st of each month at 12:01 AM EST
✅ **Complete**: Combines Driveline seed data + athlete contributions
✅ **Reliable**: Uses PostgreSQL stored procedure for consistent execution
✅ **Monitored**: Full logs available in Vercel dashboard
✅ **Secure**: Requires CRON_SECRET for authentication

The percentile system is now fully automated and foolproof! 🎉
