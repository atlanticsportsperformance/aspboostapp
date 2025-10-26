# Evan's VALD Approach vs Your Current Setup

## Key Differences

### 1. Profile API - NOT NEEDED!

**Evan's Approach:**
- Has `valdProfileApi.ts` but **the endpoint doesn't actually exist**
- `https://prd-use-api-extprofiles.valdperformance.com` - DNS doesn't resolve
- This explains why he doesn't actually create profiles in VALD

**Your Setup:**
- Same situation - Profile API endpoint doesn't exist
- ✅ **This is fine!** You don't need it.

**How It Works Without Profile API:**
1. Athletes are created in YOUR app (Supabase database)
2. Athletes test on VALD ForceDecks hardware
3. VALD assigns them a `profileId` automatically
4. You sync test data using their `profileId`

**Key Insight:** The `profileId` comes FROM VALD when athletes test, not from you creating profiles via API!

---

### 2. ForceDecks API - THIS IS WHAT MATTERS

**Evan's Implementation:**
```typescript
// lib/forcedecks-api.ts
export class SimpleVALDForceDecksAPI {
  private baseUrl = 'https://prd-use-api-extforcedecks.valdperformance.com'

  // Authentication
  async authenticate() {
    const authUrl = 'https://security.valdperformance.com/connect/token'
    // Uses client_credentials grant with scope: 'api.dynamo api.external'
  }

  // Get tests modified after a certain date
  async getTests(modifiedFromUtc?: string, profileId?: string) {
    const queryParams = new URLSearchParams({
      TenantId: this.tenantId,
      ModifiedFromUtc: modifiedFromUtc,
      ProfileId: profileId  // Optional - filter by athlete
    })
    return await this.makeRequest(`/tests?${queryParams}`)
  }

  // Get detailed trial data for a test
  async getTrials(testId: string) {
    return await this.makeRequest(
      `/v2019q3/teams/${this.tenantId}/tests/${testId}/trials`
    )
  }
}
```

**Your Current Setup:**
- ✅ You have the same `forcedecks-api.ts` structure
- ✅ Authentication works (we tested this!)
- ❌ Just needs the `ModifiedFromUtc` parameter added to queries

---

### 3. Test Data Storage Flow

**Evan's Flow:**

```
1. Athlete tests on VALD ForceDecks
   ↓
2. VALD creates/assigns profileId automatically
   ↓
3. Cron job runs: /api/vald-sync
   ↓
4. Calls api.getTests(modifiedFromUtc) - gets all recent tests
   ↓
5. For each test:
   - Calls api.getTrials(testId) - gets detailed metrics
   - Maps trial data to database schema
   - Stores in cmj_tests, sj_tests, hj_tests, ppu_tests, imtp_tests
   ↓
6. Test triggers check for 2nd complete session
   ↓
7. If 2nd session → add to athlete_percentile_contributions
   ↓
8. Percentiles recalculate
```

**Key Code - storeTest.ts:**
```typescript
export async function storeCMJTest(trials: Trial[], testId: string) {
  const data: Prisma.CMJTestCreateInput[] = []

  for (const trial of trials) {
    const trialData = {
      athleteId: trial.athleteId,  // From VALD
      recordedUTC: new Date(trial.recordedUTC),
      testId: testId,
    }

    // Map VALD metric names to your database columns
    for (const result of trial.results) {
      const name = result.definition.result  // e.g., "JUMP_HEIGHT"
      const limb = result.limb.toLowerCase()  // "trial", "left", "right"
      const valueKey = `${name}_${limb}_value`
      trialData[valueKey] = result.value
      trialData[unitKey] = result.definition.unit
    }

    data.push(trialData)
  }

  await prisma.cMJTest.createMany({ data })
}
```

---

### 4. What You Need to Fix

**Step 1: Fix ForceDecks API Test Query**

Your current test tries to call `/tests` without `ModifiedFromUtc`. Add this parameter:

```typescript
// In your forcedecks-api.ts or test script
async getTests(modifiedFromUtc?: string, profileId?: string) {
  if (!modifiedFromUtc) {
    // Default to 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    modifiedFromUtc = thirtyDaysAgo.toISOString()
  }

  const queryParams = new URLSearchParams({
    TenantId: this.tenantId,
    ModifiedFromUtc: modifiedFromUtc,
  })

  if (profileId) {
    queryParams.append('ProfileId', profileId)
  }

  return await this.makeRequest(`/tests?${queryParams}`)
}
```

**Step 2: Create Sync Endpoint**

Create `/app/api/vald/sync/route.ts`:

```typescript
import { SimpleVALDForceDecksAPI } from '@/lib/vald/forcedecks-api'
import { storeValdTest } from '@/lib/vald/store-test'

export async function POST(req: Request) {
  try {
    const api = new SimpleVALDForceDecksAPI()

    // Get tests from last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const modifiedFrom = sevenDaysAgo.toISOString()

    const { tests } = await api.getTests(modifiedFrom)

    let syncedCount = 0
    for (const test of tests) {
      // Get detailed trial data
      const trials = await api.getTrials(test.testId)

      // Store based on test type
      await storeValdTest(test, trials)
      syncedCount++
    }

    return Response.json({
      success: true,
      synced: syncedCount,
      total: tests.length
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

**Step 3: Map VALD Data to Your Schema**

Your database already has the right columns! Just need to map VALD trial data:

```typescript
// lib/vald/store-test.ts
export async function storeValdTest(valdTest: VALDTest, trials: Trial[]) {
  const testType = valdTest.testType

  if (testType === 'CMJ') {
    await storeCMJTest(trials, valdTest.testId)
  } else if (testType === 'SJ') {
    await storeSJTest(trials, valdTest.testId)
  }
  // ... etc for HJ, PPU, IMTP
}

async function storeCMJTest(trials: Trial[], testId: string) {
  const data = trials.map(trial => {
    const record: any = {
      athlete_id: trial.athleteId,  // Maps to your athletes table
      recorded_utc: new Date(trial.recordedUTC),
      test_id: testId
    }

    // Map each metric from VALD to your columns
    for (const result of trial.results) {
      const metricName = result.definition.result  // "JUMP_HEIGHT", "PEAK_POWER", etc
      const limb = result.limb.toLowerCase()

      // Your columns: jump_height_trial_value, peak_takeoff_power_trial_value, etc
      record[`${metricName.toLowerCase()}_${limb}_value`] = result.value
      record[`${metricName.toLowerCase()}_${limb}_unit`] = result.definition.unit
    }

    return record
  })

  await supabase.from('cmj_tests').insert(data)
}
```

---

## Summary

**What Works:**
- ✅ Your VALD credentials authenticate correctly
- ✅ ForceDecks API endpoint exists and responds
- ✅ Your database schema matches VALD data structure
- ✅ Your percentile system is ready

**What's Missing:**
1. Add `ModifiedFromUtc` parameter to API queries
2. Create sync endpoint that pulls test data
3. Map VALD trial metrics to your database columns
4. Athletes get `profileId` from VALD when they test (not via Profile API)

**The Profile API issue is a red herring** - Evan doesn't use it either because it doesn't exist. Athletes are managed in YOUR database, and VALD just assigns them profileIds when they test on the hardware.

**Next Steps:**
1. I can update your `forcedecks-api.ts` to match Evan's working version
2. Create the sync endpoint
3. Create the store-test mapping functions
4. Test with your VALD credentials

Want me to implement these fixes?
