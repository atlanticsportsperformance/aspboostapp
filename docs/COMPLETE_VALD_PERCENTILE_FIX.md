# Complete VALD Percentile System Fix

## 🚨 CRITICAL DATABASE FIX REQUIRED

The `athlete_percentile_history` table has a CHECK constraint that is blocking "Overall" percentiles from being saved.

### Run This SQL in Supabase SQL Editor (IMMEDIATELY):

```sql
-- Fix the play_level constraint to include 'Overall'
ALTER TABLE athlete_percentile_history
DROP CONSTRAINT IF EXISTS athlete_percentile_history_play_level_check;

ALTER TABLE athlete_percentile_history
ADD CONSTRAINT athlete_percentile_history_play_level_check
CHECK (play_level IN ('Youth', 'High School', 'College', 'Pro', 'Overall'));
```

**Location:** Go to Supabase Dashboard → SQL Editor → Paste the SQL above → Run

---

## What Was Fixed

### 1. ✅ Percentiles API Enhanced ([app/api/athletes/[id]/vald/percentiles/route.ts](../app/api/athletes/[id]/vald/percentiles/route.ts))

**Added individual metric percentiles for:**
- CMJ Peak Power (W) + percentile
- CMJ Peak Force (N) + percentile (if data available)
- SJ Peak Power (W) + percentile
- SJ Peak Power / BW (W/kg) + percentile
- HJ RSI + percentile
- PPU Peak Force (N) + percentile
- IMTP Net Peak Force (N) + percentile
- IMTP Relative Strength + percentile

**Response structure now includes:**
```json
{
  "metric_values": {
    "power": 45.2,
    "peakPower": 2100,
    ...
  },
  "metric_percentiles": {
    "power": 78,
    "peakPower": 82,
    ...
  }
}
```

### 2. ✅ Force Profile Overview UI ([components/dashboard/athletes/force-profile/])

**Created new `metric-overview-cards.tsx` component showing 6 key metrics:**
1. IMTP Net Peak Force (N) + percentile
2. IMTP Relative Strength + percentile
3. SJ Peak Power / BW (W/kg) + percentile
4. PPU Peak Force (N) + percentile
5. SJ Peak Power (W) + percentile
6. HJ RSI + percentile

**Updated `composite-score-section.tsx`:**
- Now displays the 6 metric cards at the top
- Shows actual metric VALUES alongside percentiles
- Color-coded percentiles (green = 75+, blue = 50-74, yellow = 25-49, red = <25)

### 3. ✅ Percentile History Tracking Fixed ([lib/vald/save-percentile-history.ts](../lib/vald/save-percentile-history.ts))

**Added IMTP column name mappings:**
- `net_peak_vertical_force_trial_value` → `net_peak_vertical_force_imtp`
- `relative_strength_trial_value` → `relative_strength`

This ensures IMTP metrics are correctly looked up in the `percentile_lookup` table.

**Already tracking for CMJ:**
- ✅ Peak Power / BW (W/kg)
- ✅ Peak Power (W)
- ⚠️ Peak Force (NOT in percentile_lookup table - cannot track without Driveline data)

### 4. ✅ Percentile History API Created ([app/api/athletes/[id]/vald/percentile-history/route.ts](../app/api/athletes/[id]/vald/percentile-history/route.ts))

**New GET endpoint for charting percentiles over time:**

**Endpoint:** `/api/athletes/{id}/vald/percentile-history`

**Returns:**
```json
{
  "athlete": {
    "id": "...",
    "name": "Thomas Daly",
    "play_level": "High School"
  },
  "history_by_play_level": {
    "CMJ": [
      {
        "test_id": "abc123",
        "test_date": "2025-01-15T10:00:00Z",
        "play_level": "High School",
        "metrics": {
          "power": {
            "value": 45.2,
            "percentile": 78,
            "displayName": "Power (W/kg)"
          },
          "peakPower": {
            "value": 2100,
            "percentile": 82,
            "displayName": "Peak Power (W)"
          }
        },
        "composite_score_level": 80
      }
    ],
    "SJ": [...],
    "HJ": [...],
    "PPU": [...],
    "IMTP": [...]
  },
  "history_overall": {
    "CMJ": [...],
    ...
  }
}
```

---

## How the System Works Now

### 1. VALD Sync Process

When you click "Sync Latest Tests":

1. **Fetch tests from VALD API** (last 60 days)
2. **Store averaged trials** in respective test tables (cmj_tests, sj_tests, etc.)
3. **Calculate percentiles** for each metric using `percentile_lookup` table
4. **Save to history** in `athlete_percentile_history` table:
   - One row for athlete's play level (e.g., "High School")
   - One row for "Overall" (for comparison)

### 2. Percentile Calculation

For each metric:
- Look up the value in `percentile_lookup` table
- Filter by `metric_column` and `play_level`
- Find the highest percentile where `value <=` athlete's value
- Store both the value AND percentile in JSONB `metrics` column

### 3. Display in UI

**Force Profile Overview:**
- Shows 6 key metric cards
- Each card displays: Metric value + Unit + Percentile
- Percentiles color-coded by performance tier

**Individual Test Tabs (CMJ, SJ, etc.):**
- Detailed breakdown of all metrics
- Can show trends over time (once charting is implemented)

---

## Next Steps

### Immediate Actions (Required)

1. **Run the SQL fix** in Supabase (see top of document)

2. **Verify the fix worked:**
```sql
-- Test insert with 'Overall'
INSERT INTO athlete_percentile_history (
  athlete_id,
  test_type,
  test_date,
  test_id,
  play_level,
  metrics,
  composite_score_level
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'CMJ',
  NOW(),
  'test-check',
  'Overall',
  '{"test": {"value": 100, "percentile": 50}}',
  50
);

-- Should succeed! Then clean up:
DELETE FROM athlete_percentile_history WHERE test_id = 'test-check';
```

3. **Re-sync an athlete's VALD tests:**
   - Go to athlete profile
   - Navigate to Force Profile tab
   - Click "Sync Latest Tests"
   - Check that `athlete_percentile_history` table now has data

4. **Verify UI shows data:**
   - Should see 6 metric cards with values and percentiles
   - Should see test type breakdown cards

### Future Enhancements (Optional)

1. **Add charting components** to visualize percentile trends over time
   - Use the `/percentile-history` API endpoint
   - Show line charts of percentiles over time
   - Show line charts of metric values over time
   - Compare athlete's play level vs Overall

2. **Add CMJ Peak Force percentiles** (requires Driveline data)
   - Need percentile data for `peak_takeoff_force_cmj` in `percentile_lookup` table
   - Once added, will automatically be tracked

3. **Add composite score calculation** for Overall
   - Currently `composite_score_overall` is null
   - Could calculate average across all test types for Overall play level

---

## Troubleshooting

### Issue: Cards show "No data"

**Check:**
1. Does athlete have VALD profile linked? (`athletes.vald_profile_id`)
2. Have tests been synced? Check `cmj_tests`, `sj_tests`, etc.
3. Does athlete have `play_level` set?
4. Are there rows in `athlete_percentile_history`?

### Issue: Percentiles not saving

**Check:**
1. Did you run the SQL fix for the constraint?
2. Check server logs during sync for errors
3. Verify `percentile_lookup` table has data for the athlete's play level

### Issue: Wrong percentiles showing

**Check:**
1. Verify column name mappings in `save-percentile-history.ts`
2. Check that Driveline column names match `percentile_lookup.metric_column`
3. Check `percentile_metric_mappings` table for correct mappings

---

## File Changes Summary

### New Files Created
- `components/dashboard/athletes/force-profile/metric-overview-cards.tsx`
- `app/api/athletes/[id]/vald/percentile-history/route.ts`
- `scripts/fix-constraint-direct.ts`
- `scripts/check-percentile-history-table.ts`
- `scripts/fix-percentile-history-constraint.sql`

### Modified Files
- `app/api/athletes/[id]/vald/percentiles/route.ts` - Added individual metric percentiles
- `components/dashboard/athletes/force-profile/composite-score-section.tsx` - Added metric cards
- `lib/vald/save-percentile-history.ts` - Fixed IMTP column name mappings

### Key Database Tables
- `athlete_percentile_history` - Stores historical percentile data (NEEDS CONSTRAINT FIX)
- `percentile_lookup` - Reference data for percentile calculations
- `percentile_metric_mappings` - Maps VALD columns to Driveline columns
- `cmj_tests`, `sj_tests`, `hj_tests`, `ppu_tests`, `imtp_tests` - Store raw test data

---

## Testing Checklist

- [ ] Run SQL constraint fix in Supabase
- [ ] Verify constraint allows 'Overall' (test insert)
- [ ] Sync VALD tests for an athlete
- [ ] Verify `athlete_percentile_history` has data (10 rows for 5 tests)
- [ ] Check Force Profile Overview shows 6 metric cards
- [ ] Verify cards show both VALUES and PERCENTILES
- [ ] Test percentile history API endpoint
- [ ] Verify IMTP shows separate percentiles for Net Peak Force and Relative Strength
- [ ] Check SJ shows percentiles for both Peak Power and Peak Power/BW

---

## Architecture Diagram

```
VALD Sync Flow:
┌─────────────────────┐
│  VALD ForceDecks    │
│       API           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│  /api/athletes/[id]/vald/sync   │
│  - Fetches last 60 days         │
│  - Averages multiple trials     │
│  - Stores in test tables        │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  save-percentile-history.ts     │
│  - Looks up in percentile_lookup│
│  - Calculates percentiles       │
│  - Saves to history table       │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  athlete_percentile_history     │
│  - Stores metrics + percentiles │
│  - Two rows per test            │
│    (play_level + Overall)       │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  UI Components                  │
│  - Metric overview cards        │
│  - Test breakdown               │
│  - Charts (future)              │
└─────────────────────────────────┘
```

---

## Support

If you encounter issues:
1. Check server logs in Next.js console
2. Check Supabase logs for database errors
3. Use the test scripts in `/scripts/` to diagnose
4. Verify RLS policies allow service role access to all tables
