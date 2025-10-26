# Add Athlete Modal - Complete Guide

## Overview

The **Add Athlete Modal** is a comprehensive form that allows coaches and admins to create new athlete profiles with automatic VALD ForceDecks integration.

## Features

### 1. Personal Information
- **First Name** (required)
- **Last Name** (required)
- **Email** (required) - Checked for duplicates within organization
- **Phone** (optional)
- **Birth Date** (required if creating VALD profile)
- **Sex** (M/F - required if creating VALD profile)

### 2. Athletic Information
- **Primary Position** (optional) - e.g., QB, WR, RB
- **Secondary Position** (optional)
- **Graduation Year** (optional) - 2020-2040
- **Play Level** (default: High School) - Youth, High School, College, Pro

### 3. VALD Integration Options

#### Option A: Create New VALD Profile (Default)
- ✅ Automatically creates a new profile in VALD's system
- ✅ Links the VALD profile to the athlete in your app
- ✅ Athlete can immediately start testing on ForceDecks
- ⚠️ Requires birth date and sex

**How it works:**
1. Form data is sent to `/api/athletes/create`
2. Athlete record is created in Supabase
3. `createAndLinkVALDProfile()` is called
4. VALD API creates the profile
5. Profile ID is stored in athlete record
6. Athlete shows up in VALD Hub

#### Option B: Link Existing VALD Profile
- ✅ Connects to an athlete who already has tests in VALD
- ✅ Historical test data can be synced immediately
- ⚠️ Requires the VALD Profile ID from VALD Hub

**Use this when:**
- Athlete has already been using ForceDecks at your facility
- You're migrating from another system
- Athlete tested before being added to your app

**How to find VALD Profile ID:**
1. Log into VALD Hub
2. Navigate to the athlete's profile
3. Look for the Profile ID in their settings/details
4. Copy the ID (usually a UUID or alphanumeric string)
5. Paste it into the modal form

#### Option C: No VALD Integration
- ✅ Creates athlete without VALD connection
- ✅ Can add VALD integration later
- ⚠️ Force Profile tab will show "No VALD profile linked"

**You can link VALD later by:**
- Editing the athlete profile
- Using the manual link function
- Creating a new VALD profile from their profile page

## Duplicate Prevention

The modal includes multiple layers of duplicate prevention:

### Application Layer Checks:
1. **Email Duplication** - Checks if email already exists in your organization
2. **VALD Profile Duplication** - Checks if athlete already has a VALD profile
3. **Queue Duplication** - Prevents multiple simultaneous profile creation attempts

### Database Layer Constraints:
1. **Unique VALD Profile ID** - One VALD profile can only link to one athlete
2. **Unique Sync ID** - Each VALD sync ID is unique
3. **Unique External ID** - Each VALD external ID is unique
4. **Partial Unique Index** - Prevents duplicate pending queue items

See [20250125000004_add_vald_duplicate_prevention.sql](../supabase/migrations/20250125000004_add_vald_duplicate_prevention.sql) for details.

## Usage

### Opening the Modal

**Desktop:**
- Click "Add Athlete" button in page header

**Mobile:**
- Tap the floating "+" button (bottom right)

### Creating an Athlete

1. **Fill in required fields:**
   - First Name
   - Last Name
   - Email

2. **Choose VALD option:**
   - ✅ Create new VALD profile (default) - Add birth date & sex
   - OR ✅ Link existing VALD profile - Add Profile ID
   - OR ⬜ Skip VALD integration

3. **Add optional details:**
   - Phone, Position, Grad Year, Play Level

4. **Click "Create Athlete"**

5. **Success!**
   - Modal shows success message
   - Athlete appears in the athletes list
   - VALD profile is created/linked (if selected)
   - You can now navigate to their profile

### Error Handling

The modal displays helpful error messages:
- ❌ Missing required fields
- ❌ Duplicate email in organization
- ❌ VALD API errors
- ⚠️ VALD profile created but ID pending (will resolve on first sync)

## API Endpoint

**POST** `/api/athletes/create`

### Request Body:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "(555) 123-4567",
  "birthDate": "2005-01-15",
  "sex": "M",
  "primaryPosition": "QB",
  "secondaryPosition": "WR",
  "gradYear": 2025,
  "playLevel": "High School",
  "createValdProfile": true,
  "linkExistingVald": false,
  "existingValdProfileId": null
}
```

### Response (Success):
```json
{
  "success": true,
  "athlete": {
    "id": "uuid-here",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "vald_profile_id": "vald-profile-id-here",
    ...
  },
  "vald_profile_created": true,
  "vald_profile_linked": false,
  "vald_error": null
}
```

### Response (Error):
```json
{
  "error": "An athlete with this email already exists in your organization"
}
```

## Permissions

Only users with these roles can create athletes:
- ✅ **Coach**
- ✅ **Admin**
- ✅ **Super Admin**

Athletes cannot create other athletes.

## Files

### Components:
- **Modal:** `components/dashboard/athletes/add-athlete-modal.tsx`
- **Page Integration:** `app/dashboard/athletes/page.tsx`

### API:
- **Endpoint:** `app/api/athletes/create/route.ts`

### Backend Logic:
- **Create Profile:** `lib/vald/create-profile.ts`
- **Profile API:** `lib/vald/profile-api.ts`

### Database:
- **Duplicate Prevention Migration:** `supabase/migrations/20250125000004_add_vald_duplicate_prevention.sql`

## Next Steps

After creating an athlete:

1. **Navigate to their profile** - Click their name in the athletes list
2. **View Force Profile tab** - See VALD integration status
3. **Sync tests** - Click "Sync Tests" to pull data from VALD
4. **Assign a training plan** - Add them to a program
5. **Add to teams/groups** - Organize your athletes

## Troubleshooting

**Modal won't open:**
- Check console for errors
- Verify you have coach/admin role

**VALD profile not creating:**
- Verify VALD credentials in `.env.local`
- Check birth date and sex are provided
- Review API logs for VALD errors

**Email already exists error:**
- Check if athlete already exists in your org
- Use search to find existing athlete
- Consider linking existing athlete instead

**VALD Profile ID not found:**
- Wait 2-3 seconds after creation
- Profile ID resolves asynchronously
- Will be populated on first sync

## Best Practices

1. ✅ Always create VALD profile when adding new athletes
2. ✅ Use "Link existing" for athletes who've already tested
3. ✅ Verify email address is correct (used for VALD account)
4. ✅ Add birth date and sex for accurate VALD data
5. ✅ Include play level for better organization
6. ✅ Check for existing athletes before creating duplicates

## Summary

The Add Athlete Modal provides a seamless way to onboard athletes into your system with automatic VALD ForceDecks integration. It handles duplicate prevention, VALD profile creation, and data validation to ensure clean, organized athlete data.
