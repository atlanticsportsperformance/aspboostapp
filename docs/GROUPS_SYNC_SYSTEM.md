# Groups Sync System - Complete Implementation Guide

## 🎉 Overview

A complete group-to-athlete workout sync system that allows coaches to schedule workouts on group calendars and automatically sync them to all group members, with intelligent detachment when athletes make individual edits.

## 📊 Database Architecture

### New Tables

#### `groups`
```sql
- id: UUID (primary key)
- name: TEXT (required)
- description: TEXT
- color: TEXT (hex color, default #3b82f6)
- is_active: BOOLEAN (default true)
- created_by: UUID (references auth.users)
- created_at, updated_at: TIMESTAMPTZ
```

#### `group_members`
```sql
- id: UUID (primary key)
- group_id: UUID → groups(id) ON DELETE CASCADE
- athlete_id: UUID → athletes(id) ON DELETE CASCADE
- role: TEXT ('member' | 'leader' | 'captain')
- joined_at: TIMESTAMPTZ
- UNIQUE(group_id, athlete_id)
```

#### `group_workout_schedules`
```sql
- id: UUID (primary key)
- group_id: UUID → groups(id) ON DELETE CASCADE
- workout_id: UUID → workouts(id) ON DELETE CASCADE
- scheduled_date: DATE (required)
- scheduled_time: TIME
- notes: TEXT
- auto_assign: BOOLEAN (default true)
- created_by: UUID → auth.users(id)
- created_at, updated_at: TIMESTAMPTZ
```

#### `group_tags`
```sql
- id: UUID (primary key)
- group_id: UUID → groups(id) ON DELETE CASCADE
- tag: TEXT (required)
- UNIQUE(group_id, tag)
```

### Schema Updates

**`workouts` table**:
- Added `group_id` field for group-owned workouts

**`workout_instances` table**:
- Added `is_synced_with_group` BOOLEAN (default false)
- Added `detached_at` TIMESTAMPTZ
- Added `detached_by` UUID → auth.users(id)

## 🔄 Sync Flow

### 1. **Group Workout Scheduled**
```
Coach schedules workout on group calendar
  ↓
Database trigger: assign_group_workout_to_members()
  ↓
Creates workout_instance for EACH group member:
  - source_type = 'group'
  - source_id = group_workout_schedules.id
  - is_synced_with_group = true
```

### 2. **New Member Joins Group**
```
Athlete added to group
  ↓
Database trigger: assign_future_workouts_to_new_member()
  ↓
Creates instances for ALL FUTURE group workouts
```

### 3. **Group Workout Edited**
```
Coach edits group workout (date, notes, etc.)
  ↓
Database trigger: sync_group_workout_changes()
  ↓
Updates ALL instances where:
  - source_id matches
  - is_synced_with_group = true
  - status IN ('not_started', 'in_progress')
```

### 4. **Athlete Edits Their Instance**
```
Athlete modifies their workout
  ↓
Application calls: detachWorkoutInstanceFromGroup(instanceId)
  ↓
Updates instance:
  - is_synced_with_group = false
  - detached_at = NOW()
  - detached_by = user_id
  ↓
Future group edits NO LONGER affect this instance
```

### 5. **Group Workout Deleted**
```
Coach deletes group workout
  ↓
Database trigger: handle_group_workout_deletion()
  ↓
For each instance:
  - IF status = 'not_started' AND is_synced = true → DELETE
  - IF status IN ('in_progress', 'completed') → DETACH (mark as detached)
```

## 🎨 UI Components

### Group Calendar Page
**Location**: `/app/dashboard/groups/[id]/page.tsx`

**Features**:
- Dark theme matching app design
- Monthly calendar grid with drag-and-drop
- Color-coded workouts by category
- Sync status indicators (synced/detached counts)
- Mobile responsive
- Two tabs: Calendar & Members

**Action Buttons**:
- **Create**: Link to workout builder (use existing workouts library)
- **Workout**: Add template workout from library
- **Routine**: Convert standalone routine to group workout
- **Plan**: Assign entire training plan to group

### Modals

#### 1. Add Workout to Group
**File**: `/components/dashboard/groups/add-workout-to-group-modal.tsx`

**Flow**:
1. Browse workout library (templates)
2. Search/filter by name, category, notes
3. Select workout
4. Choose date & time
5. Add notes
6. Toggle auto-assign
7. **Deep copy**: Creates group-owned workout with all routines/exercises
8. **Schedule**: Creates group_workout_schedule
9. **Trigger**: Database auto-creates instances for all members

#### 2. Add Routine to Group
**File**: `/components/dashboard/groups/add-routine-to-group-modal.tsx`

**Flow**:
1. Browse standalone routines
2. Enter workout name
3. Select date & time
4. **Creates**: New group-owned workout containing the routine
5. **Schedule & assign**

#### 3. Assign Plan to Group
**File**: `/components/dashboard/groups/assign-plan-to-group-modal.tsx`

**Flow**:
1. Browse training plans
2. Select start date
3. **Bulk copy**: All plan workouts → group-owned workouts
4. **Auto-schedule**: Based on week/day offsets from start date
5. **Mass assign**: All workouts to all group members

### Group Management on Athlete Overview
**File**: `/components/dashboard/athletes/athlete-overview-tab.tsx`

**Features**:
- Display group memberships with color indicators
- "+ Add" button → Add athlete to group modal
- "Remove" button (appears on hover)
- Real-time updates

**Add to Group Modal**:
- Select from available groups (excludes current memberships)
- Choose role (member/leader/captain)
- Auto-triggers future workout assignment

## 🔧 Utility Functions

### `lib/detach-from-group.ts`

#### `detachWorkoutInstanceFromGroup(instanceId, userId?)`
```typescript
// Call when athlete edits a synced workout
const { success, error } = await detachWorkoutInstanceFromGroup(instanceId);
```

#### `isInstanceSyncedWithGroup(instanceId)`
```typescript
// Check if instance is currently synced
const isSynced = await isInstanceSyncedWithGroup(instanceId);
```

#### `getGroupInfoForInstance(instanceId)`
```typescript
// Get group details for a synced instance
const groupInfo = await getGroupInfoForInstance(instanceId);
// Returns: { groupId, groupName, color } | null
```

## 📝 Migration

### Fresh Start Migration
**Script**: `/scripts/migrate-teams-to-groups-fresh.js`

**What it does**:
1. ✅ Deletes all group workout schedules
2. ✅ Deletes all group members
3. ✅ Deletes all group tags
4. ✅ Deletes all groups
5. ✅ Deletes all team members (old system)
6. ✅ Deletes all teams (old system)
7. ✅ Deletes all group-owned workouts + routines + exercises
8. ✅ Deletes all group-sourced workout instances

**Run it**:
```bash
source .env.local && node scripts/migrate-teams-to-groups-fresh.js
```

### Database Migration
**File**: `/supabase/migrations/20251025120000_create_groups_sync_system.sql`

**Includes**:
- All table creations
- Indexes for performance
- Triggers for auto-assign and sync
- Helper functions
- RLS policies
- Comments

**Note**: Migration was already run on your database.

## 🎯 User Workflows

### Coach: Create Group & Schedule Workout
1. Go to `/dashboard/groups`
2. Click "Create Group"
3. Enter group name, color, description
4. Go to group calendar
5. Add members from Members tab
6. Click "Workout" button on calendar
7. Select template workout
8. Choose date
9. Enable "Auto-assign"
10. ✅ All members instantly get the workout on their calendars

### Coach: Edit Group Workout
1. On group calendar, drag workout to new date
2. OR click workout, edit notes/time
3. ✅ All synced athlete instances update automatically
4. ⚠️ Detached instances remain unchanged

### Athlete: Customize Their Workout
1. On athlete calendar, see group-synced workout (with group badge)
2. Edit workout (change exercises, sets, reps, etc.)
3. System calls `detachWorkoutInstanceFromGroup()`
4. ✅ Instance marked as detached
5. ⚠️ Future group edits won't affect this workout

### Coach: Add Athlete to Existing Group
1. Method A: From group page → Members tab → "+ Add Member"
2. Method B: From athlete overview → Group Assignments → "+ Add"
3. Select group & role
4. ✅ Database trigger auto-assigns ALL future group workouts

## 📊 Visual Indicators

### On Group Calendar
- **Synced count**: Green badge "Synced: 5"
- **Detached count**: Amber badge "Detached: 2"
- **Auto-assign**: Green "Auto-assign" badge vs gray "Manual"

### On Athlete Calendar
- **Group badge**: Colored badge with group name
- **Group color**: Visual indicator on workout card
- **Sync status**: Visible in workout details (if needed)

## ⚙️ Configuration

### Default Values
- **Group color**: `#3b82f6` (blue)
- **Auto-assign**: `true` (enabled by default)
- **Member role**: `member`

### Customization Points
1. **Category colors** (getCategoryColor function in group page)
2. **Sync behavior** (database triggers)
3. **Detachment conditions** (when to auto-detach)

## 🔒 Security

### RLS Policies
- Users can view active groups
- Authenticated users can create groups
- Group creators can update/delete their groups
- All users can view group members
- Authenticated users can add/remove members
- Schedule creators can update/delete their schedules

### Data Ownership
- Workouts: `group_id` tracks ownership
- Instances: `source_type` + `source_id` track origin
- Detachment: `detached_by` tracks who detached

## 🐛 Troubleshooting

### Issue: Instances not auto-creating
**Check**:
1. `auto_assign = true` on group_workout_schedules
2. Database triggers are enabled
3. Check `group_members` table has entries

### Issue: Sync not working
**Check**:
1. `is_synced_with_group = true` on instances
2. `source_type = 'group'` on instances
3. Trigger `sync_group_workout_changes` is enabled

### Issue: Can't delete group workout
**Check**:
1. Database trigger `handle_group_workout_deletion` is enabled
2. Check for foreign key constraints

## 📈 Performance

### Indexes
```sql
- idx_workouts_group_id ON workouts(group_id)
- idx_workout_instances_synced ON workout_instances(source_type, source_id, is_synced_with_group)
- idx_group_members_athlete ON group_members(athlete_id)
- idx_group_members_group ON group_members(group_id)
- idx_group_workout_schedules_date ON group_workout_schedules(scheduled_date)
```

### Query Optimization
- Use `.select()` with specific fields
- Batch operations when possible
- Leverage database triggers for bulk operations

## 🎓 Best Practices

1. **Always deep copy**: Don't reference template workouts directly
2. **Track sources**: Use `source_workout_id` and `source_routine_id`
3. **Explicit detachment**: Call detach function when athlete edits
4. **Show sync status**: Make it clear to users which workouts are synced
5. **Confirm deletions**: Warn about cascading effects

## 🚀 Future Enhancements

Potential additions:
- Bulk detach (detach all workouts for an athlete)
- Re-attach to group (opt back into sync)
- Group workout templates (reusable group schedules)
- Notification system (alert athletes of group changes)
- Audit log (track who made what changes)
- Group analytics (completion rates, sync status)

---

**Status**: ✅ Fully Implemented & Deployed
**Last Updated**: October 2025
**Database**: Clean slate - ready for fresh groups
