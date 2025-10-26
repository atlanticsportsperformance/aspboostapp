# VALD FORCEDECKS INTEGRATION PLAN

## EXECUTIVE SUMMARY

**Source Project:** Atlantic-App-Improved (Clerk + Prisma + PostgreSQL)
**Target Project:** ASP Boost+ (Supabase Auth + Supabase PostgreSQL)

**Key Differences:**
- **Auth:** Clerk → Supabase Auth
- **Database:** Prisma ORM → Direct Supabase Client
- **User Model:** Separate Athlete table → Integrated with profiles/athletes tables
- **API:** Standard Next.js routes → Can be standard routes or Server Actions

---

## PART 1: DATABASE SCHEMA MIGRATION

### Current Source Schema (Prisma)

**Athlete Model:**
```prisma
model Athlete {
  id: Int
  dob: DateTime
  email: String
  firstName: String
  lastName: String
  sex: String
  externalId: String      // UUID from VALD
  profileId: String       // VALD Profile ID
  activeStatus: Boolean
  playLevel: String
  syncId: String          // UUID for VALD profile linking
  syncedAt: DateTime
  recentCompositeScore: Float?
  compositeScoreHistory: Json?
}
```

**Test Models:** CMJTest, SJTest, HJTest, PPUTest, IMTPTest
- Each has ~100-250 metric fields
- Pattern: `{METRIC_NAME}_{limb}_value` and `{METRIC_NAME}_{limb}_unit`
- Limbs: trial, left, right, asymm

### Target Supabase Schema Design

**Option A: Link to Existing Athletes Table (RECOMMENDED)**

Extend the current `athletes` table with VALD-specific fields:

```sql
-- Add VALD fields to existing athletes table
ALTER TABLE athletes ADD COLUMN vald_external_id UUID;
ALTER TABLE athletes ADD COLUMN vald_profile_id TEXT;
ALTER TABLE athletes ADD COLUMN vald_sync_id UUID;
ALTER TABLE athletes ADD COLUMN vald_synced_at TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN vald_composite_score FLOAT;
ALTER TABLE athletes ADD COLUMN vald_composite_history JSONB;

-- Create index for fast VALD lookups
CREATE INDEX idx_athletes_vald_profile_id ON athletes(vald_profile_id);
CREATE INDEX idx_athletes_vald_sync_id ON athletes(vald_sync_id);
```

**Create New Test Tables:**

```sql
-- CMJ Test (Countermovement Jump)
CREATE TABLE cmj_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,  -- VALD test identifier
  recorded_utc TIMESTAMPTZ NOT NULL,
  recorded_timezone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- ~250 metric fields following pattern:
  -- {METRIC_NAME}_{limb}_value FLOAT
  -- {METRIC_NAME}_{limb}_unit TEXT

  -- Example fields (abbreviated):
  body_weight_trial_value FLOAT,
  body_weight_trial_unit TEXT,
  jump_height_trial_value FLOAT,
  jump_height_trial_unit TEXT,
  peak_takeoff_force_trial_value FLOAT,
  peak_takeoff_force_trial_unit TEXT,
  peak_takeoff_force_left_value FLOAT,
  peak_takeoff_force_left_unit TEXT,
  peak_takeoff_force_right_value FLOAT,
  peak_takeoff_force_right_unit TEXT,
  peak_takeoff_force_asymm_value FLOAT,
  peak_takeoff_force_asymm_unit TEXT,
  -- ... (see full schema generation script below)

  UNIQUE(athlete_id, test_id)  -- Prevent duplicate syncs
);

-- Similar structure for:
-- sj_tests (Squat Jump)
-- hj_tests (Hop Test)
-- ppu_tests (Prone Push-Up)
-- imtp_tests (Isometric Mid-Thigh Pull)
```

**Row-Level Security:**

```sql
-- Enable RLS
ALTER TABLE cmj_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sj_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hj_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppu_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE imtp_tests ENABLE ROW LEVEL SECURITY;

-- Policies: Athletes see only their own tests
CREATE POLICY "Athletes can view own tests"
  ON cmj_tests FOR SELECT
  USING (
    athlete_id IN (
      SELECT id FROM athletes WHERE user_id = auth.uid()
    )
  );

-- Coaches/admins can view all tests in their org
CREATE POLICY "Coaches can view org tests"
  ON cmj_tests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM athletes a
      JOIN profiles p ON p.id = a.user_id
      WHERE a.id = cmj_tests.athlete_id
        AND a.org_id = (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
        AND p.app_role IN ('coach', 'admin', 'owner')
    )
  );

-- Repeat for all test types
```

---

## PART 2: AUTHENTICATION MAPPING

### Source: Clerk Authentication
```typescript
// Atlantic-App
import { auth } from '@clerk/nextjs';
const { userId } = auth();

// Role checks
const isAdmin = await checkRole(userId, 'ADMIN');
```

### Target: Supabase Authentication
```typescript
// ASP Boost+
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// Role checks from profiles table
const { data: profile } = await supabase
  .from('profiles')
  .select('app_role')
  .eq('id', user.id)
  .single();

const isAdmin = ['admin', 'owner'].includes(profile.app_role);
```

### Auth Integration Strategy

**For API Routes:**
```typescript
// NEW: /app/api/vald/sync/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (!['admin', 'owner'].includes(profile?.app_role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Continue with VALD sync logic...
}
```

---

## PART 3: FILE MIGRATION MAPPING

### Library Files (Copy & Adapt)

| Source File | Target Location | Modifications Required |
|-------------|----------------|------------------------|
| `src/lib/forcedecks-api.ts` | `lib/vald/forcedecks-api.ts` | ✅ None - Pure API client |
| `src/lib/valdProfileApi.ts` | `lib/vald/profile-api.ts` | ✅ None - Pure API client |
| `src/lib/storeTest.ts` | `lib/vald/store-test.ts` | 🔧 Replace Prisma with Supabase |

### API Endpoints (Copy & Adapt)

| Source Endpoint | Target Location | Auth Changes |
|-----------------|----------------|--------------|
| `/api/vald` | `/app/api/vald/route.ts` | Clerk → Supabase |
| `/api/vald-sync` | `/app/api/vald/sync/route.ts` | Clerk → Supabase |
| `/api/vald/test/[testId]` | `/app/api/vald/test/[testId]/route.ts` | Clerk → Supabase |
| `/api/athletes` | Merge into existing `/app/api/athletes/route.ts` | Clerk → Supabase |
| `/api/athletes/vald/[profileId]/sync-tests` | `/app/api/athletes/[id]/vald/sync/route.ts` | Clerk → Supabase |

---

## PART 4: DATABASE OPERATIONS CONVERSION

### Prisma → Supabase Conversion Examples

**1. Create CMJ Test (Source):**
```typescript
// Prisma
await prisma.cMJTest.create({
  data: {
    athleteId: profileId,
    testId: testId,
    recordedUTC: new Date(trial.recordedUTC),
    recordedTimeZone: trial.recordedTimezone,
    JUMP_HEIGHT_trial_value: 0.45,
    JUMP_HEIGHT_trial_unit: 'm',
    // ... more fields
  }
});
```

**Target (Supabase):**
```typescript
// Supabase
const { data, error } = await supabase
  .from('cmj_tests')
  .insert({
    athlete_id: athleteId,  // UUID from athletes table
    test_id: testId,
    recorded_utc: new Date(trial.recordedUTC).toISOString(),
    recorded_timezone: trial.recordedTimezone,
    jump_height_trial_value: 0.45,
    jump_height_trial_unit: 'm',
    // ... more fields
  })
  .select()
  .single();

if (error) throw error;
```

**2. Get Latest Tests (Source):**
```typescript
// Prisma
const latestCMJ = await prisma.cMJTest.findFirst({
  where: { athleteId: profileId },
  orderBy: { recordedUTC: 'desc' }
});
```

**Target (Supabase):**
```typescript
// Supabase
const { data: latestCMJ } = await supabase
  .from('cmj_tests')
  .select('*')
  .eq('athlete_id', athleteId)
  .order('recorded_utc', { ascending: false })
  .limit(1)
  .single();
```

**3. Athlete Lookup (Source):**
```typescript
// Prisma - athleteId is the profileId string
const tests = await prisma.cMJTest.findMany({
  where: { athleteId: profileId }
});
```

**Target (Supabase):**
```typescript
// Supabase - athlete_id is UUID
// First get athlete by vald_profile_id
const { data: athlete } = await supabase
  .from('athletes')
  .select('id')
  .eq('vald_profile_id', profileId)
  .single();

const { data: tests } = await supabase
  .from('cmj_tests')
  .select('*')
  .eq('athlete_id', athlete.id);
```

---

## PART 5: ATHLETE PROFILE AUTO-CREATION HOOK

### Strategy: Supabase Database Trigger

When a new athlete is created in ASP Boost+, automatically create their VALD profile.

**Option A: Database Trigger + Edge Function**

```sql
-- Create a queue table for VALD profile creation
CREATE TABLE vald_profile_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Trigger on athlete insert
CREATE OR REPLACE FUNCTION queue_vald_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO vald_profile_queue (athlete_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_athlete_created
  AFTER INSERT ON athletes
  FOR EACH ROW
  EXECUTE FUNCTION queue_vald_profile_creation();
```

**Option B: Application-Level Hook (SIMPLER)**

Modify the athlete creation flow:

```typescript
// In /app/api/athletes/route.ts or server action

export async function createAthlete(data: AthleteData) {
  const supabase = await createClient();

  // 1. Create athlete in local database
  const { data: athlete, error } = await supabase
    .from('athletes')
    .insert({
      user_id: data.userId,
      org_id: data.orgId,
      position: data.position,
      grad_year: data.gradYear,
      // ... other fields
    })
    .select()
    .single();

  if (error) throw error;

  // 2. Create VALD profile (async, non-blocking)
  try {
    const valdProfile = await createVALDProfile(athlete);

    // 3. Update athlete with VALD IDs
    await supabase
      .from('athletes')
      .update({
        vald_external_id: valdProfile.externalId,
        vald_sync_id: valdProfile.syncId,
        vald_synced_at: new Date().toISOString()
      })
      .eq('id', athlete.id);
  } catch (valdError) {
    console.error('VALD profile creation failed:', valdError);
    // Don't fail athlete creation, queue for retry
  }

  return athlete;
}
```

---

## PART 6: API ENDPOINT STRATEGY

### Recommended Structure

```
/app/api/vald/
  ├── route.ts                    # GET tests for athlete
  ├── sync/
  │   └── route.ts               # POST sync all tests
  ├── test/
  │   └── [testId]/
  │       └── route.ts           # GET test details with trials
  └── profile/
      └── [profileId]/
          └── route.ts           # GET profile with latest tests

/app/api/athletes/
  └── [id]/
      └── vald/
          ├── sync/
          │   └── route.ts       # POST sync tests for this athlete
          └── profile/
              └── route.ts       # GET/POST VALD profile for athlete
```

### Example: Sync Tests for Athlete

```typescript
// /app/api/athletes/[id]/vald/sync/route.ts
import { createClient } from '@/lib/supabase/server';
import { SimpleVALDForceDecksAPI } from '@/lib/vald/forcedecks-api';
import { storeCMJTest, storeSJTest, /* ... */ } from '@/lib/vald/store-test';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const athleteId = params.id;

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get athlete with VALD profile ID
  const { data: athlete } = await supabase
    .from('athletes')
    .select('vald_profile_id')
    .eq('id', athleteId)
    .single();

  if (!athlete?.vald_profile_id) {
    return NextResponse.json({ error: 'No VALD profile' }, { status: 400 });
  }

  // 3. Get latest test date
  const latestDate = await getLatestTestDate(supabase, athleteId);

  // 4. Fetch new tests from VALD
  const valdApi = new SimpleVALDForceDecksAPI();
  const tests = await valdApi.getTests(
    latestDate.toISOString(),
    athlete.vald_profile_id
  );

  // 5. Store each test
  let processed = 0;
  for (const test of tests.tests) {
    const trials = await valdApi.getTrials(test.testId);

    switch (test.testType) {
      case 'CMJ':
        await storeCMJTest(supabase, trials, test.testId, athleteId);
        break;
      case 'SJ':
        await storeSJTest(supabase, trials, test.testId, athleteId);
        break;
      // ... other types
    }
    processed++;
  }

  return NextResponse.json({
    success: true,
    tests_synced: processed
  });
}
```

---

## PART 7: ENVIRONMENT VARIABLES

Add to `.env.local`:

```bash
# VALD ForceDecks API Configuration
VALD_CLIENT_ID=your_client_id
VALD_CLIENT_SECRET=your_client_secret
VALD_TENANT_ID=your_tenant_id

# VALD Profile API
VALD_PROFILE_API_URL=https://profile-api.valdperformance.com

# VALD Regional Endpoints (optional, defaults to Australia East)
VALD_REGION=australia_east  # australia_east | us_east | europe_west
```

---

## PART 8: IMPLEMENTATION PHASES

### Phase 1: Database Setup ✅
1. Create migration file: `supabase/migrations/YYYYMMDD_add_vald_tables.sql`
2. Add VALD fields to athletes table
3. Create test tables (cmj_tests, sj_tests, hj_tests, ppu_tests, imtp_tests)
4. Set up RLS policies
5. Run migration: `npx supabase db push`

### Phase 2: Core Library Migration ✅
1. Copy `forcedecks-api.ts` → `lib/vald/forcedecks-api.ts`
2. Copy `valdProfileApi.ts` → `lib/vald/profile-api.ts`
3. Adapt `storeTest.ts` → `lib/vald/store-test.ts` (Prisma → Supabase)
4. Create `lib/vald/types.ts` for shared TypeScript types

### Phase 3: API Endpoints ✅
1. Create `/app/api/vald/sync/route.ts` - Master sync endpoint
2. Create `/app/api/vald/test/[testId]/route.ts` - Get test details
3. Create `/app/api/athletes/[id]/vald/sync/route.ts` - Athlete-specific sync
4. Add auth guards to all endpoints

### Phase 4: Profile Auto-Creation ✅
1. Modify athlete creation flow to create VALD profiles
2. Add error handling and retry logic
3. Create manual profile creation endpoint (for existing athletes)

### Phase 5: UI Integration ✅
1. Add "Force Profile" tab to athlete detail page (next to "Programming")
2. Create test result display components
3. Add charts for test trends (use existing Recharts)
4. Create composite score dashboard
5. Add VALD sync button and status indicators

### Phase 6: Testing & Polish ✅
1. Test OAuth flow with VALD API
2. Test full sync workflow
3. Test RLS policies
4. Add error logging and monitoring

---

## PART 9: KEY CONSIDERATIONS

### 1. Athlete ID Mapping
- **Source:** Uses VALD `profileId` as `athleteId` in test tables (string)
- **Target:** Use ASP Boost+ `athletes.id` (UUID) in test tables
- **Mapping:** Store `vald_profile_id` in athletes table for lookups

### 2. User Account Integration
- **Source:** Separate Athlete model with email/password
- **Target:** ASP Boost+ has `profiles` (users) → `athletes` (athlete-specific data)
- **Strategy:** When user signs up with athlete role, create VALD profile

### 3. Data Synchronization
- **Incremental Sync:** Use `modified_from_utc` parameter to fetch only new tests
- **De-duplication:** Use UNIQUE constraint on `(athlete_id, test_id)`
- **Batch Processing:** Process tests in batches to avoid timeouts

### 4. Performance Considerations
- Test tables will have 100-250 columns each
- Use partial indexes for commonly queried fields
- Consider materialized views for common aggregations

### 5. Regional API Support
The VALD API has regional endpoints:
- Australia East: `https://api-australiaeast.valdperformance.com`
- US East: `https://api-useast.valdperformance.com`
- Europe West: `https://api-europewest.valdperformance.com`

Store region preference in organization settings.

---

## PART 10: MIGRATION CHECKLIST

### Database
- [ ] Create VALD fields migration for athletes table
- [ ] Generate SQL schema for all 5 test types
- [ ] Create RLS policies for test tables
- [ ] Add indexes for performance
- [ ] Test migration on local Supabase

### Code Migration
- [ ] Copy forcedecks-api.ts (no changes needed)
- [ ] Copy valdProfileApi.ts (no changes needed)
- [ ] Adapt storeTest.ts for Supabase
- [ ] Create types.ts with interfaces
- [ ] Create helper functions for athlete lookups

### API Endpoints
- [ ] Create vald/sync endpoint
- [ ] Create vald/test/[testId] endpoint
- [ ] Create athletes/[id]/vald/sync endpoint
- [ ] Add authentication to all endpoints
- [ ] Add error handling and logging

### Integration
- [ ] Modify athlete creation to create VALD profiles
- [ ] Create manual sync UI for athletes
- [ ] Add VALD sync status to athlete dashboard
- [ ] Create test result display components

### UI Components
- [ ] Force Profile tab component
- [ ] Test results table/cards
- [ ] Test trend charts (CMJ, SJ, HJ, PPU, IMTP)
- [ ] Sync status indicators
- [ ] Manual sync button

### Testing
- [ ] Test VALD OAuth flow
- [ ] Test athlete profile creation
- [ ] Test test synchronization
- [ ] Test RLS policies with different user roles
- [ ] Test error handling (API failures, network issues)

---

## PART 11: UI INTEGRATION DETAILS

### Force Profile Tab Location

The Force Profile tab will be added to the athlete detail page at:
`/app/dashboard/athletes/[id]/page.tsx`

**Tab Structure:**
```
Athlete Detail Page Tabs:
1. Overview
2. Training
3. Performance
4. Programming
5. **Force Profile** ← NEW TAB
```

### Force Profile Tab Features

1. **Test Summary Cards**
   - Latest CMJ score with trend indicator
   - Latest SJ score with trend indicator
   - Latest HJ score with trend indicator
   - Latest PPU score with trend indicator
   - Latest IMTP score with trend indicator

2. **Composite Score Dashboard**
   - Overall athlete composite score
   - Historical composite score chart
   - Comparison to team/group averages

3. **Detailed Test Views**
   - Expandable sections for each test type
   - Full metric tables with left/right/asymmetry values
   - Time-series charts for key metrics
   - Export functionality

4. **Sync Controls**
   - Last sync timestamp
   - Manual sync button
   - Auto-sync toggle
   - Sync status indicator

---

## SUMMARY

This integration requires:
1. **5 new test tables** (~100-250 columns each)
2. **8 new VALD-specific columns** in athletes table
3. **3-4 new API endpoints**
4. **3 library files** (2 copy, 1 adapt)
5. **Profile creation hook** in athlete signup flow
6. **Force Profile tab** in athlete detail UI

**Critical Differences:**
- Clerk → Supabase Auth (straightforward)
- Prisma → Supabase Client (query pattern changes)
- athleteId as profileId string → athlete_id as UUID with vald_profile_id mapping

**Next Steps:**
1. Generate complete SQL migration
2. Port library files
3. Create API endpoints
4. Build Force Profile UI tab
5. Test end-to-end integration
