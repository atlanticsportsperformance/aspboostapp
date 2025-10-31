# Force Plate Management Guide

## Overview

Complete guide for managing VALD Force Plate data, including clearing old data, bulk syncing, and automated nightly updates.

---

## 🧹 Clearing All Force Plate Data (Fresh Start)

### When to Use

- Starting with fresh/clean data
- Fixing corrupted percentile calculations
- Testing new sync logic

### How to Clear Data

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard
   - Navigate to your project
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

2. **Run the Clear Script**
   ```sql
   -- Located at: scripts/clear-all-force-plate-data.sql

   -- Clear all test tables
   DELETE FROM cmj_tests;
   DELETE FROM sj_tests;
   DELETE FROM hj_tests;
   DELETE FROM ppu_tests;
   DELETE FROM imtp_tests;

   -- Clear percentile tracking
   DELETE FROM athlete_percentile_history;
   DELETE FROM athlete_percentile_contributions;
   DELETE FROM percentile_lookup;

   -- Reset sync timestamps
   UPDATE athletes SET vald_synced_at = NULL WHERE vald_synced_at IS NOT NULL;
   ```

3. **Verify Deletion**
   ```sql
   SELECT
     'cmj_tests' as table_name, COUNT(*) as count FROM cmj_tests
   UNION ALL SELECT 'sj_tests', COUNT(*) FROM sj_tests
   UNION ALL SELECT 'hj_tests', COUNT(*) FROM hj_tests
   UNION ALL SELECT 'ppu_tests', COUNT(*) FROM ppu_tests
   UNION ALL SELECT 'imtp_tests', COUNT(*) FROM imtp_tests
   UNION ALL SELECT 'athlete_percentile_history', COUNT(*) FROM athlete_percentile_history
   UNION ALL SELECT 'athlete_percentile_contributions', COUNT(*) FROM athlete_percentile_contributions
   UNION ALL SELECT 'percentile_lookup', COUNT(*) FROM percentile_lookup;
   ```

   All counts should be **0**.

### What Gets Deleted

✅ **Deleted:**
- All Force Plate test data (CMJ, SJ, HJ, PPU, IMTP)
- All percentile history records
- All percentile contributions
- All percentile lookup data
- Athlete sync timestamps (resets for full resync)

❌ **NOT Deleted:**
- Athlete profiles
- VALD profile links
- Other data (Blast, TrackMan, Rapsodo, workouts, etc.)
- Organization settings

---

## 🔄 365-Day Bulk Sync

### Overview

Syncs **past year** of Force Plate data for **ALL athletes** with VALD profiles.

### Where to Find It

**App:** Admin Settings → Active Settings → Force Plates → "365-Day Full Sync" section

**Direct URL:** `/dashboard/admin` (then click Force Plates tab)

### How to Use

1. Navigate to Admin Settings → Force Plates
2. Click **"Start 365-Day Sync"** button
3. Confirm the action (warning: may take 5-10 minutes)
4. Wait for completion
5. View sync results (shows per-athlete stats)

### What It Does

For **each athlete** with a VALD profile:
1. Fetches past 365 days of tests from VALD API
2. Saves tests to database (CMJ, SJ, HJ, PPU, IMTP)
3. Creates percentile history records
4. SQL triggers add contributions (2nd+ tests only)
5. SQL triggers recalculate percentile_lookup
6. TypeScript recalculates percentiles after triggers fire
7. Calculates Force Profile composites for each test date

### Expected Duration

- **Small team (1-10 athletes):** 1-2 minutes
- **Medium team (10-50 athletes):** 3-5 minutes
- **Large team (50+ athletes):** 5-10 minutes

### Sync Results Display

After completion, you'll see:
- **Total Athletes:** Athletes processed
- **Successful:** Syncs completed successfully
- **Failed:** Syncs that encountered errors
- **Tests Synced:** Total tests imported

Plus per-athlete breakdown with test counts.

### API Endpoint

**POST** `/api/admin/force-plates/bulk-sync`

**Request Body:**
```json
{
  "days": 365
}
```

**Response:**
```json
{
  "success": true,
  "message": "Synced 250 tests across 10/12 athletes",
  "summary": {
    "totalAthletes": 12,
    "successfulSyncs": 10,
    "failedSyncs": 2,
    "totalTestsSynced": 250
  },
  "results": [
    {
      "athleteId": "uuid",
      "athleteName": "John Doe",
      "success": true,
      "syncedCount": 25,
      "message": "..."
    }
  ]
}
```

---

## 🌙 Nightly Auto-Sync

### Overview

Automatically syncs **past 24 hours** of Force Plate data **every night at 2:00 AM EST**.

### Where to Configure

**App:** Admin Settings → Active Settings → Force Plates → "Nightly Auto-Sync" section

### How It Works

1. **Vercel Cron Job** triggers at 2:00 AM EST daily
2. Fetches all athletes with VALD profiles
3. For each athlete:
   - Syncs **only past 24 hours** of tests
   - Updates percentile history
   - Triggers recalculate percentiles
4. Logs results to Vercel logs

### Configuration

**File:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/nightly-force-plate-sync",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Schedule:** `0 6 * * *` = Daily at 6:00 AM UTC (2:00 AM EST)

### Cron Schedule Reference

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 and 7 = Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

**Examples:**
- `0 6 * * *` - Daily at 6:00 AM UTC (2:00 AM EST)
- `0 12 * * *` - Daily at 12:00 PM UTC (8:00 AM EST)
- `0 6 * * 1` - Every Monday at 6:00 AM UTC
- `0 6 1 * *` - First day of every month at 6:00 AM UTC

### Environment Variables Required

**Add to Vercel:**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `CRON_SECRET` = Random secure string (e.g., `openssl rand -base64 32`)
   - `NEXT_PUBLIC_BASE_URL` = Your production URL (e.g., `https://yourapp.vercel.app`)

**Example `.env.local`:**
```bash
CRON_SECRET=your-random-secret-string-here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Vercel Cron Job Security

The cron endpoint is protected with a secret token:

```typescript
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Only Vercel can call this endpoint with the correct secret.

### Testing the Cron Job Locally

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test cron endpoint
curl -X GET http://localhost:3000/api/cron/nightly-force-plate-sync \
  -H "Authorization: Bearer your-cron-secret"
```

### Viewing Cron Logs

**Vercel Dashboard:**
1. Go to your project
2. Click "Deployments"
3. Click on a deployment
4. Click "Functions"
5. Find `/api/cron/nightly-force-plate-sync`
6. View logs

### Toggle Nightly Sync

**In App:** Admin Settings → Force Plates → Toggle switch next to "Nightly Auto-Sync"

**Note:** Currently the toggle is UI-only. To fully disable:
- Remove the cron job from `vercel.json`
- Or modify the cron endpoint to check a database flag

---

## 📊 Data Flow Summary

### Complete Flow (After Clearing & Resyncing)

```
1. CLEAR DATA (Supabase SQL)
   ↓
2. BULK SYNC (365 days)
   ↓
3. VALD API → Test Tables
   ↓
4. Test Tables → Percentile History (TypeScript)
   ↓
5. History → Contributions (SQL Trigger)
   ↓
6. Contributions → Percentile Lookup (SQL Trigger)
   ↓
7. Recalculate History Percentiles (TypeScript)
   ↓
8. Calculate Force Profiles (TypeScript)
   ↓
9. NIGHTLY AUTO-SYNC (Vercel Cron, 24 hours only)
   ↓
10. Repeat steps 3-8 for new tests
```

### Automatic Operations (No Manual Intervention)

✅ Test data saved to tables
✅ Percentile history created
✅ Contributions added (2nd+ tests)
✅ Percentile lookup recalculated
✅ Percentiles corrected after triggers
✅ Force Profiles calculated
✅ Nightly sync runs automatically

### Manual Operations (When Needed)

🔧 Clear all data (SQL script)
🔧 Bulk sync 365 days (Admin UI button)
🔧 Toggle nightly sync (Admin UI toggle)

---

## 🚨 Troubleshooting

### Issue: Percentiles showing 0 or incorrect values

**Solution:** Recalculation runs automatically during sync. If still wrong:
1. Check percentile_lookup has data for that metric/play level
2. Verify athlete has correct play_level set
3. Check athlete_percentile_contributions exists

### Issue: Bulk sync takes too long or times out

**Solution:**
- Vercel functions have 60s timeout on Hobby plan, 300s on Pro
- For large teams (50+ athletes), consider upgrading to Pro
- Or sync in batches (run multiple smaller syncs)

### Issue: Nightly sync not running

**Check:**
1. `vercel.json` exists and has cron config
2. `CRON_SECRET` environment variable set in Vercel
3. Cron job deployed (check Vercel Functions tab)
4. View logs in Vercel Dashboard

### Issue: Force Profile not showing on radar

**Check:**
1. Athlete has ALL 4 test types (SJ, HJ, PPU, IMTP) on same date
2. Run Force Profile calculation manually:
   - Individual athlete: Click "Sync VALD Data" on athlete page
   - All athletes: Use bulk sync

### Issue: Previous Force Profile line not showing on radar

**Fixed in latest version!** Now shows if at least 3/6 metrics have previous data.

---

## 📝 Files Reference

### SQL Scripts
- `scripts/clear-all-force-plate-data.sql` - Clear all Force Plate data

### API Endpoints
- `/api/admin/force-plates/bulk-sync` - 365-day bulk sync
- `/api/cron/nightly-force-plate-sync` - Nightly auto-sync
- `/api/athletes/[id]/vald/sync` - Individual athlete sync

### UI Components
- `app/dashboard/admin/page.tsx` - Admin settings page
- `components/dashboard/admin/force-plates-tab.tsx` - Force Plates tab

### Configuration
- `vercel.json` - Cron job configuration

### Documentation
- `docs/FORCE_PLATE_MANAGEMENT.md` - This file
- `docs/PERCENTILE_RECALCULATION_FIX.md` - Percentile fix details
- `docs/FORCE_PROFILE_BY_DATE_FIX.md` - Force Profile fix details

---

## 🎯 Best Practices

### When Starting Fresh

1. ✅ Clear all data using SQL script
2. ✅ Run 365-day bulk sync
3. ✅ Enable nightly auto-sync
4. ✅ Verify data looks correct (check a few athletes)
5. ✅ Monitor nightly sync logs for first week

### For Ongoing Operations

- ✅ Let nightly sync handle new tests automatically
- ✅ Only run bulk sync if you cleared data or onboarding many new athletes
- ✅ Check Vercel logs weekly to ensure nightly sync is working
- ✅ Monitor percentile calculations for accuracy

### For Large Teams

- ✅ Upgrade to Vercel Pro for longer function timeouts
- ✅ Consider batching bulk syncs (sync 20 athletes at a time)
- ✅ Use Vercel Analytics to monitor cron job performance

---

## ✅ Complete Setup Checklist

### One-Time Setup

- [ ] Add `CRON_SECRET` to Vercel environment variables
- [ ] Add `NEXT_PUBLIC_BASE_URL` to Vercel environment variables
- [ ] Deploy `vercel.json` with cron configuration
- [ ] Verify cron job appears in Vercel Dashboard → Functions

### After Fresh Install or Data Clear

- [ ] Run SQL script to clear all Force Plate data
- [ ] Navigate to Admin Settings → Force Plates
- [ ] Click "Start 365-Day Sync"
- [ ] Wait for completion and verify results
- [ ] Enable "Nightly Auto-Sync" toggle
- [ ] Check athlete Force Profile pages for correct data

### Ongoing Maintenance

- [ ] Weekly: Check Vercel logs to verify nightly sync running
- [ ] Monthly: Spot-check percentile calculations for accuracy
- [ ] Quarterly: Review Force Profile composites for trends

---

## 📞 Support

If you encounter issues:
1. Check this documentation first
2. Review Vercel logs for cron job errors
3. Check Supabase logs for SQL errors
4. Verify environment variables are set correctly
5. Test individual athlete sync before bulk sync
