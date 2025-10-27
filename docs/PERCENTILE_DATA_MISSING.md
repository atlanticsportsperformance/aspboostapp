# Percentile Data Missing from Database

## Problem

The `percentile_lookup` table is **critically incomplete**. It only has percentile data for 2 out of 6 required metrics.

### What EXISTS in percentile_lookup:
- ✅ `bodymass_relative_takeoff_power_trial_value` (for CMJ/SJ Power/BW)
- ✅ `hop_mean_rsi_trial_value` (for HJ RSI)

### What's MISSING from percentile_lookup:
- ❌ SJ Peak Power percentiles
- ❌ PPU Peak Force percentiles
- ❌ IMTP Net Peak Force percentiles
- ❌ IMTP Relative Strength percentiles
- ❌ CMJ Peak Power percentiles
- ❌ CMJ Peak Force percentiles

## Why Percentiles Show 0

When the API tries to calculate percentiles:
1. It queries `percentile_lookup` for a metric column (e.g., `peak_takeoff_power_sj`)
2. The table doesn't have that column
3. Query returns empty result
4. Code defaults to 0

## What You Need to Do

You need to load the percentile data from Driveline for these missing metrics. Based on your earlier work with `percentile_metric_mappings`, you should have this data somewhere.

### Expected Driveline Column Names:

According to your `percentile_metric_mappings` table:

1. **SJ Peak Power:**
   - Driveline column: `peak_takeoff_power_sj`
   - VALD column: `sj_peak_takeoff_power_trial_value`

2. **SJ Peak Power / BW:**
   - Driveline column: `peak_power_per_bw_sj`
   - VALD column: `sj_bodymass_relative_takeoff_power_trial_value`

3. **PPU Peak Force:**
   - Driveline column: `peak_takeoff_force_pp`
   - VALD column: `ppu_peak_takeoff_force_trial_value`

4. **IMTP Net Peak Force:**
   - Driveline column: `net_peak_vertical_force_imtp`
   - VALD column: `net_peak_vertical_force_trial_value`

5. **IMTP Relative Strength:**
   - Driveline column: `relative_strength`
   - VALD column: `relative_strength_trial_value`

6. **HJ RSI:**
   - Driveline column: `best_rsi_flight_contact_ht`
   - VALD column: `hop_mean_rsi_trial_value`

7. **CMJ Peak Power:**
   - Driveline column: `peak_takeoff_power_cmj`
   - VALD column: `peak_takeoff_power_trial_value`

8. **CMJ Peak Power / BW:**
   - Driveline column: `peak_power_per_bw_cmj`
   - VALD column: `bodymass_relative_takeoff_power_trial_value`

## How to Fix

### Option 1: Load Missing Driveline Percentile Data

You need to run the Driveline percentile data loading script for ALL metrics, not just the 2 that currently exist.

Check if you have scripts like:
- `scripts/load-driveline-seed-data.ts`
- `scripts/populate-percentile-lookup.ts`

These should populate `percentile_lookup` with ALL the Driveline percentile data.

### Option 2: Temporary Workaround

Use the percentile data that DOES exist for now:

1. **For SJ Peak Power / BW:** Use `bodymass_relative_takeoff_power_trial_value` (WORKS)
2. **For HJ RSI:** Use `hop_mean_rsi_trial_value` (WORKS)
3. **For everything else:** Show "N/A" or hide percentile until data is loaded

## Current Behavior

- CMJ: Shows percentile (using the one column that exists)
- SJ: Shows 0th percentile (missing SJ-prefixed columns)
- HJ: Shows percentile (using the one column that exists)
- PPU: Shows 0th percentile (missing data)
- IMTP: Shows 0th percentile (missing data)

## Next Steps

1. **Find the Driveline percentile CSV/JSON files** that contain the full percentile data
2. **Run the data loading script** to populate `percentile_lookup` with ALL metrics
3. **Verify** that all 8 metric columns exist in `percentile_lookup`
4. **Re-sync** an athlete to recalculate percentiles with complete data

## SQL to Check

```sql
-- See what columns we have
SELECT DISTINCT metric_column
FROM percentile_lookup
ORDER BY metric_column;

-- Should show all 8 columns above
```

## Expected Result

Once the data is loaded, `percentile_lookup` should have ~808 rows for EACH of the 8 metrics × 5 play levels = ~32,000 total rows.

Currently you probably only have ~1,616 rows (2 metrics × 808 rows × 5 play levels).
