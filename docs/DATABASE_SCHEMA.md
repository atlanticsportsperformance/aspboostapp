# ASP Boost+ Database Schema

**Last Updated:** 2025-10-22
**Project:** Atlantic Sports Performance - ASP Boost+
**Location:** C:\Users\Owner\Desktop\completeapp
**Supabase Project:** tadqnotafpeasaevofjc.supabase.co

---

## Core User & Organization Tables

### 1. **profiles**
User profiles linked to Supabase Auth

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | References auth.users |
| email | text | User email |
| first_name | text | First name |
| last_name | text | Last name |
| avatar_url | text | Profile picture URL |
| app_role | enum | 'athlete' \| 'coach' \| 'admin' \| 'super_admin' |
| phone | text | Phone number |
| timezone | text | User timezone |
| unit_system | enum | 'imperial' \| 'metric' |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### 2. **organizations**
Training facilities/organizations

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Organization ID |
| name | text | Organization name |
| slug | text | URL-friendly slug |
| timezone | text | Organization timezone |
| logo_url | text | Logo image URL |
| website | text | Website URL |
| phone | text | Contact phone |
| email | text | Contact email |
| address_line1 | text | Address line 1 |
| address_line2 | text | Address line 2 |
| city | text | City |
| state | text | State/Province |
| zip | text | ZIP/Postal code |
| country | text | Country |
| is_active | boolean | Active status |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### 3. **athletes**
Athlete profiles

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Athlete ID |
| user_id | uuid FK → profiles.id | Optional user account |
| org_id | uuid FK → organizations.id | Organization |
| date_of_birth | date | Date of birth |
| height_inches | int | Height in inches |
| weight_lbs | decimal | Weight in pounds |
| dominant_hand | text | 'left' \| 'right' \| 'switch' |
| primary_position | text | Primary position |
| secondary_position | text | Secondary position |
| grad_year | int | Graduation year |
| bio | text | Athlete biography |
| is_active | boolean | Active status |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### 4. **staff**
Staff members (coaches, admins)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Staff ID |
| user_id | uuid FK → profiles.id | User account |
| org_id | uuid FK → organizations.id | Organization |
| role | enum | 'owner' \| 'admin' \| 'coach' \| 'intern' |
| title | text | Job title |
| certifications | text[] | Array of certifications |
| hire_date | date | Hire date |
| is_active | boolean | Active status |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

---

## Team Management Tables

### 5. **teams**
Training teams/groups

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Team ID |
| org_id | uuid FK → organizations.id | Organization |
| name | text | Team name |
| level | enum | 'youth' \| 'high_school' \| 'college' \| 'pro' \| 'adult_rec' |
| sport | enum | 'baseball' \| 'softball' \| 'both' |
| season_year | int | Season year |
| head_coach_id | uuid FK → staff.id | Head coach |
| is_active | boolean | Active status |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### 6. **team_members**
Athletes on teams

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Membership ID |
| team_id | uuid FK → teams.id | Team |
| athlete_id | uuid FK → athletes.id | Athlete |
| jersey_number | int | Jersey number |
| status | text | 'active' \| 'inactive' \| 'injured' \| 'alumni' |
| joined_at | date | Join date |
| left_at | date | Leave date |
| notes | text | Notes |
| created_at | timestamptz | Creation timestamp |

### 7. **staff_team_assignments**
Staff assigned to teams

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Assignment ID |
| staff_id | uuid FK → staff.id | Staff member |
| team_id | uuid FK → teams.id | Team |
| assigned_at | timestamptz | Assignment timestamp |
| assigned_by | uuid FK → profiles.id | Who assigned |

---

## Exercise Library Tables

### 8. **exercises**
Exercise library with flexible metrics

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Exercise ID |
| name | text NOT NULL | Exercise name |
| category | text NOT NULL | 'strength_conditioning' \| 'hitting' \| 'throwing' |
| tags | text[] | Flexible tags array |
| description | text | Exercise description |
| video_url | text | Video URL |
| cues | text[] | Coaching cues |
| equipment | text[] | Required equipment |
| metric_schema | jsonb | Dynamic measurement schema |
| is_active | boolean | Active status |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**metric_schema Structure:**
```json
{
  "measurements": [
    {
      "id": "reps",
      "name": "Reps",
      "type": "integer",
      "unit": "reps",
      "enabled": true
    },
    {
      "id": "weight",
      "name": "Weight",
      "type": "decimal",
      "unit": "lbs",
      "enabled": true
    }
  ]
}
```

---

## Workout Programming Tables

### 9. **workouts**
Workout templates

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Workout ID |
| name | text | Workout name |
| estimated_duration_minutes | int | Est. duration |
| is_template | boolean | Is template |
| notes | text | Workout notes |
| tags | text[] | **NEW** Workout tags |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### 10. **workout_tags**
**NEW** Workout tag library

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Tag ID |
| name | text UNIQUE NOT NULL | Tag name |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Index:** GIN index on workouts.tags for fast tag searches

### 11. **routines**
Workout sections (blocks, supersets, circuits)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Routine ID |
| workout_id | uuid FK → workouts.id | Parent workout (NULL if standalone) |
| name | text | Routine name |
| scheme | text | 'straight' \| 'superset' \| 'circuit' \| 'emom' \| 'amrap' \| 'giant_set' |
| order_index | int | Order in workout |
| rest_between_rounds_seconds | int | Rest between rounds |
| notes | text | Routine notes |
| superset_block_name | text | Block name |
| text_info | text | Additional info |
| is_standalone | boolean | Is template routine |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### 12. **routine_exercises**
Exercises within routines with dynamic metrics

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Routine exercise ID |
| routine_id | uuid FK → routines.id | Parent routine |
| exercise_id | uuid FK → exercises.id | Exercise reference |
| is_placeholder | boolean | Is placeholder |
| placeholder_id | text | Placeholder ID |
| order_index | int | Order in routine |
| sets | int | Number of sets |
| reps | int | Reps per set |
| rest_seconds | int | Rest between sets |
| notes | text | Exercise notes |
| metric_targets | jsonb | Dynamic metric targets |
| intensity_targets | jsonb | Intensity targets |
| set_configurations | jsonb | Per-set configurations |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**metric_targets Structure:**
```json
{
  "weight": 185,
  "reps": 8,
  "time": "0:45",
  "custom_metric_id": "value"
}
```

**intensity_targets Structure:**
```json
[
  {
    "metric": "weight",
    "percentage": 85,
    "of_metric": "1rm"
  }
]
```

**set_configurations Structure:**
```json
[
  {
    "set_number": 1,
    "metrics": {
      "weight": 135,
      "reps": 10
    },
    "intensities": [
      {
        "metric": "weight",
        "percentage": 60,
        "of_metric": "1rm"
      }
    ]
  }
]
```

---

## Program Planning Tables

### 13. **plans**
Training plans/programs

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Plan ID |
| name | text | Plan name |
| description | text | Plan description |
| total_weeks | int | Total weeks |
| is_template | boolean | Is template |
| version | int | Version number |
| created_by | uuid FK → profiles.id | Creator |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### 14. **plan_assignments**
Plans assigned to athletes

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Assignment ID |
| plan_id | uuid FK → plans.id | Plan |
| athlete_id | uuid FK → athletes.id | Athlete |
| start_date | date | Start date |
| assigned_by | uuid FK → profiles.id | Who assigned |
| assigned_at | timestamptz | Assignment timestamp |
| is_active | boolean | Active status |

### 15. **workout_instances**
Scheduled workout sessions

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PRIMARY KEY | Instance ID |
| assignment_id | uuid FK → plan_assignments.id | Plan assignment |
| workout_id | uuid FK → workouts.id | Workout template |
| athlete_id | uuid FK → athletes.id | Athlete |
| scheduled_date | date | Scheduled date |
| status | enum | 'not_started' \| 'in_progress' \| 'completed' \| 'skipped' |
| completed_at | timestamptz | Completion timestamp |
| notes | text | Session notes |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

---

## Key Features

### Dynamic Metrics System
- Exercises define their own measurement schema
- Workouts inherit and configure these metrics
- Per-set and per-exercise configuration
- Intensity targets linked to specific metrics (e.g., % of 1RM)

### Flexible Tagging
- Exercise tags: Stored in exercises.tags array
- Workout tags: Stored in workouts.tags array + workout_tags library table
- Separate tag systems for different purposes

### Block/Routine System
- Routines can be standalone (templates) or part of workouts
- Support for supersets, circuits, EMOM, AMRAP, giant sets
- Import routine templates into workouts
- Visual grouping with color coding

### Workout Builder Features
- Two-column layout: sidebar + detail panel
- Drag-and-drop exercise ordering (via order_index)
- Link exercises to blocks
- Per-set configuration
- Auto-save functionality

---

## Database Migrations Applied

1. **Initial Schema** - Core tables for users, athletes, staff, teams
2. **Exercise Dynamic Metrics** - Added metric_schema to exercises
3. **Routine Exercise Metrics** - Added metric_targets, intensity_targets, set_configurations
4. **Workout Tags** - Added tags column to workouts + workout_tags table (ADD_WORKOUT_TAGS.sql)

---

## Row Level Security (RLS)

All tables have RLS enabled with policies:
- Users can view workout tags (SELECT)
- Users can insert workout tags (INSERT)
- Users can update workout tags (UPDATE)
- Users can delete workout tags (DELETE)

*Note: Current policies are permissive for development. Production policies should be more restrictive based on user roles and organization membership.*

---

## Indexes

- `idx_workouts_tags` - GIN index on workouts.tags for tag searches
- Standard foreign key indexes on all FK columns
- Index on athletes.is_active, staff.is_active, teams.is_active

---

## Next Steps / Incomplete Features

1. **Routine Library** - Standalone routine templates (is_standalone=true) management UI
2. **KPI Tracking** - Athlete performance metrics and baselines
3. **Workout Execution** - Mobile app for executing workouts and logging results
4. **Progress Tracking** - Historical performance data and analytics
5. **Advanced Programming** - Periodization, auto-regulation, progression schemes
