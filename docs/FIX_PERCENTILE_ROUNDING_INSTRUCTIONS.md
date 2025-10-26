# Fix Percentile Rounding Issue

## Problem

Multiple values were getting 0th percentile due to improper rounding:
- Value #1: 0/833 = 0.0% → ROUND(0.0) = 0
- Value #2: 1/833 = 0.12% → ROUND(0.12) = 0
- Value #3: 2/833 = 0.24% → ROUND(0.24) = 0
- Value #4: 3/833 = 0.36% → ROUND(0.36) = 0
- Value #5: 4/833 = 0.48% → ROUND(0.48) = 0

**Result:** 5+ athletes all showing 0th percentile ❌

## Solution

Use `CEIL()` (round UP) for all values except the true minimum:
- Value #1: 0/833 = 0.0% → 0th percentile (minimum value)
- Value #2: 1/833 = 0.12% → CEIL(0.12) = **1st percentile** ✅
- Value #3: 2/833 = 0.24% → CEIL(0.24) = **1st percentile** ✅
- Value #4: 3/833 = 0.36% → CEIL(0.36) = **1st percentile** ✅
- Value #5: 4/833 = 0.48% → CEIL(0.48) = **1st percentile** ✅
- Value #6: 5/833 = 0.60% → CEIL(0.60) = **1st percentile** ✅
- Value #7: 6/833 = 0.72% → CEIL(0.72) = **1st percentile** ✅
- Value #8: 7/833 = 0.84% → CEIL(0.84) = **1st percentile** ✅
- Value #9: 8/833 = 0.96% → CEIL(0.96) = **1st percentile** ✅
- Value #10: 9/833 = 1.08% → CEIL(1.08) = **2nd percentile** ✅

Now only ONE value has 0th percentile (the lowest), and distribution is correct!

## Steps to Fix

### 1. Apply Migration

In Supabase Dashboard → SQL Editor, run:

**File:** `supabase/migrations/FIX_PERCENTILE_CALCULATION_ROUNDING.sql`

This updates the `recalculate_percentiles_for_metric()` function with correct rounding.

### 2. Recalculate All Percentiles

```bash
npx tsx scripts/populate-percentile-lookup-OPTIMIZED.ts
```

This will:
- Clear all existing percentile values
- Recalculate with the corrected rounding logic
- Take ~20-30 seconds

### 3. Verify Fix

```bash
npx tsx scripts/check-for-duplicate-percentiles.ts
```

**Expected result:**
- Each metric/level combination has exactly ONE 0th percentile (the minimum value)
- No duplicate 0th percentiles

## New Rounding Logic

```sql
IF count_below = 0 THEN
  percentile := 0;  -- This is the minimum value
ELSE
  percentile := CEIL((count_below / total_count) * 100);  -- Round UP
END IF;
```

This ensures:
- ✅ Only minimum value gets 0th percentile
- ✅ Proper distribution from 1-99
- ✅ No duplicate percentiles at the low end
- ✅ Athletes can still reach 100th percentile at the top (count_below = total_count)

## Why CEIL Instead of ROUND?

**ROUND:**
- 0.4% → 0th percentile
- 0.6% → 1st percentile
- Creates duplicates at 0

**CEIL:**
- 0.4% → 1st percentile
- 0.6% → 1st percentile
- Only true minimum gets 0

CEIL ensures everyone except the absolute worst performer gets at least 1st percentile, which is more accurate.
