# Exercise History Panel - How It Handles Different Measurements

## 📊 Overview

The exercise history panel automatically displays the right data for each exercise based on what was logged. Here's how it handles different measurement types:

---

## 1️⃣ **Basic Measurements** (Reps & Weight)

### Storage:
- `actual_reps` → Dedicated column in `exercise_logs` table
- `actual_weight` → Dedicated column in `exercise_logs` table

### Display:
```
┌─────────────────────────────────────────┐
│ 2 days ago │ Reps │ Max      │ Vol     │
│ Dec 15     │  12  │ 135 lbs  │ 1,620   │
└─────────────────────────────────────────┘
```

### Calculations:
- **Reps:** Sum of all reps across all sets in that workout
- **Max:** Highest weight lifted in any set
- **Vol:** Total volume = Σ(reps × weight) for all sets

**Example:**
```javascript
Set 1: 10 reps × 135 lbs = 1,350
Set 2: 8 reps × 135 lbs  = 1,080
Set 3: 6 reps × 135 lbs  = 810
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Reps: 24
Max Weight: 135 lbs
Volume: 3,240 lbs
```

---

## 2️⃣ **Time/Duration Measurements**

### Storage:
- Stored in `metric_data` JSONB column as `{ "time": 60 }`
- Unit: seconds

### Display:
```
┌─────────────────────────────────────────┐
│ 2 days ago │ Time │          │ 3 sets  │
│ Dec 15     │ 180s │          │         │
└─────────────────────────────────────────┘
```

### Calculation:
- Shows **total time** across all sets (sum of all durations)

**Example:**
```javascript
Set 1: 60 seconds
Set 2: 60 seconds
Set 3: 60 seconds
━━━━━━━━━━━━━━━━━━━━━━
Total Time: 180s
```

---

## 3️⃣ **Distance Measurements**

### Storage:
- Stored in `metric_data` JSONB column as `{ "distance": 400 }`
- Unit: meters or yards (your choice)

### Display:
```
┌─────────────────────────────────────────┐
│ 2 days ago │ Dist │          │ 4 sets  │
│ Dec 15     │ 1600m│          │         │
└─────────────────────────────────────────┘
```

### Calculation:
- Shows **total distance** across all sets

**Example:**
```javascript
Set 1: 400m sprint
Set 2: 400m sprint
Set 3: 400m sprint
Set 4: 400m sprint
━━━━━━━━━━━━━━━━━━━━━━
Total Distance: 1,600m
```

---

## 4️⃣ **Single Custom Measurements** (e.g., RPE, Heart Rate)

### Storage:
- Stored in `metric_data` JSONB column
- Examples: `{ "rpe": 8 }`, `{ "heart_rate": 165 }`

### Display:
```
┌─────────────────────────────────────────┐
│ 2 days ago │ Reps │ RPE  │   │ 3 sets  │
│ Dec 15     │  12  │ 8    │   │         │
└─────────────────────────────────────────┘
```

### Calculation:
- For **max-type metrics** (RPE, HR): Shows highest value
- For **sum-type metrics** (calories): Shows total

**Example - RPE:**
```javascript
Set 1: RPE 7
Set 2: RPE 8
Set 3: RPE 9
━━━━━━━━━━━━━━━━━━━━━━
Max RPE: 9 (shows the hardest set)
```

---

## 5️⃣ **Paired Custom Measurements** (Primary + Secondary)

### What Are Paired Measurements?
Paired measurements are two related metrics tracked together:
- **Primary Metric:** Usually a count/reps (e.g., `red_ball_reps`)
- **Secondary Metric:** Usually intensity/quality (e.g., `red_ball_velo`)

### Examples:
- Baseball throws: `red_ball_reps` + `red_ball_velo`
- Jump training: `jump_reps` + `jump_height`
- Sprint training: `sprint_reps` + `sprint_speed`

### Storage:
Both stored in `metric_data` JSONB column together:
```json
{
  "red_ball_reps": 5,
  "red_ball_velo": 92,
  "blue_ball_reps": 3,
  "blue_ball_velo": 88
}
```

### Display:
```
┌─────────────────────────────────────────────────────────┐
│ 2 days ago │ Red  │ Blue │ Green │ Yellow │   │ 3 sets  │
│ Dec 15     │ 92   │ 88   │ 95    │ 90     │   │         │
└─────────────────────────────────────────────────────────┘
```

**Note:** Shows only the **secondary metric** (velocity) for space. The label is shortened (e.g., "red_ball_velo" → "Red")

### Calculation Logic:
```javascript
// For each ball color in a workout:
Set 1: red_ball_reps: 2, red_ball_velo: 90
Set 2: red_ball_reps: 2, red_ball_velo: 92
Set 3: red_ball_reps: 1, red_ball_velo: 88
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Max Red Ball Velocity: 92 mph (highest across all sets)
Total Red Ball Reps: 5 (sum of all sets)
```

### How The Panel Decides What to Show:
1. **Prioritizes secondary metrics** (velocities, heights, speeds) - these are usually more important for athletes
2. **Shows max value** for secondary metrics (highest velocity achieved)
3. **Limits to 2 custom metrics** in the row to keep it clean
4. **Full PR section** at bottom shows ALL metrics including primaries

---

## 6️⃣ **Multiple Paired Measurements in One Workout**

### Example: Baseball Training with Multiple Ball Types

### Storage:
```json
{
  "red_ball_reps": 5,
  "red_ball_velo": 92,
  "blue_ball_reps": 3,
  "blue_ball_velo": 88,
  "green_ball_reps": 4,
  "green_ball_velo": 95,
  "yellow_ball_reps": 2,
  "yellow_ball_velo": 90
}
```

### Display in History Row:
```
┌───────────────────────────────────────────────────┐
│ 2 days ago │ Green │ Red  │           │  3 sets   │
│ Dec 15     │  95   │  92  │           │           │
└───────────────────────────────────────────────────┘
```

**Why only 2?** To keep the row readable. It picks the 2 highest/most important metrics.

### Display in PR Section:
```
┌─────────────────────────────────────────────────────┐
│ ⭐ PERSONAL RECORDS                                  │
│                                                      │
│ Green Ball    Red Ball    Blue Ball    Yellow Ball  │
│ 95 mph        92 mph      88 mph       90 mph       │
│ Dec 15, 2024  Dec 15      Dec 12       Dec 10       │
└─────────────────────────────────────────────────────┘
```

**All tracked metrics show here!**

---

## 🎯 Summary Table

| Measurement Type | Storage Location | Display in Row | Calculation |
|-----------------|------------------|----------------|-------------|
| **Reps** | `actual_reps` column | ✅ Total | Sum across sets |
| **Weight** | `actual_weight` column | ✅ Max | Highest weight |
| **Volume** | Calculated | ✅ Total | Σ(reps × weight) |
| **Time** | `metric_data.time` | ✅ Total | Sum of durations |
| **Distance** | `metric_data.distance` | ✅ Total | Sum of distances |
| **RPE** | `metric_data.rpe` | ✅ Max | Highest RPE |
| **Single Custom** | `metric_data.{name}` | ✅ Max/Total | Depends on type |
| **Paired Primary** (reps) | `metric_data.{name}_reps` | ❌ Hidden | Not shown in row |
| **Paired Secondary** (velo) | `metric_data.{name}_velo` | ✅ Max | Highest value |

---

## 🔧 Code Example

### How It Extracts Custom Metrics:
```typescript
function getSessionStats(session: WorkoutSession) {
  const customMetrics: { [key: string]: number } = {};

  session.sets.forEach(set => {
    if (set.metric_data) {
      Object.entries(set.metric_data).forEach(([key, value]) => {
        if (typeof value === 'number') {
          // Keep the MAXIMUM value across all sets
          if (!customMetrics[key] || value > customMetrics[key]) {
            customMetrics[key] = value;
          }
        }
      });
    }
  });

  return { customMetrics };
}
```

### How It Displays in Row:
```typescript
{Object.entries(stats.customMetrics).slice(0, 2).map(([key, value]) => (
  <div key={key} className="text-center">
    {/* Shows last word of metric name (e.g., "red_ball_velo" → "velo") */}
    <div className="text-gray-500">{key.split('_').pop()}</div>
    <div className="text-white font-semibold">{value}</div>
  </div>
))}
```

---

## 💡 Real World Examples

### Example 1: Powerlifting (Basic)
```
Back Squat History:
┌─────────────────────────────────────────┐
│ Today      │ Reps │ Max      │ Vol     │
│ Dec 15     │  15  │ 315 lbs  │ 4,275   │
├─────────────────────────────────────────┤
│ 3 days ago │ Reps │ Max      │ Vol     │
│ Dec 12     │  12  │ 295 lbs  │ 3,540   │
└─────────────────────────────────────────┘

PR: Weight 315 lbs (Dec 15, 2024)
```

### Example 2: Baseball Velocity Training (Paired)
```
Overhead Press (Ball Throws) History:
┌───────────────────────────────────────────────────┐
│ Today      │ Green │ Red  │           │  3 sets   │
│ Dec 15     │  100  │  95  │           │           │
├───────────────────────────────────────────────────┤
│ 3 days ago │ Green │ Red  │           │  3 sets   │
│ Dec 12     │  98   │  92  │           │           │
└───────────────────────────────────────────────────┘

PRs:
- Green Ball Velo: 100 mph (Dec 15, 2024)
- Red Ball Velo: 95 mph (Dec 15, 2024)
```

### Example 3: Cardio (Time/Distance)
```
400m Sprints History:
┌─────────────────────────────────────────┐
│ Today      │ Dist  │ Time │  │ 4 sets  │
│ Dec 15     │ 1600m │ 240s │  │         │
├─────────────────────────────────────────┤
│ 3 days ago │ Dist  │ Time │  │ 4 sets  │
│ Dec 12     │ 1600m │ 255s │  │         │
└─────────────────────────────────────────┘

No PRs tracked (time-based exercises)
```

---

## 🚀 Key Takeaways

1. **Basic metrics (reps/weight)** always show if present
2. **Custom metrics** show the max value achieved
3. **Paired metrics** only show secondary (velocity, height, etc.)
4. **Row shows top 2 custom metrics** to stay clean
5. **PR section shows ALL metrics** with full details
6. **Everything is stored in JSONB** except reps/weight (flexible!)
7. **Auto-scrolls** for workouts with 10+ sessions

**It's smart, flexible, and handles ANY measurement type you throw at it!** 🔥
