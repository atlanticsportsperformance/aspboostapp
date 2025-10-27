# Force Profile Fix Summary

## Critical Issue Found

**Problem:** `athlete_percentile_history` table is EMPTY because the `play_level` CHECK constraint does NOT include `'Overall'`.

### Fix Required (MANUAL - Run in Supabase SQL Editor)

```sql
-- Fix the play_level constraint to include 'Overall'
ALTER TABLE athlete_percentile_history
DROP CONSTRAINT IF EXISTS athlete_percentile_history_play_level_check;

ALTER TABLE athlete_percentile_history
ADD CONSTRAINT athlete_percentile_history_play_level_check
CHECK (play_level IN ('Youth', 'High School', 'College', 'Pro', 'Overall'));
```

**Why This Matters:**
- The sync route tries to save percentiles for BOTH the athlete's play level AND "Overall"
- When it tries to save "Overall", the constraint violation causes a silent failure
- Result: NO percentiles are being saved to the history table
- The UI works because it calculates percentiles ON THE FLY from `percentile_lookup` table

---

## Force Profile Overview UI Requirements

### User's Required Metrics (6 Cards)

1. **IMTP Net Peak Force** (N) + percentile
2. **IMTP Relative Strength** + percentile
3. **SJ Peak Power / BW** (W/kg) + percentile
4. **PPU Peak Force** (N) + percentile
5. **SJ Peak Power** (W) + percentile
6. **HJ RSI** + percentile

### Current Implementation Status

✅ **Created** `metric-overview-cards.tsx` component
✅ **Updated** `composite-score-section.tsx` to use the new cards
✅ **Updated** percentiles API to return individual metric percentiles
⚠️  **Need to verify** data is being passed correctly

---

## Percentile Tracking for CMJ

### User Request
> "we also need CMJ Peak Force and CMJ Peak Power/ BW in the percentile over time"

### Implementation

CMJ metrics in `save-percentile-history.ts`:
```typescript
CMJ: [
  { column: 'bodymass_relative_takeoff_power_trial_value', displayName: 'Power (W/kg)' },
  { column: 'peak_takeoff_power_trial_value', displayName: 'Peak Power (W)' },
  { column: 'jump_height_trial_value', displayName: 'Jump Height (cm)' },
],
```

**Status:**
- ✅ Peak Power (W) is already tracked
- ✅ Peak Power / BW (W/kg) is already tracked
- ❌ Peak Force is NOT tracked (not in Driveline percentile_lookup table)

**Note:** The `percentile_lookup` table does NOT have percentiles for `peak_takeoff_force_cmj`. We can only track metrics that have percentile data in that table.

---

## Percentile History API for Charting

### User Request
> "I want athlete percentiles stored over time so we can chart it along with metrics over time..... how can we do?"

### Implementation Plan

1. **Fix the constraint** (see SQL above)
2. **Re-sync tests** to populate `athlete_percentile_history`
3. **Create GET endpoint** `/api/athletes/[id]/vald/percentile-history`
   - Returns time-series data for charting
   - Groups by test_type and date
   - Returns both metrics AND percentiles over time

4. **Update UI** to show charts of percentiles over time

Example API response structure:
```json
{
  "CMJ": [
    {
      "test_date": "2025-01-15",
      "test_id": "abc123",
      "play_level": "High School",
      "metrics": {
        "power": { "value": 45.2, "percentile": 78 },
        "peakPower": { "value": 2100, "percentile": 82 }
      },
      "composite_score_level": 80
    }
  ],
  "SJ": [...],
  "HJ": [...],
  "PPU": [...],
  "IMTP": [...]
}
```

---

## Action Items

### 1. Fix Database Constraint (IMMEDIATE - USER ACTION REQUIRED)

**User must run this SQL in Supabase SQL Editor:**
```sql
ALTER TABLE athlete_percentile_history
DROP CONSTRAINT IF EXISTS athlete_percentile_history_play_level_check;

ALTER TABLE athlete_percentile_history
ADD CONSTRAINT athlete_percentile_history_play_level_check
CHECK (play_level IN ('Youth', 'High School', 'College', 'Pro', 'Overall'));
```

### 2. Test Percentile Saving

After fixing constraint:
1. Delete any existing athlete_percentile_history rows (if any)
2. Run a VALD sync for an athlete
3. Verify `athlete_percentile_history` table has rows
4. Should see 2 rows per test (one for athlete's play_level, one for 'Overall')

### 3. Create Percentile History API

File: `app/api/athletes/[id]/vald/percentile-history/route.ts`

Reads from `athlete_percentile_history` table and returns time-series data.

### 4. Update UI for Charts

Add chart components to show:
- Percentile trends over time per test type
- Metric value trends over time
- Composite score trends

---

## Files Modified

### API Changes
- ✅ `app/api/athletes/[id]/vald/percentiles/route.ts` - Added metric_percentiles to response
- ⏳ `app/api/athletes/[id]/vald/percentile-history/route.ts` - Need to create

### UI Changes
- ✅ `components/dashboard/athletes/force-profile/metric-overview-cards.tsx` - New component
- ✅ `components/dashboard/athletes/force-profile/composite-score-section.tsx` - Updated to use cards

### Utility Scripts
- ✅ `scripts/fix-constraint-direct.ts` - Verifies constraint issue
- ✅ `scripts/check-percentile-history-table.ts` - Checks table status

---

## Testing Checklist

- [ ] Run SQL fix in Supabase
- [ ] Verify constraint allows 'Overall' inserts
- [ ] Sync VALD tests for an athlete
- [ ] Check `athlete_percentile_history` has data (should have 10 rows for 5 tests × 2 play levels)
- [ ] Verify Force Profile Overview shows 6 metric cards with values and percentiles
- [ ] Verify cards display actual metric values (not just percentiles)
- [ ] Create percentile history API endpoint
- [ ] Test charting percentiles over time
