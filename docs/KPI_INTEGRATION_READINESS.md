# KPI/Baseline Integration Readiness

## ✅ Current State: READY FOR KPI INTEGRATION

This document verifies that the workout builder's intensity system is properly structured to integrate with the athlete baseline/KPI system.

---

## 1. Database Schema - Current State

### ✅ `routine_exercises` Table (Workout Templates)
```sql
-- Stores workout configuration with flexible metrics
CREATE TABLE routine_exercises (
  id uuid PRIMARY KEY,
  routine_id uuid REFERENCES routines(id),
  exercise_id uuid REFERENCES exercises(id),

  -- Core fields
  sets int,                           -- Number of sets
  rest_seconds int,                   -- Rest between sets
  notes text,

  -- Flexible metric targets (JSONB)
  metric_targets jsonb DEFAULT '{}'::jsonb,
  -- Example: {"reps": 10, "weight": 135, "distance": 100, "jump_height": 24}

  -- Intensity targets (JSONB array)
  intensity_targets jsonb DEFAULT '[]'::jsonb,
  -- Example: [{"id": "1", "metric": "weight", "metric_label": "Max Weight", "percent": 75}]

  -- Per-set configurations (JSONB array)
  set_configurations jsonb DEFAULT '[]'::jsonb
  -- Example: [
  --   {
  --     "set_number": 1,
  --     "metric_values": {"reps": 8, "weight": 135},
  --     "intensity_type": "weight",
  --     "intensity_percent": 100,
  --     "rest_seconds": 60
  --   }
  -- ]
);
```

### ❌ `athlete_baselines` Table (NOT YET CREATED - NEEDED FOR KPI)
```sql
-- Stores athlete max/baseline values per metric
CREATE TABLE athlete_baselines (
  id uuid PRIMARY KEY,
  athlete_id uuid REFERENCES athletes(id),
  exercise_id uuid REFERENCES exercises(id),  -- Which exercise
  metric_id text NOT NULL,                     -- Which metric (weight, distance, time, etc.)
  baseline_value decimal NOT NULL,             -- The max/baseline value (e.g., 1RM = 300 lbs)
  measurement_date timestamptz DEFAULT now(),  -- When measured
  recorded_by uuid REFERENCES profiles(id),    -- Who recorded it
  notes text,
  is_active boolean DEFAULT true,              -- Allow historical baselines
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Example data:
-- John Doe's Squat 1RM: 300 lbs (measured Oct 20, 2024)
-- John Doe's Long Toss Max Distance: 250 ft (measured Oct 18, 2024)
-- John Doe's 60-yard dash Best Time: 7.2 seconds (measured Oct 15, 2024)
```

---

## 2. Data Flow: Template → Athlete Assignment → Resolution

### Step 1: Coach Creates Workout Template (CURRENT - WORKING)
```typescript
// Simple Mode Example: "3 x 8 @ 75%"
{
  exercise_id: "squat-uuid",
  sets: 3,
  metric_targets: {
    reps: 8
  },
  intensity_targets: [
    {
      id: "1",
      metric: "weight",        // % of WEIGHT metric
      metric_label: "Max Weight",
      percent: 75              // 75% intensity
    }
  ],
  rest_seconds: 90
}

// Per-Set Mode Example: Progressive loading
{
  exercise_id: "bench-press-uuid",
  sets: 3,
  set_configurations: [
    {
      set_number: 1,
      metric_values: { reps: 8 },
      intensity_type: "weight",
      intensity_percent: 60,    // 60% of 1RM
      rest_seconds: 90
    },
    {
      set_number: 2,
      metric_values: { reps: 6 },
      intensity_type: "weight",
      intensity_percent: 75,    // 75% of 1RM
      rest_seconds: 120
    },
    {
      set_number: 3,
      metric_values: { reps: 4 },
      intensity_type: "weight",
      intensity_percent: 85,    // 85% of 1RM
      rest_seconds: 180
    }
  ]
}
```

### Step 2: Assign Workout to Athlete (FUTURE - NEEDS IMPLEMENTATION)
```typescript
// When assigning workout to athlete
async function assignWorkoutToAthlete(workoutId: string, athleteId: string, scheduledDate: Date) {
  // 1. Create workout_instance
  const instance = await createWorkoutInstance({
    workout_id: workoutId,
    athlete_id: athleteId,
    scheduled_date: scheduledDate,
    status: 'scheduled'
  });

  // 2. Resolve intensity targets to actual values
  const resolvedExercises = await resolveIntensityTargets(workoutId, athleteId);

  // 3. Store resolved workout for athlete
  await storeResolvedWorkout(instance.id, resolvedExercises);
}
```

### Step 3: Resolve Intensity % to Actual Values (FUTURE - NEEDS IMPLEMENTATION)
```typescript
async function resolveIntensityTargets(workoutId: string, athleteId: string) {
  // Get workout template
  const workout = await getWorkoutWithExercises(workoutId);

  for (const exercise of workout.exercises) {
    // Get athlete's baseline for this exercise and metric
    const baseline = await getAthleteBaseline(
      athleteId,
      exercise.exercise_id,
      exercise.intensity_targets[0].metric  // e.g., "weight"
    );

    if (!baseline) {
      // No baseline recorded - flag for coach to add baseline
      console.warn(`No baseline for athlete ${athleteId}, exercise ${exercise.exercise_id}, metric ${exercise.intensity_targets[0].metric}`);
      continue;
    }

    // Calculate actual target value
    // Example: 75% of 300 lbs 1RM = 225 lbs
    const targetValue = (baseline.baseline_value * exercise.intensity_targets[0].percent) / 100;

    // Store resolved target
    exercise.resolved_target = {
      metric: exercise.intensity_targets[0].metric,
      value: targetValue,
      unit: baseline.unit,
      percent: exercise.intensity_targets[0].percent,
      baseline_value: baseline.baseline_value
    };
  }

  return workout;
}
```

---

## 3. Integration Points - What Needs to be Built

### ✅ COMPLETE - Workout Builder
- [x] Dynamic metric system based on `metric_schema`
- [x] Flexible `metric_targets` JSONB storage
- [x] Intensity % system with metric selection
- [x] Per-set configuration with intensity per set
- [x] Simple mode: uniform intensity across all sets
- [x] Per-set mode: different intensity per set
- [x] Auto-refresh UI after updates

### ❌ TODO - Baseline Management (Phase 4.5)
- [ ] Create `athlete_baselines` table
- [ ] UI to add/edit athlete baselines
- [ ] Baseline entry form per exercise per metric
- [ ] Historical baseline tracking
- [ ] Baseline charts/visualizations

### ❌ TODO - Workout Assignment Resolution (Phase 4.6)
- [ ] Resolve intensity % to actual values when assigning
- [ ] Handle missing baselines (warn coach)
- [ ] Store resolved workout in `workout_instances`
- [ ] Display resolved values to athlete

### ❌ TODO - Exercise Logging (Phase 4.7)
- [ ] Athlete workout view
- [ ] Log actual completed values
- [ ] Compare actual vs target
- [ ] Auto-update baselines based on performance

---

## 4. Example End-to-End Flow

### Scenario: John Doe - Squat Workout

**Step 1: Coach Creates Template**
```
Exercise: Back Squat
Sets: 3
Reps: 8
Intensity: % Weight @ 75%
Rest: 90s

Template says: "3 x 8 @ 75% of 1RM"
```

**Step 2: Baseline Exists**
```sql
SELECT * FROM athlete_baselines
WHERE athlete_id = 'john-uuid'
AND exercise_id = 'squat-uuid'
AND metric_id = 'weight'
AND is_active = true;

Result:
- baseline_value: 300 (lbs)
- measurement_date: 2024-10-20
```

**Step 3: Assignment & Resolution**
```
Workout assigned to John Doe on Oct 25, 2024

Resolution:
- Template: 75% of weight
- John's 1RM: 300 lbs
- Calculated: 300 * 0.75 = 225 lbs

Resolved workout:
"3 x 8 @ 225 lbs (75% of 300 lbs 1RM)"
```

**Step 4: Athlete Sees**
```
Back Squat
3 sets x 8 reps @ 225 lbs
Rest: 90s

Target: 225 lbs (75% of your 300 lbs 1RM)
```

**Step 5: Athlete Logs Performance**
```
Set 1: 8 reps @ 225 lbs ✅
Set 2: 8 reps @ 225 lbs ✅
Set 3: 7 reps @ 225 lbs ⚠️ (1 rep short)

Overall: 23/24 reps completed (95.8%)
```

---

## 5. Data Structure Compatibility

### ✅ COMPATIBLE - Current workout builder data maps directly to baseline system

**Metric Schema (Exercise)**
```json
{
  "measurements": [
    { "id": "reps", "name": "Reps", "type": "integer", "unit": "reps", "enabled": true },
    { "id": "weight", "name": "Weight", "type": "decimal", "unit": "lbs", "enabled": true }
  ]
}
```

**Metric Targets (Workout Template)**
```json
{
  "reps": 8,
  "weight": 135
}
```

**Intensity Targets (Workout Template)**
```json
[
  { "id": "1", "metric": "weight", "metric_label": "Max Weight", "percent": 75 }
]
```

**Athlete Baseline (Per Exercise Per Metric)**
```json
{
  "athlete_id": "john-uuid",
  "exercise_id": "squat-uuid",
  "metric_id": "weight",           // ← Maps to intensity_target.metric
  "baseline_value": 300,            // ← Used for % calculation
  "measurement_date": "2024-10-20"
}
```

**Resolution (Calculated)**
```json
{
  "target_metric": "weight",
  "target_value": 225,              // = 300 * 0.75
  "target_percent": 75,
  "baseline_value": 300,
  "baseline_date": "2024-10-20"
}
```

### ✅ The metric IDs match across all systems!
- Exercise `metric_schema.measurements[].id` (e.g., "weight")
- Workout `intensity_targets[].metric` (e.g., "weight")
- Baseline `metric_id` (e.g., "weight")
- **They all reference the same metric!**

---

## 6. Verification Checklist

✅ **Database Columns Exist**
- [x] `routine_exercises.metric_targets` (JSONB)
- [x] `routine_exercises.intensity_targets` (JSONB)
- [x] `routine_exercises.set_configurations` (JSONB)
- [x] `exercises.metric_schema` (JSONB)

✅ **TypeScript Interfaces Match**
- [x] IntensityTarget interface has `metric` field
- [x] Measurement interface has `id` field that maps to metric ID
- [x] SetConfiguration interface has `metric_values` and `intensity_type`

✅ **UI Updates Database**
- [x] Selecting intensity type/percent saves to `intensity_targets`
- [x] Entering metric values saves to `metric_targets`
- [x] Per-set config saves to `set_configurations`
- [x] UI auto-refreshes after updates

✅ **Data Structure Consistency**
- [x] Metric IDs are consistent (e.g., "weight", "distance", "reps")
- [x] JSONB structure supports any metric (core or custom)
- [x] Intensity targets reference metrics by ID
- [x] Future baseline table will use same metric IDs

---

## 7. Next Steps for KPI Integration

### Phase 1: Create Baseline Management UI
1. Create `athlete_baselines` table (SQL migration)
2. Add "Baselines" tab to athlete profile page
3. UI to add/edit baselines per exercise per metric
4. Display current baselines with date measured

### Phase 2: Implement Workout Resolution
1. When assigning workout to athlete, resolve % to actual values
2. Handle missing baselines (warn coach, suggest baseline entry)
3. Store resolved workout in `workout_instances`
4. Show resolved values in athlete workout view

### Phase 3: Exercise Logging & Auto-Update
1. Athlete workout completion interface
2. Log actual performance (sets, reps, weight completed)
3. Compare actual vs target
4. Auto-suggest baseline updates when athlete exceeds current baseline

---

## 8. Conclusion

### ✅ YES - Everything is synced and ready for KPI integration!

**What's Working:**
- Workout templates store intensity as % of metric
- Metric IDs are consistent across system
- JSONB structure supports any metric
- Data structure maps directly to baseline system

**What's Needed:**
- Create `athlete_baselines` table
- Build baseline management UI
- Implement resolution logic (% → actual value)
- Build athlete workout logging interface

**The current workout builder is 100% compatible with the future baseline/KPI system. No refactoring needed!**
