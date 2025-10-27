# VALD Duplicate Profile Prevention - Complete Fix

**Date:** 2025-10-26
**Issue:** System was creating duplicate VALD profiles when athlete email didn't match existing VALD account email

## Problem Summary

When adding an athlete to the web app:
1. User enters athlete name (e.g., "Scott Blewett")
2. System searches VALD by **name** - finds no match (if name was slightly different)
3. User provides an **email different from VALD** (e.g., `scott@example.com` instead of `scott.blewett@vald.com`)
4. System **creates a NEW VALD profile** with the different email
5. Result: **DUPLICATE PROFILES** - one in VALD with original email, one new profile with wrong email

This is **unacceptable** because:
- Creates duplicate profiles in VALD system
- Test data gets split across multiple profiles
- Impossible to sync historical data from original profile
- Confusing for users and athletes

## Root Cause

**File:** `lib/vald/create-profile.ts` - `createAndLinkVALDProfile()` function (lines 77-133)

The function was **always creating a new VALD profile** without checking if one already exists by email:

```typescript
// OLD CODE (BROKEN)
async function createAndLinkVALDProfile(params) {
  // ... duplicate checks for athlete ID only ...

  // 🔴 PROBLEM: Always creates new profile, no email search!
  const valdProfileApi = new ValdProfileApi();
  await valdProfileApi.createAthlete({
    email: params.email,
    // ...
  });
}
```

## Solution Implemented

### 1. Added Email Search Before Creating Profile

**File Modified:** `lib/vald/create-profile.ts` (lines 77-133)

Now the function **searches VALD by email FIRST**:

```typescript
// NEW CODE (FIXED)
async function createAndLinkVALDProfile(params) {
  // ... existing checks ...

  const valdProfileApi = new ValdProfileApi();

  // ✅ STEP 1: Search for existing profile by email
  console.log(`🔍 Searching for existing VALD profile with email: ${params.email}`);
  const existingProfile = await valdProfileApi.searchByEmail(params.email);

  if (existingProfile) {
    // ✅ FOUND: Link existing profile (no duplicate!)
    console.log(`✅ Found existing VALD profile for ${params.email}: ${existingProfile.profileId}`);

    await supabase
      .from('athletes')
      .update({
        vald_profile_id: existingProfile.profileId,
        vald_sync_id: existingProfile.syncId,
        vald_external_id: existingProfile.externalId,
        vald_synced_at: new Date().toISOString(),
      })
      .eq('id', params.athleteId);

    return existingProfile.profileId;
  }

  // ✅ NOT FOUND: Create new profile
  console.log(`❌ No existing VALD profile found for ${params.email}. Creating new profile...`);
  await valdProfileApi.createAthlete({ ... });
}
```

**Flow Now:**
1. Search VALD for profile by email
2. **IF FOUND** → Link existing profile ✅
3. **IF NOT FOUND** → Create new profile ✅

### 2. Fixed Athlete Delete Route

**File Modified:** `app/api/athletes/[id]/delete/route.ts` (line 6, 43)

Fixed Next.js 15 async params error:

```typescript
// OLD (ERROR)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const athleteId = params.id; // ❌ Error: params should be awaited
}

// NEW (FIXED)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: athleteId } = await params; // ✅ Awaited
}
```

### 3. Added Email Matching Warning in UI

**File Modified:** `components/dashboard/athletes/add-athlete-modal.tsx` (lines 589-607)

Added prominent warning when creating new VALD profile:

```tsx
{/* CRITICAL EMAIL WARNING */}
<div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
  <div className="flex gap-3">
    <svg className="w-6 h-6 text-amber-400">...</svg>
    <div>
      <h4 className="text-amber-400 font-semibold">⚠️ Email Must Match VALD</h4>
      <p className="text-amber-200 text-xs mt-2">
        <span className="font-semibold">IMPORTANT:</span> If this athlete already has a VALD profile,
        you <span className="font-semibold underline">MUST use the exact same email</span> as their VALD account.
        Using a different email will create a duplicate profile.
      </p>
      <p className="text-amber-300 text-xs mt-2 italic">
        Email entered: <span className="font-mono">{email || '(not set)'}</span>
      </p>
    </div>
  </div>
</div>
```

**User Experience:**
- Warning appears when no VALD profile found by name
- Shows email user entered
- Emphasizes **MUST use exact same email**
- Prevents accidental duplicate creation

## How It Works Now

### Scenario 1: Athlete Has VALD Profile (Email Matches)
1. User enters: "Scott Blewett" + `scott.blewett@vald.com`
2. System searches VALD by name → May or may not find
3. User clicks "Create VALD Profile"
4. **Backend searches by email** → Finds existing profile! ✅
5. **Links existing profile** (no duplicate created) ✅
6. Can now sync all historical test data ✅

### Scenario 2: Athlete Has VALD Profile (Email Different) ⚠️
1. User enters: "Scott Blewett" + `scott@wrongemail.com`
2. System searches VALD by name → May or may not find
3. **UI shows warning:** "Email must match VALD"
4. User realizes mistake, changes email to `scott.blewett@vald.com`
5. Backend searches by email → Finds existing profile! ✅
6. Links existing profile correctly ✅

### Scenario 3: New Athlete (No VALD Profile)
1. User enters: "John Doe" + `john.doe@email.com`
2. System searches VALD by name → Not found
3. Backend searches by email → Not found
4. **Creates new VALD profile** with correct email ✅
5. Future syncs will work perfectly ✅

## Testing Steps

### Test 1: Prevent Duplicate Creation
1. Get an athlete's VALD email (e.g., from VALD portal)
2. In web app, click "Add Athlete"
3. Enter athlete's name + **exact VALD email**
4. Click submit with "Create VALD Profile" enabled
5. **Expected:** Links existing profile, no duplicate
6. **Check logs:** Should see "✅ Found existing VALD profile"

### Test 2: Warning Message
1. Click "Add Athlete"
2. Enter a name that doesn't exist in VALD
3. Enter any email
4. **Expected:** See amber warning box: "⚠️ Email Must Match VALD"
5. Warning should show the email you entered

### Test 3: New Profile Creation
1. Click "Add Athlete"
2. Enter a completely new athlete (not in VALD)
3. Enter a unique email
4. Click submit
5. **Expected:** Creates new VALD profile successfully
6. **Check logs:** Should see "❌ No existing VALD profile found... Creating new profile"

## Files Changed

1. **lib/vald/create-profile.ts**
   - Lines 77-133: Added email search before profile creation
   - Prevents duplicate VALD profiles

2. **app/api/athletes/[id]/delete/route.ts**
   - Line 6, 43: Fixed async params
   - Resolves Next.js 15 warning

3. **components/dashboard/athletes/add-athlete-modal.tsx**
   - Lines 589-607: Added email matching warning
   - Educates users about email requirement

## Key Takeaways

✅ **Email is the source of truth** - Not name matching
✅ **Search before create** - Always check for existing profile
✅ **Clear user warnings** - Prevent user error with prominent UI warnings
✅ **No more duplicates** - System will link existing profiles instead of creating new ones

## What This Prevents

❌ **Duplicate VALD profiles** for same athlete
❌ **Split test data** across multiple profiles
❌ **Lost historical data** from original profile
❌ **Sync confusion** when athlete has multiple profiles
❌ **VALD system pollution** with unnecessary duplicate records

## Notes

- VALD API's `searchByEmail()` is used (line 197 in `profile-api.ts`)
- Email search is case-insensitive and URL-encoded
- If email matches, we link ALL VALD data (profileId, syncId, externalId)
- Name search is still used for UI convenience (helps find existing athletes)
- Email warning only shows when creating NEW profiles
