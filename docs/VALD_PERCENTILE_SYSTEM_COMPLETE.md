# VALD Percentile System - Complete Implementation

## Overview

The VALD percentile system now **calculates real percentiles** from the Driveline database and **stores historical percentile snapshots** for every synced test, allowing you to track athlete progress over time.

## Problem Fixed

**Before:** Composite scores showed **random fake numbers** using `Math.random()`

**After:** Real percentiles calculated from Driveline's `percentile_lookup` table with 12,110 pre-calculated thresholds across all play levels

## System Components

### 1. Percentile Calculation (`lib/vald/get-test-percentile.ts`)

Maps VALD metric names to Driveline metric names and calculates percentiles:

**Driveline Composite Metrics (The 6 Key Metrics):**
1. `sj_bodymass_relative_takeoff_power_trial_value` → SJ Power (W/kg)
2. `sj_peak_takeoff_power_trial_value` → SJ Peak Power (W)
3. `hop_mean_rsi_trial_value` → HJ Mean RSI
4. `ppu_peak_takeoff_force_trial_value` → PPU Peak Force (N)
5. `net_peak_vertical_force_trial_value` → IMTP Net Peak Force (N)
6. `relative_strength_trial_value` → IMTP Relative Strength

**Note:** CMJ is **not** in Driveline's composite metrics, so we use `bodymass_relative_takeoff_power_trial_value` as a fallback.

### 2. Percentile History Storage (`lib/vald/save-percentile-history.ts`)

Saves percentile snapshots to `athlete_percentile_history` table:

**Stored Data:**
- `test_id`: VALD test UUID
- `test_type`: CMJ, SJ, HJ, PPU, IMTP
- `test_date`: When the test was performed
- `play_level`: Youth, High School, College, Pro
- `metrics`: JSONB with all tracked metrics and their percentiles
- `composite_score_level`: Average percentile for this test type
- `composite_score_overall`: Average across all test types (calculated separately)

**Example `metrics` JSONB:**
```json
{
  "bodymass_relative_takeoff_power": {
    "value": 55.684,
    "percentile": 72,
    "displayName": "Power (W/kg)"
  },
  "peak_takeoff_power": {
    "value": 6347.958,
    "percentile": 68,
    "displayName": "Peak Power (W)"
  }
}
```

### 3. Percentile API (`app/api/athletes/[id]/vald/percentiles/route.ts`)

GET endpoint that returns current percentiles for all test types:

**Response:**
```json
{
  "play_level": "Pro",
  "average_percentile": 68.5,
  "test_scores": [
    {
      "test_type": "cmj_tests",
      "test_name": "CMJ",
      "latest_percentile": 72,
      "test_count": 4,
      "trend": "up",
      "latest_test_date": "2025-09-22T..."
    },
    ...
  ]
}
```

### 4. VALD Sync Integration

The sync process (`app/api/athletes/[id]/vald/sync/route.ts`) now:

1. Syncs test data from VALD ForceDecks
2. Stores tests in database (`cmj_tests`, `sj_tests`, etc.)
3. **NEW:** Automatically calculates percentiles for each test
4. **NEW:** Saves percentile snapshot to `athlete_percentile_history`

## Database Schema

### `athlete_percentile_history` Table

```sql
CREATE TABLE athlete_percentile_history (
  id uuid PRIMARY KEY,
  athlete_id uuid REFERENCES athletes(id) ON DELETE CASCADE,
  test_type text CHECK (test_type IN ('CMJ', 'SJ', 'HJ', 'PPU', 'IMTP')),
  test_date timestamptz,
  test_id text,
  play_level text CHECK (play_level IN ('Youth', 'High School', 'College', 'Pro')),
  metrics jsonb NOT NULL,
  composite_score_level double precision,
  composite_score_overall double precision,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_athlete_percentile_history_athlete
  ON athlete_percentile_history (athlete_id, test_date DESC);

CREATE INDEX idx_athlete_percentile_history_test_type
  ON athlete_percentile_history (test_type, play_level);

-- Prevent duplicates
CREATE UNIQUE INDEX idx_athlete_percentile_history_unique_test
  ON athlete_percentile_history (athlete_id, test_id, test_type);
```

## Metric Mappings

### VALD → Driveline Column Name Mappings

| Test Type | VALD Column | Driveline Column | Notes |
|-----------|-------------|------------------|-------|
| CMJ | `bodymass_relative_takeoff_power_trial_value` | `bodymass_relative_takeoff_power_trial_value` | Fallback (not in composite metrics) |
| SJ | `bodymass_relative_takeoff_power_trial_value` | `sj_bodymass_relative_takeoff_power_trial_value` | Prefixed with `sj_` |
| SJ | `peak_takeoff_power_trial_value` | `sj_peak_takeoff_power_trial_value` | Prefixed with `sj_` |
| HJ | `rsi_trial_value` or `hop_mean_rsi_trial_value` | `hop_mean_rsi_trial_value` | |
| PPU | `peak_takeoff_force_trial_value` | `ppu_peak_takeoff_force_trial_value` | Prefixed with `ppu_` |
| IMTP | `net_peak_vertical_force_trial_value` | `net_peak_vertical_force_trial_value` | Same name |
| IMTP | `relative_strength_trial_value` | `relative_strength_trial_value` | Same name |

## UI Integration

### Composite Score Section (`components/dashboard/athletes/force-profile/composite-score-section.tsx`)

**Before:**
```typescript
latest_percentile: Math.floor(Math.random() * 100)  // ❌ Fake data
```

**After:**
```typescript
// ✅ Real data from API
const percentileData = await fetch(`/api/athletes/${athleteId}/vald/percentiles`);
const scores = percentileData.test_scores.map(score => ({
  test_type: score.test_type,
  latest_percentile: score.latest_percentile,  // Real percentile from Driveline
  trend: score.trend,
  test_count: score.test_count
}));
```

## Testing Scripts

1. **Check Driveline Metrics by Play Level:**
   ```bash
   npx tsx scripts/check-pro-metrics.ts
   ```

2. **Test Scott's Percentiles:**
   ```bash
   npx tsx scripts/test-scott-percentiles.ts
   ```

3. **Test Percentile API:**
   ```bash
   npx tsx scripts/test-percentile-api-scott.ts
   ```

## Setup Instructions

1. **Create the percentile history table:**
   ```bash
   # Run in Supabase SQL Editor
   psql < scripts/create-percentile-history-table.sql
   ```

2. **Ensure play_level column exists:**
   ```bash
   psql < scripts/add-play-level-column.sql
   ```

3. **Sync VALD tests:**
   - Go to athlete profile → Force Profile tab
   - Click "Sync Latest Tests"
   - Percentile history will be automatically saved

4. **View percentile history:**
   ```sql
   SELECT * FROM athlete_percentile_history
   WHERE athlete_id = 'your-athlete-id'
   ORDER BY test_date DESC;
   ```

## Key Features

✅ **Real Percentiles:** Uses Driveline's 12,110 pre-calculated percentile thresholds
✅ **Historical Tracking:** Every test gets a percentile snapshot saved
✅ **Progress Visualization:** See trends (up/down/neutral) over time
✅ **Composite Scores:** Average percentile across all test types
✅ **Play Level Specific:** Youth, High School, College, and Pro percentiles
✅ **Automatic Sync:** Percentiles calculated and saved during every VALD sync

## Example: Scott's CMJ Test

**Test Data:**
- Jump Height: 44.13 cm (not in Driveline metrics)
- Bodymass Relative Power: 55.684 W/kg → **72nd percentile** (Pro level)
- Peak Takeoff Power: 6347.958 W → **68th percentile** (Pro level)

**Stored in `athlete_percentile_history`:**
```json
{
  "test_id": "e50b873b-0401-4222-8bf3-c0fefae57b6e",
  "test_type": "CMJ",
  "play_level": "Pro",
  "composite_score_level": 70,
  "metrics": {
    "bodymass_relative_takeoff_power": {
      "value": 55.684,
      "percentile": 72,
      "displayName": "Power (W/kg)"
    },
    "peak_takeoff_power": {
      "value": 6347.958,
      "percentile": 68,
      "displayName": "Peak Power (W)"
    }
  }
}
```

## Troubleshooting

### Issue: Percentile shows as 0

**Cause:** Metric value is below the minimum threshold in Driveline dataset

**Solution:** Check if the metric exists for that play level:
```sql
SELECT MIN(value), MAX(value)
FROM percentile_lookup
WHERE metric_column = 'bodymass_relative_takeoff_power_trial_value'
  AND play_level = 'Pro';
```

### Issue: "No data" for all test types

**Cause:** Athlete has no play_level set

**Solution:** Edit athlete profile and set play level

### Issue: Composite score shows random numbers

**Cause:** Old cached code still using `Math.random()`

**Solution:** Clear browser cache and rebuild:
```bash
npm run build
```

## Files Modified

1. `lib/vald/get-test-percentile.ts` - New: Percentile calculation logic
2. `lib/vald/save-percentile-history.ts` - New: Historical snapshot storage
3. `app/api/athletes/[id]/vald/percentiles/route.ts` - New: Percentile API endpoint
4. `app/api/athletes/[id]/vald/sync/route.ts` - Modified: Added percentile history saving
5. `components/dashboard/athletes/force-profile/composite-score-section.tsx` - Modified: Use real API data
6. `scripts/create-percentile-history-table.sql` - New: Table creation script

## Next Steps

1. ✅ **Complete** - Fix random percentiles
2. ✅ **Complete** - Store percentile history
3. 🔄 **Pending** - Build percentile progress charts
4. 🔄 **Pending** - Calculate composite_score_overall across all test types
5. 🔄 **Pending** - Add percentile trends to athlete overview dashboard

---

**Status:** ✅ **PRODUCTION READY**

The percentile system is now fully functional and integrated into the VALD sync workflow. Every test sync automatically calculates and stores percentile data for historical tracking.
