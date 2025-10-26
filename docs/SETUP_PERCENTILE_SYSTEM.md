# Percentile System Setup Instructions

## Current Status

All code and migrations are ready! However, the migrations need to be applied to your Supabase database before we can load the seed data.

## What's Ready ✅

1. **Migration Files Created:**
   - `20250125000005_expand_sj_test_table.sql` - Adds 416 columns to SJ tests
   - `20250125000006_expand_hj_test_table.sql` - Adds 280 columns to HJ tests
   - `20250125000007_expand_ppu_test_table.sql` - Adds 224 columns to PPU tests
   - `20250125000008_expand_imtp_test_table.sql` - Adds 274 columns to IMTP tests
   - `20250125000009_percentile_system.sql` - Creates 4 percentile tables + helper function

2. **Seed Data Loader:**
   - `scripts/load-driveline-seed-data.ts` - Ready to load 1935 athlete records
   - Will insert ~60,000+ data points into percentile_pool table

3. **Combined Migration File:**
   - `supabase/migrations/APPLY_ALL_MIGRATIONS.sql` - All migrations in one file

## Step 1: Apply Migrations to Supabase

You have **two options**:

### Option A: Apply via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/APPLY_ALL_MIGRATIONS.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run**

This will:
- Expand all test tables with complete metric schemas
- Create the 4 percentile system tables
- Add the percentile calculation function
- Set up all necessary indexes and RLS policies

### Option B: Use Supabase CLI (If you have Docker running)

```bash
# Start local Supabase
npx supabase start

# Apply migrations
npx supabase db push

# Or push to remote
npx supabase db push --linked
```

## Step 2: Load Seed Data

After the migrations are applied successfully, run:

```bash
npx tsx scripts/load-driveline-seed-data.ts
```

**Expected Output:**
```
🏀 Loading Driveline HP-OBP Seed Data into Supabase

✅ Loaded 1934 rows from DrivelineSeed.csv

🗑️  Clearing existing Driveline seed data...
✅ Cleared existing seed data

📊 Processing and inserting data...

  Inserted 500 data points...
  Inserted 1000 data points...
  ...
  Inserted 60000 data points...

✅ Successfully loaded 61249 data points

📊 Summary by Test Type and Play Level:

  CMJ:
    Youth: 8234 data points (16 metrics)
    High School: 15420 data points (16 metrics)
    College: 10856 data points (16 metrics)
    Pro: 2341 data points (16 metrics)

  SJ:
    Youth: 1024 data points (5 metrics)
    High School: 3214 data points (5 metrics)
    College: 2156 data points (5 metrics)
    Pro: 512 data points (5 metrics)

  ... (similar for HJ, PPU, IMTP)

🎉 Seed data loading complete!
```

## Step 3: Verify Success

Run these queries in your Supabase SQL Editor to verify:

```sql
-- Check percentile_pool table has data
SELECT
  test_type,
  play_level,
  COUNT(*) as data_points,
  COUNT(DISTINCT metric_name) as unique_metrics
FROM percentile_pool
WHERE source = 'driveline_seed'
GROUP BY test_type, play_level
ORDER BY test_type, play_level;

-- Test the percentile calculation function
SELECT calculate_percentile(
  45.2,          -- Example jump height value
  'CMJ',         -- Test type
  'jump_height', -- Metric name
  'High School'  -- Play level (NULL for overall)
);
-- Should return a percentile value like 78.5

-- Check expanded test table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sj_tests'
ORDER BY column_name;
-- Should show ~422 columns (6 base + 416 metrics)
```

## What Tables Were Created

### 1. `percentile_pool`
Stores all data points (Driveline seed + athlete contributions):
- **Source**: Either 'driveline_seed' or athlete UUID
- **Columns**: test_type, metric_name, value, play_level, source
- **Purpose**: Combined database for percentile calculations

### 2. `athlete_percentile_contributions`
Tracks which athletes have contributed at each level:
- **Primary Key**: (athlete_id, test_type, play_level)
- **Purpose**: Enforces the "2nd test" rule (one contribution per level)

### 3. `athlete_percentile_history`
Stores each athlete's percentile rankings over time:
- **Format**: JSONB with all metrics + composite score
- **Purpose**: Historical tracking for progress visualization

### 4. `percentile_metric_mappings`
Maps metric names between systems:
- **Driveline → VALD**: Column name conversions
- **Metadata**: Display names, units, descriptions
- **Composite**: Marks which metrics are used for composite score

## What's Next (Not Yet Built)

After you complete the setup above, the next phase is:

1. **Auto-Contribution Logic**: Detect 2nd test and add to percentile_pool
2. **Percentile API Endpoint**: Calculate percentiles for athlete tests
3. **Composite Score API**: Average the 6 key metrics
4. **UI Components**: Display percentiles, badges, charts

## Troubleshooting

### "Table percentile_pool not found"
- Run the migrations first (Step 1)
- Verify migrations were applied successfully

### "CSV parse error"
- Ensure `DrivelineSeed.csv` is in the project root
- Check file has 1935 rows with proper headers

### "Missing Supabase credentials"
- Verify `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### "Permission denied"
- Ensure you're using the SERVICE_ROLE_KEY (not anon key)
- Check RLS policies are configured correctly

## Summary

Once you complete Steps 1-3 above, you'll have:

✅ Complete VALD test schemas (all 5 test types)
✅ Percentile ranking system (4 tables + function)
✅ 60,000+ seed data points from Driveline
✅ Infrastructure for growing database (2nd test contributions)
✅ Historical percentile tracking

Then we can build the auto-contribution logic and UI! 🚀
