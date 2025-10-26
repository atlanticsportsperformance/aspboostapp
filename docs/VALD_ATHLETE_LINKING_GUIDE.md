# VALD Athlete Linking Guide

## Current Flow (As of 2025-10-26)

### How It Works

When you create a new athlete in the web app:

1. **Name Entry** (First + Last Name)
   - System automatically searches VALD by name (800ms debounce)
   - Searches both normal and reversed name order ("Max DiTondo" vs "DiTondo Max")

2. **Three Possible Scenarios:**

#### Scenario A: Existing VALD Profile Found ✅
**What You See:**
- Green panel: "Existing VALD Profile(s) Found"
- Shows count: "Found X VALD profile(s) matching 'First Last'"
- Clickable profile cards showing:
  - Full name
  - Date of birth
  - Email (if available)
  - Profile ID

**What To Do:**
1. Click the correct profile card
2. System auto-fills birth date if available
3. System switches to "link existing" mode
4. Submit form → Links existing VALD profile (no new profile created)

**Benefits:**
- All historical VALD test data preserved
- No duplicate VALD profiles
- Instant access to past ForceDecks tests

#### Scenario B: No VALD Profile Found 🆕
**What You See:**
- Blue panel: "No Existing VALD Profile"
- Message: "No VALD profile found for 'First Last'"
- Info: "A new VALD profile will be automatically created"

**What To Do:**
1. Fill in **Birth Date** (required)
2. Select **Sex** (M/F) (required)
3. Submit form → Creates new VALD profile + web app athlete

**Result:**
- New VALD ForceDecks profile created
- New web app athlete created
- Both linked together via `vald_profile_id`

#### Scenario C: Waiting for Name 🔍
**What You See:**
- Gray panel: "Enter Name to Check VALD"
- Instructions to type first and last name

**What To Do:**
- Just type the athlete's first and last name
- System will auto-search after 800ms

### Duplicate Prevention

#### ✅ **Email Duplicate Check (NEW)**
- System checks if email already exists in `athletes` table
- If found, shows error: "An athlete with email 'X' already exists: Name"
- **Status Code:** 409 Conflict
- **Prevents:** Creating multiple web app athletes with same email

#### ✅ **VALD Profile Link Check**
- System checks if athlete already has `vald_profile_id`
- If found, returns existing profile ID (no duplicate creation)
- **Prevents:** Linking multiple VALD profiles to one athlete

#### ✅ **VALD Queue Check**
- System checks if profile creation already pending/processing
- If found, throws error to prevent duplicate queue entries
- **Prevents:** Creating multiple VALD profiles simultaneously

#### ⚠️ **Name-Based Search Only**
- Email-based search disabled (too many false matches)
- Many VALD profiles have no email address
- Name search is more reliable

### Data Preserved When Athlete Deleted

When you delete an athlete from the web app:
- ✅ **VALD test data remains** in VALD ForceDecks system
- ✅ **Percentile contributions remain** in `athlete_percentile_contributions` table
- ❌ Workout logs, plan assignments, group memberships deleted
- ❌ Max records, notes, documents deleted

This ensures:
- Statistical integrity of percentile rankings
- Historical VALD test data preserved
- Clean removal of app-specific data

## Testing Guide

### Test Case 1: Link Existing VALD Profile
1. Go to Athletes page → Add Athlete
2. Type name of existing VALD athlete (e.g., "Max DiTondo")
3. Wait for green "Existing VALD Profile(s) Found" panel
4. Click the profile card
5. Verify birth date auto-fills
6. Enter email (can be different from VALD)
7. Submit
8. **Expected:** Athlete created with existing VALD profile linked

### Test Case 2: Create New VALD Profile
1. Go to Athletes page → Add Athlete
2. Type a completely new name (e.g., "Test NewAthlete")
3. Wait for blue "No Existing VALD Profile" panel
4. Fill in: Email, Birth Date, Sex
5. Submit
6. **Expected:** New athlete + new VALD profile created

### Test Case 3: Email Duplicate Prevention
1. Try creating athlete with same email as existing athlete
2. **Expected:** Error message with existing athlete's name
3. **Status:** 409 Conflict

### Test Case 4: Multiple Profiles Same Name
1. Type name that has multiple VALD profiles
2. **Expected:** Shows all matching profiles in cards
3. Select the correct one based on DOB/email
4. Submit

## Common Issues & Solutions

### Issue: "Birth date is required to create a VALD profile"
**Cause:** Trying to create new VALD profile without DOB
**Solution:** Fill in the Birth Date field (required by VALD API)

### Issue: "Profile not found" when athlete created
**Cause:** Missing user profile in profiles table
**Solution:** User needs to have coach/admin/super_admin role

### Issue: VALD profile shows but wrong athlete
**Cause:** Multiple people with same name in VALD
**Solution:** Check DOB and email to identify correct profile

### Issue: Can't find athlete in VALD search
**Causes:**
1. Name spelled differently in VALD
2. Name order reversed in VALD
3. Profile doesn't exist yet

**Solutions:**
1. Try reversed name order
2. Check VALD ForceDecks for exact spelling
3. Create new profile if truly doesn't exist

## API Endpoints

### `/api/vald/search-by-name`
**Method:** GET
**Params:** `firstName`, `lastName`
**Returns:** Array of matching VALD profiles

### `/api/athletes/create`
**Method:** POST
**Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "birthDate": "YYYY-MM-DD",
  "sex": "M" | "F",
  "createValdProfile": boolean,
  "linkExistingVald": boolean,
  "existingValdProfileId": "string?"
}
```

### `/api/athletes/[id]/delete`
**Method:** DELETE
**Preserves:** VALD test data, percentile contributions
**Deletes:** All app-specific athlete data

### `/api/athletes/bulk-delete`
**Method:** POST
**Body:** `{ "athleteIds": string[] }`
**Preserves:** VALD test data, percentile contributions
**Deletes:** All app-specific data for selected athletes

## Database Schema

### `athletes` table
```sql
- id (uuid, PK)
- org_id (uuid, FK)
- first_name (text) ← NEW: stores name directly
- last_name (text) ← NEW: stores name directly
- email (text) ← NEW: stores email directly
- date_of_birth (date)
- vald_profile_id (text) ← Links to VALD
- vald_sync_id (text)
- vald_external_id (text)
- primary_position (text)
- grad_year (int)
- is_active (boolean)
```

### `athlete_percentile_contributions` table
- Preserved when athlete deleted
- Contains athlete's test data for percentile calculations
- Maintains statistical integrity

## VALD API Details

### Sex Field Format
- **Web App Input:** "M" or "F" (string)
- **VALD API Expects:** 0 or 1 (integer enum)
- **Conversion:** M → 0, F → 1
- **Location:** `lib/vald/profile-api.ts:140`

### Profile Creation
- **Endpoint:** `/profiles/import`
- **Required Fields:** dateOfBirth, email, givenName, familyName, sex, syncId, externalId
- **Returns:** Profile created (profileId available after 2 second delay)

### Profile Search
- **Endpoint:** `/profiles?TenantId={id}`
- **Search By:** Name only (email unreliable)
- **Returns:** Array of all profiles matching name

## Next Steps

1. Test linking existing VALD profiles
2. Test creating new VALD profiles
3. Test email duplicate prevention
4. Test bulk delete preserves percentiles
5. Verify VALD test data syncing after link

## Questions to Consider

1. Should we allow manual email entry for VALD profiles that don't have email?
2. Should we show a warning if DOB doesn't match between selections?
3. Should we add fuzzy name matching for typos?
4. Should we cache VALD profile searches to reduce API calls?
