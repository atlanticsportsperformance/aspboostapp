# BLAST MOTION INTEGRATION - COMPLETE PLAN
## Following VALD ForceDecks Pattern

**Status:** Planning Phase - No Changes Made Yet
**Goal:** Mirror VALD integration for Blast Motion swing data

---

## OVERVIEW

This plan replicates your successful VALD ForceDecks integration pattern for Blast Motion. We'll enable:
1. Linking athletes to Blast Motion players (by name/email)
2. Syncing swing data from Blast Motion API
3. Displaying swing metrics in athlete profiles
4. Tracking personal records and trends

---

## PHASE 1: DATABASE & API FOUNDATION ✅ COMPLETE

### What's Already Done:

#### **Database Schema** ✅
- `blast_swings` table created with proper indexes
- `blast_averages_history` table for periodic snapshots
- `blast_sync_jobs` table for tracking sync operations
- Athletes table extended with:
  - `blast_user_id` (Blast UUID)
  - `blast_player_id` (Blast integer ID)
  - `blast_external_id` (org's external ID)
  - `blast_synced_at` (last sync timestamp)
  - `blast_sync_error` (error tracking)

#### **API Client** ✅
- JWT authentication working
- File: `lib/blast-motion/api.ts`
- Methods: `getTeamInsights()`, `getPlayerMetrics()`, `getAllPlayers()`, etc.
- Credentials configured in `.env.local`

#### **Test Dashboard** ✅
- Route: `/dashboard/hitting`
- Displays live data from Blast Motion
- Shows 17 players with swing counts

---

## PHASE 2: ATHLETE LINKING SYSTEM

### Goal: Link Your Athletes to Blast Motion Players

**Pattern to Follow:** VALD profile linking (see `/components/dashboard/athletes/add-athlete-modal.tsx`)

### 2.1 Search & Match API Endpoints

#### **A. Search Blast Players by Name**
**File to Create:** `app/api/blast-motion/search-by-name/route.ts`

**Endpoint:** `GET /api/blast-motion/search-by-name?firstName={text}&lastName={text}`

**Logic:**
```typescript
1. Authenticate user (coach/admin/super_admin only)
2. Get Blast Motion API credentials from env
3. Fetch ALL players from Blast Motion (last 365 days)
   - Use api.getTeamInsights() with large date range
4. Filter results by name matching:
   - Exact match: "Max DiTondo" → Max DiTondo
   - Reversed: "DiTondo Max" → Max DiTondo
   - Partial: "max" → Max DiTondo
   - Case-insensitive
5. Return matching players with:
   - blast_user_id
   - id (blast_player_id)
   - name, first_name, last_name
   - email
   - total_actions (swing count)
   - external_id
```

**Response Format:**
```json
{
  "found": true,
  "count": 3,
  "players": [
    {
      "id": 458143,
      "blast_user_id": "88104a5a-8210-4997-84c1-0ffad37abf25",
      "name": "Max DiTondo",
      "first_name": "Max",
      "last_name": "DiTondo",
      "email": "info@atlanticperformancetraining.com",
      "total_actions": 174,
      "external_id": "70727933"
    }
  ]
}
```

---

#### **B. Search Blast Players by Email**
**File to Create:** `app/api/blast-motion/search-by-email/route.ts`

**Endpoint:** `GET /api/blast-motion/search-by-email?email={email}`

**Logic:**
```typescript
1. Authenticate user
2. Fetch ALL players from Blast Motion
3. Find exact email match (case-insensitive)
4. Return single player or null
```

**Response:**
```json
{
  "found": true,
  "player": { /* same as above */ }
}
```

---

#### **C. Link Blast Player to Athlete**
**File to Create:** `app/api/athletes/link-blast/route.ts`

**Endpoint:** `POST /api/athletes/link-blast`

**Request Body:**
```json
{
  "athleteId": "uuid",
  "blastPlayerId": 458143,
  "blastUserId": "88104a5a-8210-4997-84c1-0ffad37abf25",
  "blastExternalId": "70727933"
}
```

**Logic:**
```typescript
1. Authenticate user (coach/admin/super_admin)
2. Verify athlete exists and belongs to user's org
3. Check if athlete already linked to Blast:
   - If yes → Warning message, ask to confirm overwrite
4. Update athlete record:
   UPDATE athletes SET
     blast_player_id = {blastPlayerId},
     blast_user_id = {blastUserId},
     blast_external_id = {blastExternalId},
     updated_at = NOW()
   WHERE id = {athleteId}
5. Return success message
```

**Response:**
```json
{
  "success": true,
  "message": "Athlete linked to Blast Motion player",
  "athlete_id": "uuid",
  "blast_player_id": 458143
}
```

---

### 2.2 UI Components for Linking

#### **A. Add Athlete Modal Enhancement**
**File to Update:** `components/dashboard/athletes/add-athlete-modal.tsx`

**Changes:**
1. Add "Blast Motion" section below VALD section
2. Auto-search Blast Motion when name entered (debounced 800ms)
3. Display matching Blast players as selectable cards
4. Three scenarios (mirror VALD):
   - **Found players**: Show cards, user selects one
   - **No players found**: Show "Not found in Blast Motion" message
   - **Waiting**: Show instruction text

**UI Mock:**
```
┌─────────────────────────────────────┐
│ Blast Motion Integration            │
├─────────────────────────────────────┤
│ 🟢 Found 1 matching player          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Max DiTondo                     │ │
│ │ Email: info@...com              │ │
│ │ Swings: 174                     │ │
│ │ ID: 458143                      │ │
│ │         [Select This Player]    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Form State:**
```typescript
blastSearchResults: BlastPlayer[]
selectedBlastPlayer: BlastPlayer | null
linkBlastMotion: boolean
```

**On Submit:**
- If `selectedBlastPlayer` exists → Pass to API
- If `linkBlastMotion=false` → Skip Blast linking

---

#### **B. Athlete Settings Tab Enhancement**
**File to Update:** `components/dashboard/athletes/athlete-settings-tab.tsx`

**Add New Section:**
```
┌─────────────────────────────────────┐
│ External Integrations               │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ VALD Force Plates               │ │
│ │ Status: ✓ Linked                │ │
│ │ Profile ID: abc123              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Blast Motion                    │ │
│ │ Status: ⚠️ Not Linked            │ │
│ │ [Search & Link]                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**When Clicked:**
1. Open modal/drawer
2. Search Blast Motion by athlete's name
3. Show matching players
4. User clicks "Link" on chosen player
5. Call `/api/athletes/link-blast`
6. Refresh page to show linked status

**If Already Linked:**
```
│ Status: ✓ Linked                   │
│ Player: Max DiTondo (#458143)      │
│ Swings: 174                        │
│ [Unlink] [Change Link]             │
```

---

### 2.3 Auto-Linking Logic (Optional Enhancement)

**During Athlete Creation:**
```typescript
// After athlete created, try auto-link
if (athlete.email) {
  const blastMatch = await searchBlastByEmail(athlete.email);
  if (blastMatch && blastMatch.found) {
    await linkBlastPlayer(athlete.id, blastMatch.player);
    // Show success message
  }
}
```

---

## PHASE 3: SYNC SWING DATA

### Goal: Fetch swings from Blast Motion and store in database

**Pattern to Follow:** `/app/api/athletes/[id]/vald/sync/route.ts`

### 3.1 Sync API Endpoint

**File to Create:** `app/api/athletes/[id]/blast/sync/route.ts`

**Endpoint:** `POST /api/athletes/{athleteId}/blast/sync?daysBack=90`

**Complete Flow:**

```typescript
async function POST(request, { params }) {
  // 1. AUTHENTICATION & PERMISSIONS
  const supabase = await createClient();
  const { user } = await supabase.auth.getUser();
  if (!user) return 401;

  const { profile } = await supabase
    .from('profiles')
    .select('app_role, org_id')
    .eq('id', user.id)
    .single();

  if (!['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
    return 403;
  }

  // 2. GET ATHLETE WITH BLAST INFO
  const { athlete } = await supabase
    .from('athletes')
    .select('id, blast_player_id, blast_user_id, org_id, first_name, last_name')
    .eq('id', params.id)
    .single();

  if (!athlete) return 404;

  // Verify athlete in user's org
  if (profile.app_role !== 'super_admin' && athlete.org_id !== profile.org_id) {
    return 403;
  }

  // Check if Blast linked
  if (!athlete.blast_player_id) {
    return 400: "Athlete not linked to Blast Motion";
  }

  // 3. GET DATE RANGE
  const daysBack = parseInt(request.nextUrl.searchParams.get('daysBack') || '90');
  const dateEnd = new Date().toISOString().split('T')[0];
  const dateStart = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // 4. FETCH SWINGS FROM BLAST MOTION API
  const api = createBlastMotionAPI(
    process.env.BLAST_MOTION_USERNAME,
    process.env.BLAST_MOTION_PASSWORD
  );

  const swingsResponse = await api.getPlayerMetrics(athlete.blast_player_id, {
    dateStart,
    dateEnd,
    page: 1,
    perPage: 100, // Adjust based on needs
  });

  // Handle pagination if total > 100
  let allSwings = swingsResponse.data.data;
  if (swingsResponse.data.last_page > 1) {
    allSwings = await api.getAllPlayerSwings(athlete.blast_player_id, {
      dateStart,
      dateEnd,
    });
  }

  // 5. STORE SWINGS IN DATABASE
  const supabaseService = await createServiceRoleClient(); // Bypass RLS
  let swingsSynced = 0;
  const errors = [];

  for (const swing of allSwings) {
    try {
      // Check if swing already exists
      const { data: existing } = await supabaseService
        .from('blast_swings')
        .select('id')
        .eq('blast_id', swing.blast_id)
        .single();

      if (existing) {
        console.log(`Swing ${swing.blast_id} already exists, skipping`);
        continue; // Skip duplicates
      }

      // Prepare swing data
      const swingData = {
        athlete_id: athlete.id,
        blast_id: swing.blast_id,
        swing_id: swing.id,
        academy_id: swing.academy_id,
        recorded_date: swing.created_at.date,
        recorded_time: swing.created_at.time,
        created_at_utc: new Date(`${swing.created_at.date}T${swing.created_at.time}Z`).toISOString(),
        sport_id: swing.sport_id,
        handedness: swing.handedness,
        equipment_id: swing.equipment?.id || null,
        equipment_name: swing.equipment?.name || null,
        equipment_nickname: swing.equipment?.nick_name || null,
        has_video: swing.has_video,
        video_id: swing.video_id,
        video_url: null, // TODO: Get video URL if available
        metrics: swing.metrics, // Store entire metrics object as JSONB
        synced_at: new Date().toISOString(),
      };

      // Insert swing
      const { error } = await supabaseService
        .from('blast_swings')
        .insert(swingData);

      if (error) {
        errors.push(`Error storing swing ${swing.blast_id}: ${error.message}`);
        continue;
      }

      swingsSynced++;
    } catch (err) {
      errors.push(`Exception storing swing ${swing.blast_id}: ${err.message}`);
    }
  }

  // 6. UPDATE ATHLETE SYNC TIMESTAMP
  await supabaseService
    .from('athletes')
    .update({
      blast_synced_at: new Date().toISOString(),
      blast_sync_error: errors.length > 0 ? errors.join('; ') : null,
    })
    .eq('id', athlete.id);

  // 7. RETURN RESULTS
  return NextResponse.json({
    success: true,
    message: `Synced ${swingsSynced} of ${allSwings.length} swing(s)`,
    swings_synced: swingsSynced,
    total_swings_found: allSwings.length,
    date_range: { start: dateStart, end: dateEnd, days: daysBack },
    sync_timestamp: new Date().toISOString(),
    errors: errors.length > 0 ? errors : undefined,
  });
}
```

---

### 3.2 Sync UI Component

**File to Create:** `components/dashboard/athletes/blast-sync-section.tsx`

**Location:** Inside athlete's new "Hitting Profile" tab (or Settings tab)

**UI Mock:**
```
┌─────────────────────────────────────┐
│ Blast Motion Sync                   │
├─────────────────────────────────────┤
│ Status: ✓ Linked to Max DiTondo    │
│ Player ID: 458143                   │
│ Last Sync: 2025-10-29 3:45 PM      │
│ Total Swings: 174                   │
│                                     │
│ Sync Date Range:                    │
│ ○ Last 30 days                      │
│ ● Last 90 days   [selected]         │
│ ○ Last 180 days                     │
│ ○ All time (365 days)               │
│                                     │
│ [Sync Swings Now]                   │
│                                     │
│ Sync History:                       │
│ • Oct 29, 2025 - 45 swings synced  │
│ • Oct 15, 2025 - 32 swings synced  │
│ • Oct 1, 2025 - 28 swings synced   │
└─────────────────────────────────────┘
```

**Component Logic:**
```typescript
const [syncing, setSyncing] = useState(false);
const [daysBack, setDaysBack] = useState(90);

async function handleSync() {
  setSyncing(true);
  try {
    const response = await fetch(
      `/api/athletes/${athleteId}/blast/sync?daysBack=${daysBack}`,
      { method: 'POST' }
    );
    const data = await response.json();

    if (data.success) {
      toast.success(`Synced ${data.swings_synced} swings!`);
      onSyncComplete(); // Refresh parent component
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error('Sync failed');
  } finally {
    setSyncing(false);
  }
}
```

---

## PHASE 4: DISPLAY SWING DATA

### Goal: Show swing data in athlete profile

**Pattern to Follow:** Force Profile tab structure

### 4.1 New "Hitting Profile" Tab

**File to Update:** `app/dashboard/athletes/[id]/page.tsx`

**Add New Tab:**
```typescript
const tabs = [
  'Overview',
  'Calendar',
  'Performance',
  'Force Profile',
  'Hitting Profile',  // ← NEW TAB
  'Settings'
];
```

**Conditional Display:**
```typescript
// Only show tab if athlete has Blast Motion linked
const showHittingTab = athlete.blast_player_id !== null;
```

---

### 4.2 Hitting Profile Tab Component

**File to Create:** `components/dashboard/athletes/athlete-hitting-profile-tab.tsx`

**Structure:**
```
┌─────────────────────────────────────┐
│ View: [Overview ▼]                  │
├─────────────────────────────────────┤
│                                     │
│ Overview View (default):            │
│ • Key Metrics Cards                 │
│ • Sync Controls                     │
│ • Recent Swings (last 10)           │
│                                     │
│ Swing Library View:                 │
│ • Full swing history table          │
│ • Filterable, sortable              │
│ • Click swing → detail modal        │
│                                     │
│ Metrics Dashboard View:             │
│ • Charts (Bat Speed over time)      │
│ • Trends (Attack Angle trend)       │
│ • Comparisons                       │
│                                     │
│ Equipment View:                     │
│ • Equipment usage breakdown         │
│ • Performance by equipment          │
│                                     │
│ Sync History View:                  │
│ • Sync controls                     │
│ • Past sync operations              │
│ • Error logs                        │
└─────────────────────────────────────┘
```

---

### 4.3 Overview View Components

#### **A. Key Metrics Cards**
```
┌──────────────┬──────────────┬──────────────┐
│ Bat Speed    │ Attack Angle │ Plane Score  │
│ 71.5 mph     │ 12.3°        │ 65          │
│ Avg (174)    │ Avg (174)    │ Avg (174)   │
└──────────────┴──────────────┴──────────────┘
```

**Data Source:**
```sql
-- Fetch swing averages from blast_swings
SELECT
  COUNT(*) as total_swings,
  AVG((metrics->>'bat_speed')::text::float) as avg_bat_speed,
  AVG((metrics->>'bat_path_angle')::text::float) as avg_attack_angle,
  AVG((metrics->>'plane_score')::text::float) as avg_plane_score
FROM blast_swings
WHERE athlete_id = {athleteId}
```

---

#### **B. Recent Swings List**
```
┌─────────────────────────────────────┐
│ Recent Swings (Last 10)             │
├─────────────────────────────────────┤
│ Oct 29, 2025  3:45 PM               │
│ Bat Speed: 72.3 mph | AA: 11.5°    │
│ Equipment: -3                       │
│ [View Details]                      │
│                                     │
│ Oct 28, 2025  2:30 PM               │
│ Bat Speed: 70.8 mph | AA: 13.2°    │
│ Equipment: Adidas 33/30             │
│ 🎥 Has Video                        │
│ [View Details]                      │
└─────────────────────────────────────┘
```

**Query:**
```sql
SELECT * FROM blast_swings
WHERE athlete_id = {athleteId}
ORDER BY recorded_date DESC, recorded_time DESC
LIMIT 10
```

---

### 4.4 Swing Library View

**Full Table with Filters:**
```
┌─────────────────────────────────────────────────────────┐
│ Filters: [Date Range ▼] [Equipment ▼] [Videos Only ☐]  │
├─────────────────────────────────────────────────────────┤
│ Date       │ Bat Speed │ Attack  │ Plane │ Equipment    │
│            │           │ Angle   │ Score │              │
├────────────┼───────────┼─────────┼───────┼──────────────┤
│ 10/29 3:45 │ 72.3 mph  │ 11.5°   │ 68    │ -3          │
│ 10/28 2:30 │ 70.8 mph  │ 13.2°   │ 65    │ Adidas 33/30│
│ 10/27 4:15 │ 71.9 mph  │ 10.8°   │ 70    │ -3          │
│ ...                                                      │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Pagination (25 per page)
- Sortable columns
- Click row → Modal with full metrics
- Export to CSV button
- Filter by date, equipment, video availability

**Query:**
```sql
SELECT * FROM blast_swings
WHERE athlete_id = {athleteId}
  AND recorded_date BETWEEN {startDate} AND {endDate}
  AND ({equipmentId} IS NULL OR equipment_id = {equipmentId})
  AND ({videosOnly} = false OR has_video = true)
ORDER BY recorded_date DESC, recorded_time DESC
LIMIT 25 OFFSET {page * 25}
```

---

### 4.5 Metrics Dashboard View

**Charts:**
1. **Bat Speed Over Time** (Line chart)
2. **Attack Angle Distribution** (Histogram)
3. **Swing Count by Week** (Bar chart)
4. **Plane/Connection/Rotation Scores** (Radar chart)

**API to Create:** `app/api/athletes/[id]/blast/metrics-summary/route.ts`

**Returns:**
```json
{
  "time_series": {
    "bat_speed": [
      { "date": "2025-10-01", "value": 71.2, "count": 5 },
      { "date": "2025-10-02", "value": 72.1, "count": 8 }
    ],
    "attack_angle": [...]
  },
  "distributions": {
    "attack_angle": {
      "bins": [-10, -5, 0, 5, 10, 15, 20],
      "counts": [2, 5, 12, 28, 15, 8, 4]
    }
  },
  "weekly_counts": [
    { "week": "Oct 1-7", "count": 24 },
    { "week": "Oct 8-14", "count": 32 }
  ]
}
```

---

## PHASE 5: ADVANCED FEATURES

### 5.1 Personal Records Tracking

**Integrate with:** `components/dashboard/athletes/performance/max-tracker-panel.tsx`

**Add Blast Motion PRs:**
- Best Bat Speed
- Best Exit Velocity (if available)
- Most Swings in One Day
- Longest Streak (days with swings)

**Storage:**
- Use existing `athlete_maxes` table
- Create custom measurement types for Blast metrics

---

### 5.2 Video Integration

**When `has_video: true`:**
1. Fetch video URL from Blast API (if available)
2. Store in `video_url` column
3. Display video player in swing detail modal
4. Side-by-side comparison feature

**API to Explore:**
- Check Blast API docs for video endpoint
- May require additional permissions

---

### 5.3 Goal Setting

**New Feature:**
- Allow coaches to set target ranges
- Example: "Bat Speed: 70-75 mph"
- Visual indicators on metrics
- Progress tracking

---

### 5.4 Team Comparisons

**New Dashboard Page:** `/dashboard/hitting/team-comparison`

**Features:**
- Leaderboards (Bat Speed, Swing Count)
- Team averages
- Position-specific comparisons
- Export team reports

---

## IMPLEMENTATION CHECKLIST

### Phase 2: Athlete Linking
- [ ] Create `/api/blast-motion/search-by-name/route.ts`
- [ ] Create `/api/blast-motion/search-by-email/route.ts`
- [ ] Create `/api/athletes/link-blast/route.ts`
- [ ] Update `add-athlete-modal.tsx` with Blast search
- [ ] Update `athlete-settings-tab.tsx` with Blast linking
- [ ] Test linking flow end-to-end

### Phase 3: Sync Swings
- [ ] Create `/api/athletes/[id]/blast/sync/route.ts`
- [ ] Create `blast-sync-section.tsx` component
- [ ] Test sync with 1 athlete
- [ ] Test sync with multiple athletes
- [ ] Verify data in `blast_swings` table
- [ ] Test duplicate prevention

### Phase 4: Display Data
- [ ] Add "Hitting Profile" tab to athlete page
- [ ] Create `athlete-hitting-profile-tab.tsx`
- [ ] Create Overview view with key metrics
- [ ] Create Swing Library table
- [ ] Create Metrics Dashboard with charts
- [ ] Create Equipment breakdown view
- [ ] Create Sync History view
- [ ] Test on athlete with real data

### Phase 5: Advanced Features
- [ ] Integrate with Max Tracker
- [ ] Add video support (if available)
- [ ] Create goal setting UI
- [ ] Create team comparison page
- [ ] Export/reporting features

---

## API ENDPOINTS SUMMARY

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/blast-motion/search-by-name` | GET | Find Blast players by name |
| `/api/blast-motion/search-by-email` | GET | Find Blast player by email |
| `/api/athletes/link-blast` | POST | Link athlete to Blast player |
| `/api/athletes/[id]/blast/sync` | POST | Sync swings from Blast API |
| `/api/athletes/[id]/blast/swings` | GET | Get athlete's swings from DB |
| `/api/athletes/[id]/blast/metrics-summary` | GET | Get aggregated metrics |
| `/api/blast-motion/team-insights` | GET | Get all players (already exists) |

---

## TIMELINE ESTIMATE

| Phase | Time | Details |
|-------|------|---------|
| Phase 2 | 2-3 days | API endpoints + UI for linking |
| Phase 3 | 2-3 days | Sync endpoint + testing |
| Phase 4 | 4-5 days | Display components + charts |
| Phase 5 | 3-4 days | Advanced features |
| **Total** | **2-3 weeks** | Full implementation |

---

## QUESTIONS TO ANSWER

Before we start implementing:

1. **Athlete Linking Strategy:**
   - Auto-link by email during athlete creation? (Y/N)
   - Allow linking to multiple Blast players? (probably NO)
   - What if email doesn't match but name does?

2. **Sync Strategy:**
   - Manual sync only? Or scheduled auto-sync?
   - Default lookback days: 90? 180? 365?
   - Sync all athletes at once (batch) or individually?

3. **UI Placement:**
   - New "Hitting Profile" tab? Or add to existing tab?
   - Dashboard page for all athletes' hitting data? (like `/dashboard/hitting`)
   - Mobile-friendly priority?

4. **Data Display:**
   - Which metrics are most important? (Bat Speed, Attack Angle, ?)
   - Show raw values or percentiles?
   - Video integration priority (high/low)?

5. **Access Control:**
   - Can athletes view their own hitting data?
   - Can athletes sync their own swings?
   - Parent access?

---

## NOTES

- **Blast API has NO percentile data** (unlike VALD) - we'd need to calculate our own
- **Video URLs may expire** - need to test video persistence
- **Academy ID is optional** - we're currently not using it
- **Sport ID (2=Baseball, 12=Softball)** - may want to filter/tag by sport
- **Metrics are in JSONB** - very flexible but requires careful typing

---

**Ready to proceed? Let me know which phase to start with, or if you have questions about the plan!** 🚀
