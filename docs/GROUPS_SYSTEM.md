# Groups Management System

## Overview
The Groups Management System allows coaches to organize athletes into groups (teams, training cohorts, etc.) and manage group calendars. When workouts are scheduled on a group calendar, they are automatically assigned to all group members.

## Features

### 1. Groups Management (/dashboard/groups)
- **Create Groups**: Name, description, color, and tags
- **View All Groups**: Card-based layout with stats (member count, upcoming workouts)
- **Search & Filter**: Search by name, description, or tags
- **Stats Dashboard**: Total groups, total members, active groups, scheduled workouts

### 2. Group Detail Page (/dashboard/groups/[id])
Two main views:

#### Calendar View
- **Monthly Calendar**: Visual display of scheduled workouts
- **Schedule Workouts**: Click any date to schedule a workout
- **Auto-Assignment**: Toggle to automatically assign workouts to all group members
- **Workout Details**: Date, time, notes, and assignment status
- **Color Coding**: Group color applied to calendar events

#### Members View
- **Add Members**: Select from available athletes
- **Member Roles**: Member, Leader, Captain
- **Remove Members**: Easily manage group membership
- **Member Details**: Name, email, join date, role

### 3. Automatic Workout Assignment
- **Database Triggers**: Automatically create workout_instances when:
  - A workout is scheduled on a group calendar (if auto_assign is true)
  - A new member joins a group (assigns all future group workouts)
- **Source Tracking**: workout_instances track their origin:
  - `source_type`: 'manual', 'plan', 'group', 'routine'
  - `source_id`: Reference to the source (e.g., group_workout_schedule.id)

### 4. Athlete Calendar Integration
- **Group Indicator**: Workouts from groups show a colored badge with group name
- **Visual Distinction**: Group workouts display with group color and icon
- **Full Integration**: Group workouts appear alongside manually assigned workouts

## Database Schema

### Tables Created

#### `groups`
- `id`: UUID (primary key)
- `name`: Text (required)
- `description`: Text
- `color`: Text (default: #3b82f6)
- `is_active`: Boolean
- `created_by`: UUID (references auth.users)
- `created_at`, `updated_at`: Timestamps

#### `group_members`
- `id`: UUID (primary key)
- `group_id`: UUID (references groups)
- `athlete_id`: UUID (references athletes)
- `role`: Text ('member', 'leader', 'captain')
- `joined_at`: Timestamp
- UNIQUE constraint on (group_id, athlete_id)

#### `group_workout_schedules`
- `id`: UUID (primary key)
- `group_id`: UUID (references groups)
- `workout_id`: UUID (references workouts)
- `scheduled_date`: Date (required)
- `scheduled_time`: Time
- `notes`: Text
- `auto_assign`: Boolean (default: true)
- `created_by`: UUID (references auth.users)
- `created_at`, `updated_at`: Timestamps

#### `group_tags`
- `id`: UUID (primary key)
- `group_id`: UUID (references groups)
- `tag`: Text
- UNIQUE constraint on (group_id, tag)

### Triggers

#### `trigger_assign_group_workout`
- **When**: After INSERT on group_workout_schedules
- **Action**: Creates workout_instances for all group members if auto_assign is true

#### `trigger_assign_workouts_to_new_member`
- **When**: After INSERT on group_members
- **Action**: Assigns all future group workouts to the new member

### Enhanced `workout_instances` Table
Added two new columns:
- `source_type`: Text - Origin of workout assignment
- `source_id`: UUID - Reference to source record

## Usage Guide

### Creating a Group
1. Navigate to /dashboard/groups
2. Click "Create Group"
3. Enter group details:
   - Name (required)
   - Description (optional)
   - Color (choose from 8 colors)
   - Tags (comma-separated, optional)
4. Click "Create Group"

### Adding Members
1. Go to group detail page
2. Switch to "Members" tab
3. Click "Add Member"
4. Select athlete from dropdown
5. Choose role (member, leader, captain)
6. Click "Add Member"

### Scheduling Workouts
1. Go to group detail page
2. Stay on "Calendar" tab
3. Click "Schedule Workout" or click any date
4. Select:
   - Workout from library
   - Date (required)
   - Time (optional)
   - Notes (optional)
   - Auto-assign checkbox (enabled by default)
5. Click "Schedule Workout"
6. All group members will automatically receive the workout assignment

### Viewing Group Workouts (Athlete Perspective)
- On athlete calendar, group workouts show a colored badge with:
  - Group icon
  - Group name
  - Group color
- Hover over badge to see full group name
- Workouts are fully integrated - can be logged, edited, etc.

## Migration Instructions

### Running the Migration
The groups system requires running the migration SQL file:

```bash
# Option 1: Via Supabase Dashboard
1. Go to Supabase Dashboard > SQL Editor
2. Copy contents of supabase/migrations/20251025000000_create_groups_system.sql
3. Paste and run

# Option 2: Via Script (if configured)
node scripts/run-groups-migration.js
```

### Migration Contents
- Creates 4 new tables with proper indexes
- Enables Row Level Security (RLS)
- Sets up RLS policies for data access
- Creates database triggers for auto-assignment
- Adds source tracking to workout_instances
- Includes comprehensive documentation comments

## Security (RLS Policies)

### Groups
- **View**: All users
- **Create**: Authenticated users (sets created_by)
- **Update**: Group creators only
- **Delete**: Group creators only

### Group Members
- **View**: All users
- **Create**: Group creators only
- **Update**: Group creators only
- **Delete**: Group creators only

### Group Workout Schedules
- **View**: All users
- **Create**: Group creators only
- **Update**: Group creators only
- **Delete**: Group creators only

### Group Tags
- **View**: All users
- **Manage**: Group creators only

## Future Enhancements

Potential features to add:
- [ ] Group analytics (completion rates, engagement)
- [ ] Group chat/messaging
- [ ] Recurring group workout schedules
- [ ] Group attendance tracking
- [ ] Bulk member import (CSV upload)
- [ ] Group hierarchy (sub-groups)
- [ ] Member invitations (email invites)
- [ ] Group workout templates
- [ ] Group permissions (multiple admins)
- [ ] Integration with team schedules/seasons

## API Integration

### Fetching Group Workouts for an Athlete
```typescript
const { data: groupWorkouts } = await supabase
  .from('workout_instances')
  .select(`
    *,
    workouts(*),
    group_workout_schedules!source_id(
      groups(*)
    )
  `)
  .eq('athlete_id', athleteId)
  .eq('source_type', 'group');
```

### Getting All Groups
```typescript
const { data: groups } = await supabase
  .from('groups')
  .select(`
    *,
    group_members(count),
    group_workout_schedules(count)
  `)
  .eq('is_active', true);
```

### Creating a Group Workout Schedule
```typescript
const { data, error } = await supabase
  .from('group_workout_schedules')
  .insert({
    group_id: 'xxx',
    workout_id: 'yyy',
    scheduled_date: '2025-10-25',
    scheduled_time: '14:00',
    notes: 'Practice game prep',
    auto_assign: true
  });
// Trigger automatically creates workout_instances
```

## File Structure

### Pages
- `app/dashboard/groups/page.tsx` - Groups list page
- `app/dashboard/groups/[id]/page.tsx` - Group detail page (calendar + members)

### Database
- `supabase/migrations/20251025000000_create_groups_system.sql` - Main migration
- `supabase/migrations/20251025000001_workout_instances_group_view.sql` - Helper function (optional)

### Components
- Uses existing modal patterns from athlete/plan management
- Integrated into athlete calendar tab component

### Scripts
- `scripts/run-groups-migration.js` - Migration runner script

## Testing Checklist

- [x] Create group
- [ ] Add members to group
- [ ] Schedule workout on group calendar
- [ ] Verify workout appears on all member calendars
- [ ] Verify group badge shows on athlete calendar
- [ ] Add new member to group with existing workouts
- [ ] Verify new member gets future workouts
- [ ] Remove member from group
- [ ] Edit group details
- [ ] Delete group workout schedule
- [ ] Delete group
- [ ] Test permissions (RLS)
- [ ] Test with multiple groups
- [ ] Test calendar navigation
- [ ] Test search/filter on groups page

## Notes

- Group workouts are assigned as regular workout_instances, so they integrate seamlessly with existing logging/tracking features
- The source_type and source_id fields allow tracing workout origin
- Auto-assignment can be toggled per workout schedule
- Group colors are preserved throughout the UI for visual consistency
- All database operations are protected by RLS policies
- Triggers ensure data consistency when adding members or scheduling workouts
