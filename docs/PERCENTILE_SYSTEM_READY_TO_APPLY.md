# Percentile System - FIXED and Ready to Apply

## What Was Wrong:

❌ **percentile_pool** table had 57,795 individual metric values
❌ Should have been 1,934 athlete RECORDS

## What's Fixed:

✅ **driveline_seed_data** table with VALD column names (1,934 athlete records)
✅ **athlete_percentile_contributions** table with same VALD columns
✅ **Percentile calculation** queries both tables together
✅ **Column mapping**: Driveline CSV → VALD names done automatically

## Critical Changes:

### 1. TWO Tables Architecture:

**`driveline_seed_data`**
- 1,934 athlete records (baseline data, never changes)
- Columns use VALD names: `jump_height_trial_value`, `net_peak_vertical_force_trial_value`, etc.
- Loaded from DrivelineSeed.CSV with automatic column name translation

**`athlete_percentile_contributions`**
- Same columns as driveline_seed_data
- Stores YOUR athletes' 2nd test at each play level
- Grows slowly over time
- UNIQUE constraint enforces 2nd test rule

### 2. IMTP Calculated Metrics (IMPORTANT):

**Our custom calculations** (NOT VALD's values):
- `net_peak_vertical_force_trial_value` = Peak Force - Body Weight (Newtons)
- `relative_strength_trial_value` = Net Peak Force / Body Weight

These are calculated in `lib/vald/store-test.ts` lines 290-291 and stored in `imtp_tests` table.

The Driveline CSV already has these PRE-CALCULATED values, so we just map them directly.

### 3. The 6 Composite Metrics:

| Priority | VALD Column Name | Test | Display Name |
|----------|------------------|------|--------------|
| 1 | `net_peak_vertical_force_trial_value` | IMTP | Net Peak Force |
| 2 | `relative_strength_trial_value` | IMTP | Relative Strength |
| 3 | `ppu_peak_takeoff_force_trial_value` | PPU | Peak Takeoff Force |
| 4 | `sj_peak_takeoff_power_trial_value` | SJ | Peak Power |
| 5 | `sj_bodymass_relative_takeoff_power_trial_value` | SJ | Peak Power / BM |
| 6 | `hop_mean_rsi_trial_value` | HJ | RSI |

### 4. How Percentile Calculation Works:

```sql
-- Example: Calculate jump height percentile for College level
SELECT calculate_percentile(
  25.3,                          -- Athlete's value
  'jump_height_trial_value',     -- VALD column name
  'College'                      -- Play level (NULL for overall)
);

-- Returns: 88.2 (88th percentile)
```

The function internally does:
```sql
SELECT jump_height_trial_value FROM driveline_seed_data WHERE playing_level = 'College'
UNION ALL
SELECT jump_height_trial_value FROM athlete_percentile_contributions WHERE playing_level = 'College'
-- Then calculates how many values are below 25.3
```

## Steps to Apply:

### Step 1: Apply Migration

Open Supabase Dashboard → SQL Editor

Run the file: **`supabase/migrations/FIX_PERCENTILE_TABLES.sql`**

This will:
- DROP `percentile_pool` (wrong table)
- RECREATE `driveline_seed_data` with VALD column names
- RECREATE `athlete_percentile_contributions` with VALD column names
- Update `calculate_percentile()` function
- Update `percentile_metric_mappings` with correct mappings

### Step 2: Load Seed Data

```bash
npx tsx scripts/load-driveline-seed-FIXED.ts
```

Expected output:
```
✅ Loaded 1934 rows from DrivelineSeed.csv
✅ Successfully loaded 1934 athlete records!

📊 Summary by Play Level:
  High School: X athletes
  College: Y athletes
  Pro: Z athletes
```

### Step 3: Verify

```sql
-- Check driveline_seed_data
SELECT playing_level, COUNT(*)
FROM driveline_seed_data
GROUP BY playing_level;
-- Should show ~1,934 total rows

-- Test percentile calculation
SELECT calculate_percentile(
  2000.0,
  'net_peak_vertical_force_trial_value',
  'College'
);
-- Should return a percentile value (0-100)

-- Verify column names are VALD format
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'driveline_seed_data'
AND column_name LIKE '%trial_value%'
ORDER BY column_name;
-- Should show VALD column names, not Driveline CSV names
```

## What Happens Next:

1. **Athletes take ForceDecks tests** → Synced to `cmj_tests`, `sj_tests`, etc.
2. **System detects 2nd test** at each play level
3. **Auto-add to `athlete_percentile_contributions`** (not built yet, next phase)
4. **Percentiles evolve** as more athletes contribute
5. **Composite scores** calculated from 6 metrics
6. **Historical tracking** in `athlete_percentile_history`

## Files Ready:

✅ `supabase/migrations/FIX_PERCENTILE_TABLES.sql` - Migration to apply
✅ `scripts/load-driveline-seed-FIXED.ts` - Seed data loader
✅ `docs/DRIVELINE_TO_VALD_COLUMN_MAPPING.md` - Complete column mapping reference

## What's NOT Built Yet (Next Phase):

❌ Auto-contribution logic (2nd test detection)
❌ API endpoints for percentile calculation
❌ Composite score API
❌ UI components for displaying percentiles

But the FOUNDATION is solid and ready!
