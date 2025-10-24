# Max Tracking System - Complete Implementation

## Overview

Complete system for tracking athlete personal records (PRs) across ANY metric type - not just weight, but also distance, velocity (5oz, 6oz, 7oz ball weights), time, and custom measurements.

## Architecture

### 1. Database Schema

#### `athlete_maxes` Table
Stores personal records for athletes across all metric types.

**Key Features:**
- **Flexible metric support**: Any metric from `exercise.metric_schema` can be tracked
- **Rep-based maxes**: Tracks 1RM, 3RM, 5RM, etc. for weight exercises
- **Non-rep maxes**: Distance, velocity, time (no reps field)
- **Source tracking**: Manual, logged (auto-detected), or tested
- **Coach verification**: Boolean flag for verified PRs

**Schema:**
```sql
CREATE TABLE athlete_maxes (
  id uuid PRIMARY KEY,
  athlete_id uuid REFERENCES athletes(id),
  exercise_id uuid REFERENCES exercises(id),
  metric_id text,  -- 'weight', 'distance', 'peak_velo', '5oz_velo', etc.
  max_value decimal,
  reps_at_max integer,  -- For weight: 1=1RM, 3=3RM. NULL for non-rep metrics
  achieved_on date,
  source text DEFAULT 'manual',  -- 'manual', 'logged', 'tested'
  verified_by_coach boolean DEFAULT false,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
);

-- Unique constraint: one max per athlete/exercise/metric/rep-scheme
CREATE UNIQUE INDEX idx_athlete_maxes_unique
  ON athlete_maxes(athlete_id, exercise_id, metric_id, COALESCE(reps_at_max, 0));
```

**Location:** `supabase/migrations/20251023174000_add_athlete_maxes.sql`

#### `set_logs` Table
Records actual performance data when athletes complete workouts.

**Key Features:**
- **JSONB measurements**: Flexible storage for any metric combination
- **Automatic PR detection**: Trigger compares logged values to existing maxes
- **Save as max**: Athletes can click "Save as Max" to add to athlete_maxes
- **Potential PR flagging**: `is_potential_pr` boolean + `pr_metric_id` text

**Schema:**
```sql
CREATE TABLE set_logs (
  id uuid PRIMARY KEY,
  workout_instance_id uuid REFERENCES workout_instances(id),
  routine_exercise_id uuid REFERENCES routine_exercises(id),
  athlete_id uuid REFERENCES athletes(id),
  exercise_id uuid REFERENCES exercises(id),
  set_number integer,
  block_number integer DEFAULT 1,

  -- Flexible measurements: { "weight": 225, "reps": 5, "peak_velo": 87.3 }
  measurements jsonb DEFAULT '{}',

  -- PR detection
  is_potential_pr boolean DEFAULT false,
  pr_metric_id text,  -- Which metric is a PR
  saved_as_max boolean DEFAULT false,

  rpe decimal,
  notes text,
  video_url text,
  logged_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);
```

**Location:** `supabase/migrations/20251023180000_add_set_logs_with_max_tracking.sql`

### 2. Automatic PR Detection

**SQL Trigger Function:** `detect_potential_pr()`

**How it works:**
1. Triggered on INSERT/UPDATE of `set_logs.measurements`
2. Loops through all measurements in the logged set
3. For each metric, queries `athlete_maxes` to find current max
4. Compares logged value to current max
5. If logged value > current max (or no max exists), marks as potential PR
6. Sets `is_potential_pr = true` and `pr_metric_id = 'metric_name'`

**Special handling:**
- **Weight + Reps**: Checks for matching rep scheme (1RM, 3RM, 5RM)
- **Non-rep metrics**: Compares single max value (distance, velocity, time)

**Location:** `supabase/migrations/20251023180000_add_set_logs_with_max_tracking.sql`

### 3. Save Set as Max

**SQL Function:** `save_set_as_max(p_set_log_id, p_metric_id, p_notes)`

**How it works:**
1. Retrieves the set log by ID
2. Extracts the metric value from JSONB measurements
3. For weight metrics, extracts reps
4. Inserts or updates `athlete_maxes` table
5. Uses `ON CONFLICT` to update existing max if new value is higher
6. Marks set log as `saved_as_max = true`
7. Returns the `athlete_maxes.id`

**Location:** `supabase/migrations/20251023180000_add_set_logs_with_max_tracking.sql`

## UI Components

### 1. MaxTrackerPanel

**Purpose:** Main UI for viewing and managing athlete personal records

**Location:** `components/dashboard/athletes/max-tracker-panel.tsx`

**Features:**
- ✅ View all maxes for an athlete
- ✅ Add max manually
- ✅ Select any exercise from library
- ✅ **Dynamic metric selection** - reads from exercise.metric_schema
- ✅ Support for rep-based (1RM, 3RM) and non-rep maxes (distance, velocity)
- ✅ Edit existing maxes (value, reps, date, notes)
- ✅ Delete maxes
- ✅ Verify PRs (coach approval with green checkmark)
- ✅ Source badges (manual, auto-detected, tested)

**Integration:**
- Added as new tab "Personal Records 🏆" in athlete profile
- Located at: `app/dashboard/athletes/[id]/page.tsx:293`

**Example Usage:**
```tsx
<MaxTrackerPanel athleteId={athleteId} />
```

### 2. SaveAsMaxPrompt

**Purpose:** Prompt shown when athlete logs a potential PR during workout

**Location:** `components/dashboard/athletes/save-as-max-prompt.tsx`

**Features:**
- ✅ Displays trophy icon + "New Personal Record!" message
- ✅ Shows exercise name, metric, value, and unit
- ✅ Optional notes input (expandable)
- ✅ "Save as Max" button - calls `save_set_as_max()` function
- ✅ "Dismiss" button - hides prompt and marks PR as dismissed
- ✅ Loading states

**Example Usage:**
```tsx
<SaveAsMaxPrompt
  setLogId="uuid"
  athleteId="uuid"
  exerciseName="Back Squat"
  metricId="weight"
  metricValue={225}
  metricUnit="lbs"
  reps={5}
  onSaved={() => refreshData()}
  onDismiss={() => closePrompt()}
/>
```

### 3. SaveAsMaxBanner

**Purpose:** Compact banner for displaying all pending PRs at top of workout

**Location:** `components/dashboard/athletes/save-as-max-prompt.tsx`

**Features:**
- ✅ Fetches all potential PRs for a workout instance
- ✅ Filters: `is_potential_pr = true` AND `saved_as_max = false`
- ✅ Displays multiple `SaveAsMaxPrompt` components in a stack
- ✅ Auto-refreshes when PRs are saved/dismissed

**Example Usage:**
```tsx
<SaveAsMaxBanner
  workoutInstanceId="uuid"
  athleteId="uuid"
  onPRsSaved={() => refreshWorkout()}
/>
```

### 4. Workout Builder - Max Tracking Indicators

**Purpose:** Show coaches which metrics can be tracked as maxes

**Location:** `components/dashboard/workouts/exercise-detail-panel.tsx:309-331`

**Features:**
- ✅ Trophy icon (🏆) next to metrics commonly tracked as maxes
- ✅ Shows for: weight, distance, peak_velo, exit_velo, or any metric with "velo" or "max" in name
- ✅ Tooltip: "This metric can be tracked as a personal record"
- ✅ Helps coaches understand which measurements feed into PR tracking

## User Flows

### Flow 1: Coach Manually Adds Max

1. Navigate to athlete profile
2. Click "Personal Records 🏆" tab
3. Click "+ Add Max"
4. Select exercise (e.g., "Weighted Ball Throw - 5oz")
5. Metric dropdown auto-populates with exercise's measurements (5oz Peak Velo, 5oz Distance, etc.)
6. Enter max value
7. If weight metric: enter reps (1RM, 3RM, etc.)
8. Add optional notes
9. Click "Add Max"

### Flow 2: Athlete Logs Workout and Auto-Detects PR

**(When Phase 2 workout logging is built)**

1. Athlete opens assigned workout
2. Logs set: Back Squat - 225 lbs x 5 reps
3. `set_logs` INSERT triggers `detect_potential_pr()` function
4. Function compares to athlete's current 5RM for Back Squat
5. If 225 > current 5RM, sets `is_potential_pr = true`, `pr_metric_id = 'weight'`
6. UI shows `SaveAsMaxPrompt` component:
   - "🏆 New Personal Record! You just logged 225 lbs for 5 reps on Back Squat - that's a new 5RM!"
7. Athlete clicks "Save as Max" (optionally adds note)
8. Calls `save_set_as_max()` function
9. Updates `athlete_maxes` table with new 5RM
10. Sets `saved_as_max = true` on set log

### Flow 3: Coach Views Max-Tracked Metrics

1. Open workout builder
2. Add exercise (e.g., "Weighted Ball Throw - 5oz")
3. Click "Measurements" dropdown
4. See measurements with 🏆 icon (5oz Peak Velo, Distance)
5. Hover to see tooltip: "This metric can be tracked as a personal record"
6. Enable measurements
7. Athletes will have their logged values compared to maxes automatically

## Example Use Cases

### Use Case 1: Baseball Throwing Program

**Exercise:** "Weighted Ball Throw - 5oz"

**Metrics in exercise.metric_schema:**
- `5oz_peak_velo` (mph)
- `5oz_distance` (ft)
- `reps` (count)

**Max tracking:**
- Coach adds athlete's max: 5oz Peak Velo = 87.3 mph
- Athlete logs workout: 5oz throw at 88.1 mph
- Auto-detected PR → Prompt to save as new max
- Can also track: 6oz Peak Velo, 7oz Peak Velo, etc. (separate maxes)

### Use Case 2: Strength Training

**Exercise:** "Back Squat"

**Metrics:**
- `weight` (lbs)
- `reps` (count)

**Max tracking:**
- Athlete has multiple maxes:
  - 1RM: 315 lbs
  - 3RM: 285 lbs
  - 5RM: 255 lbs
- Athlete logs: 265 lbs x 5 reps
- Auto-detected PR for 5RM → Prompt to save
- 1RM and 3RM remain unchanged (different rep schemes)

### Use Case 3: Sprint Performance

**Exercise:** "40 Yard Dash"

**Metrics:**
- `time` (seconds)
- `distance` (yards)

**Max tracking:**
- Athlete's best time: 4.8 seconds
- Athlete logs: 4.65 seconds
- Auto-detected PR → Save as new max
- **Note:** For time, lower = better, so logic checks if new_time < current_max

## Database Queries

### Get all maxes for an athlete
```sql
SELECT
  am.*,
  e.name as exercise_name
FROM athlete_maxes am
JOIN exercises e ON am.exercise_id = e.id
WHERE am.athlete_id = '...'
ORDER BY am.achieved_on DESC;
```

### Get athlete's 1RM for an exercise
```sql
SELECT max_value
FROM athlete_maxes
WHERE athlete_id = '...'
  AND exercise_id = '...'
  AND metric_id = 'weight'
  AND reps_at_max = 1
ORDER BY max_value DESC
LIMIT 1;
```

### Get all potential PRs for a workout
```sql
SELECT
  sl.*,
  e.name as exercise_name
FROM set_logs sl
JOIN exercises e ON sl.exercise_id = e.id
WHERE sl.workout_instance_id = '...'
  AND sl.is_potential_pr = true
  AND sl.saved_as_max = false
ORDER BY sl.logged_at DESC;
```

### Get max history for an exercise
```sql
SELECT
  max_value,
  reps_at_max,
  achieved_on,
  source,
  verified_by_coach
FROM athlete_maxes
WHERE athlete_id = '...'
  AND exercise_id = '...'
  AND metric_id = 'weight'
ORDER BY achieved_on DESC;
```

## Next Steps (Phase 2 - Workout Logging)

When building the workout logging UI, integrate max tracking:

1. **Import components:**
   ```tsx
   import { SaveAsMaxBanner } from '@/components/dashboard/athletes/save-as-max-prompt';
   ```

2. **Display PR prompts at top of workout:**
   ```tsx
   <SaveAsMaxBanner
     workoutInstanceId={workoutInstanceId}
     athleteId={athleteId}
     onPRsSaved={() => refetchWorkout()}
   />
   ```

3. **When logging a set:**
   ```tsx
   await supabase.from('set_logs').insert({
     workout_instance_id: workoutInstanceId,
     routine_exercise_id: exerciseId,
     athlete_id: athleteId,
     exercise_id: exerciseId,
     set_number: setNumber,
     measurements: {
       weight: 225,
       reps: 5,
       peak_velo: 87.3  // Any metrics the exercise uses
     }
   });
   // PR detection happens automatically via trigger
   ```

4. **After insert, check for potential PRs:**
   - Banner component will auto-fetch and display new PRs
   - Athlete sees prompt with "Save as Max" button

## Configuration

### For new metric types

To add a new trackable metric type:

1. **Add to exercise's metric_schema:**
   ```json
   {
     "measurements": [
       {
         "id": "exit_velo",
         "name": "Exit Velocity",
         "type": "decimal",
         "unit": "mph"
       }
     ]
   }
   ```

2. **No code changes needed!** The system automatically:
   - Shows in MaxTrackerPanel metric dropdown
   - Detects PRs via `detect_potential_pr()` trigger
   - Saves to `athlete_maxes` table

### For custom rep schemes

The system supports any rep count:
- 1RM, 2RM, 3RM, 5RM, 10RM, etc.
- Each is stored as a separate max
- Unique constraint: `(athlete_id, exercise_id, metric_id, COALESCE(reps_at_max, 0))`

## Files Changed

### Created
- `supabase/migrations/20251023174000_add_athlete_maxes.sql` - athlete_maxes table
- `supabase/migrations/20251023180000_add_set_logs_with_max_tracking.sql` - set_logs + PR detection
- `components/dashboard/athletes/max-tracker-panel.tsx` - Main max tracking UI
- `components/dashboard/athletes/save-as-max-prompt.tsx` - PR prompt components

### Modified
- `app/dashboard/athletes/[id]/page.tsx` - Added "Personal Records" tab
- `components/dashboard/workouts/exercise-detail-panel.tsx` - Added 🏆 indicators

## Testing

### Manual Testing Steps

1. **Test adding a manual max:**
   - Go to athlete profile → Personal Records tab
   - Add a max for any exercise
   - Verify it shows in the list
   - Edit and delete the max

2. **Test dynamic metrics:**
   - Create an exercise with custom metrics (e.g., "5oz Peak Velo")
   - Go to athlete profile → Add Max
   - Select the exercise
   - Verify the metric dropdown shows custom metrics

3. **Test max tracking indicators:**
   - Open workout builder
   - Add an exercise
   - Open measurements dropdown
   - Verify 🏆 icons appear next to trackable metrics

### Automated Testing (Future)

When workout logging is built, test:
- PR detection trigger fires correctly
- SaveAsMaxPrompt appears when PR is logged
- Clicking "Save as Max" creates athlete_maxes record
- Dismissing PR hides prompt and marks as dismissed

## Summary

✅ **Complete max tracking system** for any metric type
✅ **Dynamic metric selection** from exercise schemas
✅ **Automatic PR detection** via database triggers
✅ **Manual max entry** in athlete profiles
✅ **Visual indicators** in workout builder
✅ **Ready for Phase 2** workout logging integration
