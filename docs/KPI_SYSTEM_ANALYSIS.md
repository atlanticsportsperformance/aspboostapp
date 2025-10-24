# KPI & PROGRESS TRACKING SYSTEM ANALYSIS
## ASP Boost+ - Complete Current State Report

**Generated:** October 28, 2025
**Project:** Atlantic Sports Performance Training Platform
**Location:** `C:\Users\Owner\Desktop\completeapp`

---

## EXECUTIVE SUMMARY

### ✅ What EXISTS
- **athlete_maxes** table for tracking Personal Records (1RM, max velocity, etc.)
- **exercises** table with `metric_schema` field for defining trackable metrics
- **routine_exercises** table with configuration fields:
  - `metric_targets` (JSONB)
  - `intensity_targets` (JSONB)
  - `set_configurations` (JSONB)
  - `enabled_measurements` (string array)
  - `tracked_max_metrics` (string array)
- **workout_instances** table for tracking scheduled workouts
- **MaxTrackerPanel** component for viewing/editing athlete PRs
- Metric schema system on exercises
- Personal Records page at `/dashboard/athletes/[id]/records`

### ❌ What's MISSING
- **NO exercise_logs table** - Cannot track individual set/rep performance
- **NO athlete_baselines table** - Cannot track baseline assessments
- **NO athlete_kpis table** - Cannot track custom KPIs
- **NO progress tracking UI** - Cannot view performance over time
- **NO workout logging UI** - Athletes cannot log their workouts
- **NO automatic PR detection** - System doesn't suggest max updates
- **NO historical charts** - Cannot visualize progress trends

---

## 1. CURRENT STATE SUMMARY

### Database Tables

#### ✅ EXISTING TABLES

**`athlete_maxes`**
```typescript
{
  id: string;
  athlete_id: string;
  exercise_id: string;
  metric_id: string;          // e.g., 'weight', 'velocity', 'distance'
  max_value: number;          // The actual PR value
  reps_at_max: number | null; // For strength exercises (e.g., 1RM, 3RM)
  achieved_on: string;        // Date of achievement
  source: string;             // 'manual', 'auto_detected', 'imported'
  verified_by_coach: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

**Purpose:** Track athlete personal records
**Current Usage:** Used by MaxTrackerPanel component
**Data Status:** ✅ Functional, coach can manually add/edit PRs

---

**`exercises`**
```typescript
{
  id: string;
  name: string;
  category: ExerciseCategory; // 'strength', 'hitting', 'throwing', etc.
  description: string | null;
  video_url: string | null;
  cues: string[] | null;
  equipment: string[] | null;
  metric_schema: {
    measurements: Array<{
      id: string;         // e.g., 'weight', 'reps', 'exit_velo'
      name: string;       // e.g., 'Weight', 'Reps', 'Exit Velocity'
      type: string;       // 'integer', 'decimal', 'time'
      unit: string;       // 'lbs', 'mph', 'sec'
      enabled: boolean;
    }>;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Purpose:** Define exercises and what metrics can be tracked
**Current Usage:** Used in workout builder, exercise library
**Data Status:** ✅ Schema exists, but most exercises don't have metric_schema populated

**Example Standard Measurements:**
```typescript
const standardMeasurements = [
  { id: 'reps', name: 'Reps', type: 'integer', unit: '', enabled: true },
  { id: 'weight', name: 'Weight', type: 'decimal', unit: 'lbs', enabled: true },
  { id: 'time', name: 'Time', type: 'integer', unit: 'sec', enabled: true },
  { id: 'distance', name: 'Distance', type: 'decimal', unit: 'ft', enabled: true },
  { id: 'exit_velo', name: 'Exit Velo', type: 'decimal', unit: 'mph', enabled: true },
  { id: 'peak_velo', name: 'Peak Velo', type: 'decimal', unit: 'mph', enabled: true }
];
```

---

**`routine_exercises`**
```typescript
{
  id: string;
  routine_id: string;
  exercise_id: string | null;
  is_placeholder: boolean;
  placeholder_id: string | null;
  placeholder_name: string | null;
  order_index: number;

  // Basic configuration
  sets: number | null;
  reps_min: number | null;
  reps_max: number | null;
  time_seconds: number | null;
  rest_seconds: number | null;
  notes: string | null;

  // Advanced configuration (JSONB fields)
  metric_targets: Record<string, any> | null;        // e.g., { weight: 225, reps: 5 }
  intensity_targets: IntensityTarget[] | null;       // e.g., [{ metric: 'weight', percent: 85 }]
  set_configurations: any[] | null;                  // Per-set targets
  enabled_measurements: string[] | null;             // Which metrics to track
  tracked_max_metrics: string[] | null;              // Which metrics count as PRs

  // Flags
  is_amrap: boolean | null;
  percent_1rm: number | null;
  rpe_target: number | null;

  created_at: string;
  updated_at: string;
}
```

**IntensityTarget Structure:**
```typescript
interface IntensityTarget {
  id: string;
  metric: string;        // e.g., 'weight'
  metric_label: string;  // e.g., 'Max Weight'
  percent: number;       // e.g., 85 (means 85% of 1RM)
}
```

**Purpose:** Configure exercise targets in workouts/routines
**Current Usage:** Used in workout builder, plan builder
**Data Status:** ⚠️ Partially populated - basic fields used, advanced JSONB fields often empty

---

**`workout_instances`**
```typescript
{
  id: string;
  assignment_id: string | null;
  workout_id: string;
  athlete_id: string;
  scheduled_date: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

**Purpose:** Track scheduled workouts for athletes
**Current Usage:** Used in athlete calendar
**Data Status:** ✅ Functional, workouts can be scheduled and marked complete

---

#### ❌ MISSING TABLES

**`exercise_logs`** (DOES NOT EXIST)
```typescript
// PROPOSED STRUCTURE
{
  id: string;
  workout_instance_id: string;      // Links to workout_instances
  routine_exercise_id: string;      // Links to routine_exercises (the template)
  athlete_id: string;
  exercise_id: string;
  set_number: number;               // 1, 2, 3, etc.

  // Performance data (JSONB for flexibility)
  metrics: {
    weight?: number;
    reps?: number;
    time_seconds?: number;
    distance?: number;
    exit_velo?: number;
    peak_velo?: number;
    // ... any metric from exercise.metric_schema
  };

  // Flags
  is_warmup: boolean;
  is_failure: boolean;              // Did athlete fail a rep?
  rpe: number | null;               // Rate of Perceived Exertion (1-10)

  notes: string | null;
  logged_at: string;
  created_at: string;
}
```

**WHY NEEDED:**
- Track individual set performance
- Calculate volume (weight × reps × sets)
- Detect potential PRs
- Show "last time" data
- Generate progress charts
- Calculate training load

---

**`athlete_baselines`** (DOES NOT EXIST)
```typescript
// PROPOSED STRUCTURE
{
  id: string;
  athlete_id: string;
  metric_name: string;              // e.g., "1RM Squat", "60yd Dash", "Vertical Jump"
  value: number;
  unit: string;                     // 'lbs', 'sec', 'in'
  measurement_date: string;
  measured_by: string | null;       // Coach who recorded it
  assessment_type: string | null;   // 'combine', 'testing_day', 'workout'
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

**WHY NEEDED:**
- Track baseline assessments (combine results, testing days)
- Different from maxes - these are discrete test events
- Used for %1RM calculations if max doesn't exist
- Track non-exercise metrics (40yd dash, vertical jump, etc.)

---

**`athlete_kpis`** (DOES NOT EXIST)
```typescript
// PROPOSED STRUCTURE
{
  id: string;
  athlete_id: string;
  kpi_definition_id: string;        // Links to kpi_definitions
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

**`kpi_definitions`** (DOES NOT EXIST)
```typescript
{
  id: string;
  name: string;                     // e.g., "Monthly Throwing Volume"
  description: string;
  category: string;                 // 'volume', 'intensity', 'frequency', 'performance'
  unit: string;
  datatype: 'integer' | 'decimal' | 'percentage';
  calculation_method: string | null; // SQL or logic for auto-calculation
  is_global: boolean;               // True if available to all athletes
  created_by: string;
  created_at: string;
}
```

**`athlete_kpi_values`** (DOES NOT EXIST)
```typescript
{
  id: string;
  athlete_kpi_id: string;
  value: number;
  measured_at: string;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
}
```

**WHY NEEDED:**
- Track custom performance indicators
- Different from maxes/baselines - these are ongoing metrics
- Examples: "Monthly throwing volume", "Weekly training hours", "Velocity trend"
- Can be auto-calculated from exercise_logs

---

## 2. METRIC SCHEMA ANALYSIS

### How Metrics Work

**1. Exercise Definition (exercises.metric_schema)**
```json
{
  "measurements": [
    {
      "id": "weight",
      "name": "Weight",
      "type": "decimal",
      "unit": "lbs",
      "enabled": true
    },
    {
      "id": "reps",
      "name": "Reps",
      "type": "integer",
      "unit": "",
      "enabled": true
    }
  ]
}
```

**2. Routine Exercise Configuration (routine_exercises)**
```json
{
  "metric_targets": {
    "weight": 225,
    "reps": 5
  },
  "intensity_targets": [
    {
      "id": "1",
      "metric": "weight",
      "metric_label": "Max Weight",
      "percent": 85
    }
  ],
  "enabled_measurements": ["weight", "reps", "rpe"],
  "tracked_max_metrics": ["weight"]
}
```

**3. Athlete Max (athlete_maxes)**
```json
{
  "exercise_id": "bench-press-123",
  "metric_id": "weight",
  "max_value": 245,
  "reps_at_max": 1
}
```

**4. Exercise Log (MISSING - needs to be created)**
```json
{
  "set_number": 1,
  "metrics": {
    "weight": 210,
    "reps": 5,
    "rpe": 8
  },
  "is_failure": false
}
```

### Current Metric Categories

Based on code analysis, these metric types are supported:

**Strength Metrics:**
- `weight` - Weight (lbs)
- `reps` - Repetitions (count)
- `time` - Time (seconds)
- `rpe` - Rate of Perceived Exertion (1-10)
- `percent_1rm` - Percentage of 1RM

**Throwing Metrics:**
- `peak_velo` - Peak Velocity (mph)
- `avg_velo` - Average Velocity (mph)
- `distance` - Distance (ft)

**Hitting Metrics:**
- `exit_velo` - Exit Velocity (mph)
- `launch_angle` - Launch Angle (degrees)
- `distance` - Distance (ft)

**Conditioning Metrics:**
- `time` - Time (seconds)
- `distance` - Distance (ft/yards/miles)
- `heart_rate` - Heart Rate (bpm)

**Mobility/Recovery:**
- `range_of_motion` - ROM (degrees)
- `pain_scale` - Pain (1-10)
- `flexibility_score` - Flexibility (inches/cm)

---

## 3. DATA FLOW DOCUMENTATION

### Current Flow (What Works)

```
1. COACH ASSIGNS WORKOUT
   ↓
2. workout_instances created with scheduled_date
   ↓
3. Athlete sees workout on calendar
   ↓
4. ❌ BREAKS HERE - No logging interface
```

### Proposed Flow (What's Needed)

```
1. COACH ASSIGNS WORKOUT
   ↓
2. workout_instances created
   ↓
3. Athlete opens workout on scheduled date
   ↓
4. System loads routine_exercises with targets
   ↓
5. For each exercise with intensity_targets:
     - Look up athlete_maxes for that metric
     - Calculate target: max_value × (percent / 100)
     - Display: "Target: 208 lbs (85% of 245 lbs 1RM)"
   ↓
6. Athlete logs each set:
     - Create exercise_logs record
     - Store actual performance
   ↓
7. After workout complete:
     - Analyze logs for potential PRs
     - If logged weight × reps suggests new 1RM:
       * Calculate estimated 1RM (Epley formula)
       * Prompt: "New PR detected! Update 1RM?"
     - Update workout_instance.status = 'completed'
   ↓
8. Progress tracking:
     - Query exercise_logs grouped by date
     - Generate charts (weight over time, volume over time)
     - Show trends
```

---

## 4. USER STORIES WITH CURRENT STATE

### USER STORY 1: Athlete Logs a Workout

**Scenario:**
- Athlete opens workout for Oct 28, 2025
- Workout has "Bench Press: 3 sets × 5 reps @ 85% 1RM"
- Athlete's 1RM is 245 lbs (stored in athlete_maxes)
- System should calculate: 85% of 245 = 208 lbs

**Current State Analysis:**

✅ **What works:**
```typescript
// 1. Get workout instance
const { data: workoutInstance } = await supabase
  .from('workout_instances')
  .select('*, workouts(*, routines(*, routine_exercises(*)))')
  .eq('id', instanceId)
  .single();

// 2. Get routine exercise with targets
const routineExercise = {
  exercise_id: 'bench-press-123',
  sets: 3,
  reps_min: 5,
  reps_max: 5,
  intensity_targets: [
    {
      metric: 'weight',
      metric_label: 'Max Weight',
      percent: 85
    }
  ]
};

// 3. Look up athlete's max
const { data: athleteMax } = await supabase
  .from('athlete_maxes')
  .select('*')
  .eq('athlete_id', athleteId)
  .eq('exercise_id', 'bench-press-123')
  .eq('metric_id', 'weight')
  .single();

// athleteMax.max_value = 245

// 4. Calculate target
const targetWeight = 245 * 0.85; // = 208.25 ≈ 208 lbs
```

❌ **What's missing:**
```typescript
// 5. NO TABLE to log actual performance
// Need exercise_logs table to store:
await supabase.from('exercise_logs').insert([
  {
    workout_instance_id: instanceId,
    routine_exercise_id: routineExerciseId,
    athlete_id: athleteId,
    exercise_id: 'bench-press-123',
    set_number: 1,
    metrics: { weight: 210, reps: 5, rpe: 8 }
  },
  {
    workout_instance_id: instanceId,
    routine_exercise_id: routineExerciseId,
    athlete_id: athleteId,
    exercise_id: 'bench-press-123',
    set_number: 2,
    metrics: { weight: 210, reps: 5, rpe: 8 }
  },
  {
    workout_instance_id: instanceId,
    routine_exercise_id: routineExerciseId,
    athlete_id: athleteId,
    exercise_id: 'bench-press-123',
    set_number: 3,
    metrics: { weight: 210, reps: 4, rpe: 9 }  // Failed rep 5
  }
]);

// 6. NO PR DETECTION LOGIC
// After logging, check if 210 × 4-5 reps suggests new 1RM
// Epley formula: 1RM = weight × (1 + reps/30)
const estimated1RM = 210 * (1 + 5/30); // = 245 lbs (same as current)
// If estimated1RM > current max, suggest update
```

---

### USER STORY 2: Coach Views Athlete Progress

**Scenario:**
- Coach opens athlete profile
- Navigates to "Progress" tab
- Wants to see "Bench Press - Weight Over Time" chart
- Should show: Oct 1: 215 lbs, Oct 8: 220 lbs, Oct 15: 225 lbs, etc.

**Current State Analysis:**

❌ **COMPLETELY MISSING**

No progress/charts page exists. Would need:

```typescript
// 1. Create page at: app/dashboard/athletes/[id]/progress/page.tsx

// 2. Query all logs for an exercise
const { data: logs } = await supabase
  .from('exercise_logs')
  .select('*')
  .eq('athlete_id', athleteId)
  .eq('exercise_id', 'bench-press-123')
  .order('logged_at');

// 3. Group by date and aggregate
const chartData = logs.reduce((acc, log) => {
  const date = log.logged_at.split('T')[0];
  if (!acc[date]) {
    acc[date] = { max_weight: 0, total_volume: 0 };
  }
  const weight = log.metrics.weight || 0;
  const reps = log.metrics.reps || 0;
  acc[date].max_weight = Math.max(acc[date].max_weight, weight);
  acc[date].total_volume += weight * reps;
  return acc;
}, {});

// 4. Convert to chart format
const weightOverTime = Object.entries(chartData).map(([date, data]) => ({
  date,
  weight: data.max_weight,
  volume: data.total_volume
}));

// 5. Render chart (use Recharts or similar)
<LineChart data={weightOverTime}>
  <XAxis dataKey="date" />
  <YAxis />
  <Line dataKey="weight" stroke="#C9A857" />
</LineChart>
```

---

### USER STORY 3: Athlete Sees Today's Targets

**Scenario:**
- Athlete opens workout
- Exercise says: "Bench Press: 3 × 5 @ 85% 1RM"
- System looks up 1RM: 245 lbs
- Calculates: 245 × 0.85 = 208 lbs
- Displays: "Target: 208 lbs"
- Shows: "Last time: 205 × 5, 205 × 5, 205 × 4"

**Current State Analysis:**

✅ **Target calculation works:**
```typescript
// From routine_exercises
const intensityTarget = {
  metric: 'weight',
  percent: 85
};

// From athlete_maxes
const max = 245;

// Calculate
const target = max * (intensityTarget.percent / 100); // 208 lbs
```

❌ **"Last time" data missing:**
```typescript
// Would need to query exercise_logs:
const { data: lastWorkout } = await supabase
  .from('exercise_logs')
  .select('*')
  .eq('athlete_id', athleteId)
  .eq('exercise_id', 'bench-press-123')
  .order('logged_at', { ascending: false })
  .limit(1);

// Group by workout_instance_id to get all sets from last workout
const lastSets = await supabase
  .from('exercise_logs')
  .select('*')
  .eq('workout_instance_id', lastWorkout.workout_instance_id)
  .eq('exercise_id', 'bench-press-123')
  .order('set_number');

// Display: "Last time: 205×5, 205×5, 205×4"
```

---

## 5. FILE STRUCTURE ANALYSIS

### Existing Pages

```
app/dashboard/athletes/[id]/
├── page.tsx                          ✅ Athlete detail with tabs
├── records/
│   └── page.tsx                      ✅ Personal Records (MaxTrackerPanel)
└── loading.tsx                       ✅ Loading state
```

### Existing Components

```
components/dashboard/athletes/
├── athlete-overview-tab.tsx          ✅ Stats, profile, workouts list
├── athlete-calendar-tab.tsx          ✅ Calendar with workout instances
├── athlete-performance-tab.tsx       ✅ Now shows MaxTrackerPanel
├── max-tracker-panel.tsx             ✅ PR tracking (uses athlete_maxes)
├── assign-plan-modal.tsx             ✅ Assign plans to athletes
├── add-workout-to-athlete-modal.tsx  ✅ Assign workouts
├── add-routine-to-athlete-modal.tsx  ✅ Assign routines
└── manage-tags-modal.tsx             ✅ Assign content tags
```

### Missing Components/Pages

```
❌ app/dashboard/athletes/[id]/progress/page.tsx
   - Progress charts and trends
   - Exercise history
   - Volume tracking
   - Intensity tracking

❌ app/dashboard/athletes/[id]/workouts/[instanceId]/page.tsx
   - Workout logging interface
   - Set-by-set input
   - RPE tracking
   - Timer/rest tracking

❌ components/dashboard/athletes/workout-logger.tsx
   - Component for logging sets/reps
   - Metric input fields
   - PR detection alerts
   - "Last time" display

❌ components/dashboard/athletes/progress-charts.tsx
   - Line charts for metrics over time
   - Volume charts
   - Intensity heatmaps

❌ components/dashboard/athletes/exercise-history.tsx
   - Table of all logs for an exercise
   - Filterable by date range
   - Sortable by metric
```

---

## 6. GAPS IDENTIFIED

### Database Gaps

| Gap | Severity | Impact |
|-----|----------|--------|
| No `exercise_logs` table | 🔴 **Critical** | Cannot track workout performance |
| No `athlete_baselines` table | 🟡 **Medium** | Cannot track baseline assessments |
| No `athlete_kpis` tables | 🟡 **Medium** | Cannot track custom KPIs |
| `metric_schema` unpopulated | 🟡 **Medium** | Limited metric options |
| `metric_targets` rarely used | 🟡 **Medium** | Targets not consistently set |

### Feature Gaps

| Gap | Severity | Impact |
|-----|----------|--------|
| No workout logging UI | 🔴 **Critical** | Athletes can't log workouts |
| No progress charts | 🔴 **Critical** | Can't visualize improvements |
| No "last time" display | 🟡 **Medium** | Athletes don't see previous performance |
| No automatic PR detection | 🟡 **Medium** | PRs must be manually added |
| No volume calculations | 🟡 **Medium** | Can't track training load |
| No export/reporting | 🟢 **Low** | Can't generate reports |

### Code Gaps

| Gap | Severity | Impact |
|-----|----------|--------|
| No logging API routes | 🔴 **Critical** | No backend for logging |
| No progress calculation utilities | 🟡 **Medium** | Must write logic from scratch |
| No chart components | 🟡 **Medium** | Must install charting library |
| No PR detection algorithm | 🟡 **Medium** | Must implement Epley formula |

---

## 7. RECOMMENDATIONS

### Phase 1: Foundation (Week 1) - CRITICAL

**Priority 1: Create `exercise_logs` table**
```sql
CREATE TABLE exercise_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_instance_id UUID REFERENCES workout_instances(id) ON DELETE CASCADE,
  routine_exercise_id UUID REFERENCES routine_exercises(id) ON DELETE SET NULL,
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  metrics JSONB DEFAULT '{}'::jsonb,
  is_warmup BOOLEAN DEFAULT false,
  is_failure BOOLEAN DEFAULT false,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercise_logs_athlete ON exercise_logs(athlete_id);
CREATE INDEX idx_exercise_logs_exercise ON exercise_logs(exercise_id);
CREATE INDEX idx_exercise_logs_instance ON exercise_logs(workout_instance_id);
CREATE INDEX idx_exercise_logs_date ON exercise_logs(logged_at);
```

**Priority 2: Build Workout Logging UI**
- Page: `app/dashboard/athletes/[id]/workouts/[instanceId]/page.tsx`
- Component: `components/dashboard/athletes/workout-logger.tsx`
- Features:
  - Display workout with all exercises
  - Show target weights (from intensity_targets)
  - Input fields for each set
  - "Last time" display
  - Save to exercise_logs

**Priority 3: Target Calculation Logic**
```typescript
// utils/calculate-targets.ts
export function calculateTarget(
  exercise: Exercise,
  routineExercise: RoutineExercise,
  athleteMaxes: AthleteMax[]
): Record<string, number> {
  const targets: Record<string, number> = {};

  routineExercise.intensity_targets?.forEach(target => {
    const max = athleteMaxes.find(m =>
      m.exercise_id === exercise.id &&
      m.metric_id === target.metric
    );

    if (max) {
      targets[target.metric] = Math.round(max.max_value * (target.percent / 100));
    }
  });

  return targets;
}
```

---

### Phase 2: Progress Tracking (Week 2) - HIGH

**Priority 1: Create Progress Page**
- Page: `app/dashboard/athletes/[id]/progress/page.tsx`
- Component: `components/dashboard/athletes/progress-charts.tsx`
- Install: `npm install recharts`

**Priority 2: Build Chart Queries**
```typescript
// utils/progress-queries.ts
export async function getExerciseHistory(
  athleteId: string,
  exerciseId: string,
  metric: string,
  startDate: string,
  endDate: string
) {
  const { data } = await supabase
    .from('exercise_logs')
    .select('logged_at, metrics')
    .eq('athlete_id', athleteId)
    .eq('exercise_id', exerciseId)
    .gte('logged_at', startDate)
    .lte('logged_at', endDate)
    .order('logged_at');

  return data?.map(log => ({
    date: log.logged_at,
    value: log.metrics[metric]
  }));
}

export async function calculateVolume(logs: ExerciseLog[]) {
  return logs.reduce((total, log) => {
    const weight = log.metrics.weight || 0;
    const reps = log.metrics.reps || 0;
    return total + (weight * reps);
  }, 0);
}
```

---

### Phase 3: Auto PR Detection (Week 3) - MEDIUM

**Priority 1: Implement PR Detection**
```typescript
// utils/pr-detection.ts
export function estimateOneRepMax(weight: number, reps: number): number {
  // Epley formula: 1RM = weight × (1 + reps/30)
  return Math.round(weight * (1 + reps / 30));
}

export function detectPotentialPR(
  logs: ExerciseLog[],
  currentMax: AthleteMax | null
): PotentialPR | null {
  const bestSet = logs.reduce((best, log) => {
    const estimated = estimateOneRepMax(
      log.metrics.weight || 0,
      log.metrics.reps || 0
    );
    return estimated > (best?.estimated || 0) ? { log, estimated } : best;
  }, null);

  if (!bestSet) return null;

  const currentMaxValue = currentMax?.max_value || 0;
  const improvement = bestSet.estimated - currentMaxValue;

  if (improvement > 0) {
    return {
      exerciseId: logs[0].exercise_id,
      metric: 'weight',
      currentMax: currentMaxValue,
      newMax: bestSet.estimated,
      improvement,
      basedOn: {
        weight: bestSet.log.metrics.weight,
        reps: bestSet.log.metrics.reps
      }
    };
  }

  return null;
}
```

**Priority 2: PR Notification Component**
```typescript
// components/dashboard/athletes/pr-alert.tsx
export function PRAlert({ pr, onUpdate, onDismiss }) {
  return (
    <div className="bg-[#C9A857]/10 border border-[#C9A857]/30 rounded-xl p-4">
      <h3 className="text-[#C9A857] font-bold mb-2">🎉 Potential PR Detected!</h3>
      <p className="text-white mb-2">
        Based on {pr.basedOn.weight} lbs × {pr.basedOn.reps} reps
      </p>
      <p className="text-white mb-4">
        Estimated 1RM: <strong>{pr.newMax} lbs</strong>
        {' '}(+{pr.improvement} lbs from {pr.currentMax} lbs)
      </p>
      <div className="flex gap-2">
        <button onClick={() => onUpdate(pr.newMax)}>
          Update 1RM
        </button>
        <button onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
```

---

### Phase 4: Baselines & KPIs (Week 4+) - LOW

**Priority 1: Create baseline tables**
```sql
CREATE TABLE athlete_baselines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  value DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  measurement_date DATE NOT NULL,
  measured_by UUID REFERENCES profiles(id),
  assessment_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Priority 2: Create KPI tables** (see section 3 for schema)

---

## 8. SAMPLE QUERIES

### Get Athlete's 1RM for an Exercise
```typescript
const { data: max } = await supabase
  .from('athlete_maxes')
  .select('max_value, reps_at_max, achieved_on')
  .eq('athlete_id', athleteId)
  .eq('exercise_id', exerciseId)
  .eq('metric_id', 'weight')
  .order('max_value', { ascending: false })
  .limit(1)
  .single();
```

### Get Last Performance for an Exercise
```typescript
const { data: lastLogs } = await supabase
  .from('exercise_logs')
  .select('*, workout_instances(scheduled_date)')
  .eq('athlete_id', athleteId)
  .eq('exercise_id', exerciseId)
  .order('logged_at', { ascending: false })
  .limit(1);

const lastWorkoutId = lastLogs?.[0]?.workout_instance_id;

const { data: allSets } = await supabase
  .from('exercise_logs')
  .select('set_number, metrics')
  .eq('workout_instance_id', lastWorkoutId)
  .eq('exercise_id', exerciseId)
  .order('set_number');
```

### Calculate Total Volume for a Workout
```typescript
const { data: logs } = await supabase
  .from('exercise_logs')
  .select('metrics')
  .eq('workout_instance_id', workoutInstanceId);

const totalVolume = logs.reduce((sum, log) => {
  const weight = log.metrics.weight || 0;
  const reps = log.metrics.reps || 0;
  return sum + (weight * reps);
}, 0);
```

### Get All Logs for an Exercise Over Time
```typescript
const { data: history } = await supabase
  .from('exercise_logs')
  .select('logged_at, set_number, metrics, workout_instances(scheduled_date)')
  .eq('athlete_id', athleteId)
  .eq('exercise_id', exerciseId)
  .gte('logged_at', startDate)
  .lte('logged_at', endDate)
  .order('logged_at');

// Group by date
const byDate = history.reduce((acc, log) => {
  const date = log.workout_instances.scheduled_date;
  if (!acc[date]) acc[date] = [];
  acc[date].push(log);
  return acc;
}, {});
```

---

## 9. IMPLEMENTATION ROADMAP

### Immediate Actions (This Week)
1. ✅ Complete this analysis document
2. 🔴 Create `exercise_logs` table (30 min)
3. 🔴 Build basic workout logging UI (4 hours)
4. 🔴 Implement target calculation logic (2 hours)

### Short Term (Next 2 Weeks)
1. 🟡 Build progress charts page (6 hours)
2. 🟡 Add "last time" display to workout logger (2 hours)
3. 🟡 Implement PR detection (4 hours)
4. 🟡 Create PR alert component (2 hours)

### Medium Term (Next Month)
1. 🟢 Create baseline tracking (4 hours)
2. 🟢 Build KPI system (8 hours)
3. 🟢 Add volume calculations (2 hours)
4. 🟢 Create export/reporting (6 hours)

---

## 10. CONCLUSION

### Summary
The system has a **solid foundation** with:
- Exercise library with metric schemas
- Workout/plan assignment system
- Calendar and scheduling
- Personal records tracking (athlete_maxes)

But is **missing critical pieces** for actual progress tracking:
- ❌ No exercise logging (exercise_logs table)
- ❌ No workout logging UI
- ❌ No progress visualization
- ❌ No automatic PR detection

### Next Steps
**The HIGHEST PRIORITY is creating the `exercise_logs` table and building the workout logging UI.** Without this, athletes cannot track their performance, and all downstream features (charts, trends, PR detection) are impossible.

**Estimated Timeline:**
- Phase 1 (Foundation): 1 week
- Phase 2 (Progress Tracking): 1 week
- Phase 3 (Auto PR Detection): 1 week
- Phase 4 (Baselines & KPIs): Ongoing

**Total Time to MVP (Phases 1-2): 2 weeks**

---

## APPENDIX A: Database Schema Diagram

```
┌─────────────────┐
│   exercises     │
├─────────────────┤
│ id              │◄───────┐
│ name            │        │
│ category        │        │
│ metric_schema   │        │
└─────────────────┘        │
                           │
┌─────────────────┐        │
│ routine_        │        │
│ exercises       │        │
├─────────────────┤        │
│ id              │        │
│ exercise_id     │────────┘
│ metric_targets  │
│ intensity_      │
│ targets         │
└─────────────────┘
         │
         │
         ▼
┌─────────────────┐
│ workout_        │
│ instances       │
├─────────────────┤
│ id              │◄───────┐
│ athlete_id      │        │
│ status          │        │
│ scheduled_date  │        │
└─────────────────┘        │
                           │
┌─────────────────┐        │
│ exercise_logs   │        │
│ (MISSING!)      │        │
├─────────────────┤        │
│ id              │        │
│ workout_        │────────┘
│ instance_id     │
│ exercise_id     │
│ set_number      │
│ metrics (JSONB) │
└─────────────────┘
         │
         │ (used to detect PRs)
         │
         ▼
┌─────────────────┐
│ athlete_maxes   │
├─────────────────┤
│ id              │
│ athlete_id      │
│ exercise_id     │
│ metric_id       │
│ max_value       │
└─────────────────┘
```

---

**END OF ANALYSIS**

Generated: October 28, 2025
Author: Claude (ASP Boost+ Development Assistant)
