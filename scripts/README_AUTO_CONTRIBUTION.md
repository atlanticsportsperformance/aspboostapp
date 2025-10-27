# Auto-Contribution System - Quick Start

## TL;DR - Run This One Command

```bash
set -a && source .env.local && set +a && npx tsx scripts/setup-auto-contribution-complete.ts
```

This will:
1. Create database triggers and function
2. Backfill Colin Ma's missing contributions
3. Test everything to make sure it works

## What This System Does

**Problem:** Colin Ma has 2 complete test sessions but only IMTP contribution exists.

**Root Cause:** The auto-contribution trigger system was never created.

**Solution:** This system automatically adds athletes to `athlete_percentile_contributions` after they complete 2 full test sessions (all 5 tests: CMJ, SJ, HJ, PPU, IMTP).

## Files Created

### Main Scripts (Run These)
- `setup-auto-contribution-complete.ts` - **RUN THIS ONE** - Does everything
- `apply-auto-contribution-system.ts` - Applies SQL migration only
- `backfill-colin-contributions.ts` - Backfills Colin's data only
- `test-auto-contribution-system.ts` - Tests system only

### Analysis Scripts (Already Ran)
- `analyze-colin-percentile-contributions.ts` - Showed Colin's issue
- `check-trigger-system.ts` - Confirmed triggers missing

### SQL
- `create-auto-contribution-system.sql` - The actual SQL migration

### Documentation
- `../docs/AUTO_CONTRIBUTION_SYSTEM.md` - Full documentation

## Quick Verification

After running setup, verify it worked:

```bash
npx tsx scripts/test-auto-contribution-system.ts
```

Expected output:
```
✅ PASS: Function check_and_add_percentile_contribution() exists
✅ PASS: All 5 triggers exist
✅ PASS: Colin Ma has all 5 contributions
✅ ALL TESTS PASSED!
```

## How It Works Going Forward

### Automatic Process

```
Athlete syncs 1st complete session
  → Tests stored
  → ❌ NOT added to contributions (need 2 sessions)

Athlete syncs 2nd complete session
  → Tests stored
  → ✅ AUTOMATICALLY added to contributions (all 5 test types!)
  → Triggers fire instantly
  → No manual work needed

Athlete syncs 3rd+ sessions
  → Tests stored for progress tracking
  → Already contributing (unique constraint prevents duplicates)
```

### Complete Session Definition

A "complete session" = all 5 tests on the same calendar day:
- CMJ (Counter Movement Jump)
- SJ (Squat Jump)
- HJ (Hop Test)
- PPU (Prone Push-Up)
- IMTP (Isometric Mid-Thigh Pull)

## Colin Ma - Before & After

### Before
```
Complete Sessions: 2 (9/4/2025 and 10/21/2025)
Contributions: 1
  - IMTP only ❌

Problem: Missing CMJ, SJ, HJ, PPU contributions
```

### After (Running Backfill)
```
Complete Sessions: 2
Contributions: 5
  - CMJ ✅
  - SJ ✅
  - HJ ✅
  - PPU ✅
  - IMTP ✅

Status: Fully contributing to percentile database!
```

## Troubleshooting

### Command Not Found Error
Make sure you're in the project root directory and have run `npm install`.

### Missing Supabase Credentials
Check `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Tests Failing
Review output from test script - it will tell you exactly what's wrong.

### Trigger Not Firing
Re-run: `npx tsx scripts/apply-auto-contribution-system.ts`

## What Gets Created

### Database Objects
1. Function: `check_and_add_percentile_contribution()`
2. 5 Triggers: `auto_add_contribution_cmj`, `auto_add_contribution_sj`, etc.
3. 5 Indexes: For performance on date-based queries

### Data Changes
- Colin Ma gets 4 new contribution rows (CMJ, SJ, HJ, PPU)
- Any other qualified athletes also get backfilled

## Success Criteria

After running setup, you should see:
- ✅ 5 triggers exist (one per test table)
- ✅ Function exists
- ✅ Colin Ma has 5 contributions
- ✅ All tests pass

## Next Steps After Setup

1. **Sync a new athlete** with 2+ complete sessions
2. **Verify automatic contribution** - check `athlete_percentile_contributions`
3. **Watch database grow** as more athletes qualify
4. **Enjoy accurate percentiles** powered by real data + Driveline baseline

---

**Ready?** Run the one command at the top of this file!
