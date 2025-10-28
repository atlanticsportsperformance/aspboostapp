# Percentile System Status Report

## Current State

### ✅ What's Working

1. **athlete_percentile_contributions Table**
   - Colin Ma has all 5 test contributions stored correctly
   - All 8 required metrics are populated:
     - CMJ: `peak_takeoff_power_trial_value` (4155.14 W), `bodymass_relative_takeoff_power_trial_value` (51.94 W/kg)
     - SJ: `sj_peak_takeoff_power_trial_value` (4385.32 W), `sj_bodymass_relative_takeoff_power_trial_value` (54.82 W/kg)
     - HJ: `hop_mean_rsi_trial_value` (2.19)
     - PPU: `ppu_peak_takeoff_force_trial_value` (1250.99 N)
     - IMTP: `net_peak_vertical_force_trial_value` (2249.58 N), `relative_strength_trial_value` (2.87)

2. **Auto-Contribution Trigger System**
   - SQL triggers are active on all 5 test tables
   - When any athlete completes 2+ full test sessions (all 5 tests same day), they automatically get added to `athlete_percentile_contributions`

3. **percentile_metric_mappings Table**
   - Correctly defines which metrics matter for percentiles
   - Maps Driveline column names → VALD column names

### ❌ What's NOT Working

1. **percentile_lookup Table is Missing Athlete Data**
   - Has 4040 rows total
   - Only includes 2 metrics (should be 8)
   - Colin Ma's values are **NOT** present in this table
   - **This is the table that the API actually queries for percentile calculations**

2. **driveline_percentiles Table is Empty**
   - No seed data has been loaded
   - The system was designed to combine Driveline seed data + athlete contributions
   - Currently only athlete contributions exist

## The Missing Link

```
┌──────────────────────────────────┐
│ athlete_percentile_contributions │  ✅ Has Colin's data (8 metrics)
└─────────────┬────────────────────┘
              │
              │ MISSING: recalculate_percentiles_for_metric()
              │          needs to pull from this table
              ↓
┌──────────────────────────────────┐
│      percentile_lookup           │  ❌ Does NOT have Colin's data
│  (This is what the API queries)  │      Only has 2/8 metrics
└──────────────────────────────────┘
```

## What Needs to Happen

### Option 1: Re-run Percentile Calculation (Recommended)

Run the populate script to rebuild `percentile_lookup` from `athlete_percentile_contributions`:

```bash
npx tsx scripts/populate-percentile-lookup-OPTIMIZED.ts
```

**This will:**
- Call `recalculate_percentiles_for_metric()` database function
- Pull data from `athlete_percentile_contributions` (and `driveline_percentiles` if populated)
- Calculate percentiles for all 8 metrics across all play levels
- Populate `percentile_lookup` with Colin's values

### Option 2: Check if recalculate Function Includes Athlete Contributions

The database function `recalculate_percentiles_for_metric()` might need to be updated to:
1. Pull from `driveline_percentiles` (currently empty)
2. Pull from `athlete_percentile_contributions` (has Colin's data) ← **Key: verify this happens**
3. Combine both datasets
4. Calculate percentiles
5. Insert into `percentile_lookup`

## Verification Steps

After running the populate script:

```bash
# 1. Check that percentile_lookup has Colin's values
npx tsx scripts/check-percentile-lookup-table.ts

# 2. Verify all 8 metrics are present
# Should show:
# - peak_takeoff_power_trial_value
# - bodymass_relative_takeoff_power_trial_value
# - sj_peak_takeoff_power_trial_value
# - sj_bodymass_relative_takeoff_power_trial_value
# - hop_mean_rsi_trial_value
# - ppu_peak_takeoff_force_trial_value
# - net_peak_vertical_force_trial_value
# - relative_strength_trial_value

# 3. Test API endpoint
curl http://localhost:3000/api/athletes/[colin-id]/vald/percentiles
```

## Next Actions

1. Run `populate-percentile-lookup-OPTIMIZED.ts`
2. Verify Colin's values appear in `percentile_lookup`
3. Test the API endpoint returns percentiles for Colin
4. (Optional) Load Driveline seed data and re-run populate script

## Summary

**The auto-contribution system is working perfectly.** Colin's data is correctly stored in `athlete_percentile_contributions` with all 8 metrics.

The issue is that the `percentile_lookup` table (which the API queries) hasn't been regenerated to include athlete contributions. Running the populate script should fix this.
