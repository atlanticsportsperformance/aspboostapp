# Blast Motion Integration - Phase 2 Complete

## ✅ What Was Implemented

Phase 2 (Athlete Linking & Sync) is now complete and fully functional!

### 1. API Endpoints Created

#### Search Players Endpoint
- **Path:** `GET /api/blast-motion/search-players?name=John`
- **Purpose:** Search Blast Motion players by name or email
- **Returns:** List of matching players with details
- **Features:**
  - Auto-fills date range (last 365 days)
  - Returns up to 100 results
  - Searches by name, email, and other player fields

#### Link Athlete Endpoint
- **Path:** `POST /api/athletes/[id]/blast/link`
- **Purpose:** Link an athlete to their Blast Motion player account
- **Body:**
  ```json
  {
    "blast_player_id": 123456,
    "blast_user_id": "uuid-here",
    "blast_external_id": "optional-id"
  }
  ```
- **Features:**
  - Prevents duplicate links (one player per athlete)
  - Updates athlete record with Blast Motion IDs
  - Clears previous sync errors

#### Unlink Athlete Endpoint
- **Path:** `DELETE /api/athletes/[id]/blast/link`
- **Purpose:** Unlink athlete from Blast Motion
- **Features:**
  - Cascade deletes all synced swing data
  - Clears all Blast Motion fields on athlete

#### Sync Swing Data Endpoint
- **Path:** `POST /api/athletes/[id]/blast/sync`
- **Purpose:** Sync swing data for a linked athlete
- **Body (optional):**
  ```json
  {
    "daysBack": 365
  }
  ```
- **Features:**
  - Auto-pagination through all swings
  - Idempotent (skips existing swings by blast_id)
  - Stores complete swing data in JSONB
  - Updates sync timestamp
  - Handles API pagination quirks

### 2. UI Components Added

#### Athlete Settings Tab Enhancement
Location: [components/dashboard/athletes/athlete-settings-tab.tsx](../components/dashboard/athletes/athlete-settings-tab.tsx)

**Features:**
- Side-by-side integration cards (VALD + Blast Motion)
- Status indicators (Linked/Not Linked)
- Search functionality
- Player selection UI
- Sync button with progress indicator
- Unlink functionality with confirmation
- Permission checks

**User Flow:**
1. Navigate to athlete profile → Settings tab
2. Click "Search Blast Motion" button
3. Select matching player from search results
4. Click "Link Selected Player"
5. Once linked, click "Sync Swing Data"
6. View sync results and timestamp

### 3. Database Schema

Already implemented in Phase 1:

**Athletes Table Extensions:**
- `blast_player_id` - Blast Motion player ID
- `blast_user_id` - Blast Motion user UUID
- `blast_external_id` - External ID (optional)
- `blast_synced_at` - Last sync timestamp
- `blast_sync_error` - Error message if sync failed

**Blast Swings Table:**
- Stores individual swing records
- JSONB metrics column for flexibility
- Foreign key to athletes (cascade delete)
- Indexes on athlete_id, recorded_date, blast_id

### 4. API Client Improvements

#### Fixed Issues:
1. **Search function** - Added default date range (was passing undefined)
2. **Pagination handling** - Fixed API quirk where page 2+ returns data as object instead of array
3. **Optional parameters** - Made search params optional with sensible defaults

#### API Methods Available:
- `searchPlayer(query, params?)` - Search by name/email
- `getTeamInsights(params)` - Get all players with averages
- `getPlayerMetrics(playerId, params)` - Get swings for one player
- `getAllPlayerSwings(playerId, params)` - Auto-paginate all swings
- `getAllPlayers(params)` - Auto-paginate all players
- `testConnection()` - Verify credentials

## 🧪 Testing

### Integration Test Results:
✅ Authentication working (JWT)
✅ Player search working
✅ Pagination working (handles 55+ pages)
✅ Data format correct
✅ UI components working

### Manual Testing Steps:
1. Start dev server: `npm run dev`
2. Navigate to any athlete profile
3. Go to Settings tab
4. Test the Blast Motion integration card:
   - Search for players
   - Link a player
   - Sync swing data
   - View sync results

## 📊 What's Synced

For each swing, we store:
- Basic info: blast_id, swing_id, date/time
- Sport info: sport_id (2=Baseball, 12=Softball)
- Equipment: equipment name, nickname
- Handedness: 4=left, 5=right
- Video: has_video flag, video_id (URL fetching not yet implemented)
- Metrics: Complete JSONB object with 30+ metrics including:
  - Bat Speed
  - Attack Angle
  - Plane Score
  - Time to Contact
  - Peak Hand Speed
  - Rotation Acceleration
  - And many more...

## 🎯 What's Next (Phase 3)

Now that athletes can be linked and data synced, the next phase is:

### Phase 3: Display Swing Data
1. Create "Hitting Profile" tab for athlete profiles
2. Display key metrics and averages
3. Show swing history/library
4. Create charts and visualizations
5. Calculate personal records
6. Compare to team/league averages

### Future Enhancements:
- Video playback integration
- Goal setting for hitting metrics
- Progress tracking over time
- Team leaderboards
- Export swing data
- Scheduled auto-sync

## 🔧 Configuration

### Environment Variables Required:
```env
BLAST_MOTION_USERNAME=info@atlanticperformancetraining.com
BLAST_MOTION_PASSWORD=Max3Luke9$
```

### Permissions:
- Only coaches, admins, and super_admins can link/sync
- Settings tab checks `can_edit_athlete_profile` permission
- API endpoints verify role before allowing actions

## 📝 Notes

### API Behavior:
- Search parameter works on name, email, and other player fields
- Blast Motion returns "both" values in search but doesn't narrow results
- Pagination: page 1 returns array, pages 2+ return object (handled by our code)
- Date range is required for most endpoints (we default to last 365 days)
- Token expires after 60 minutes (we refresh at 50 minutes)

### Database Constraints:
- One athlete can only be linked to one Blast player
- One Blast player can only be linked to one athlete
- Swings have unique constraint on (athlete_id, blast_id)
- Foreign key cascade delete: unlinking removes all swings

## ✅ Completion Checklist

- [x] Search players API endpoint
- [x] Link athlete API endpoint
- [x] Unlink athlete API endpoint
- [x] Sync swings API endpoint
- [x] UI components in settings tab
- [x] Permission checks
- [x] Error handling
- [x] API pagination fix
- [x] Integration testing
- [x] Documentation

**Status:** Phase 2 Complete ✅

**Ready for:** Phase 3 (Display Swing Data)
