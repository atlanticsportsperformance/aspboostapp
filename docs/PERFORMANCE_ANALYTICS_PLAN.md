# Performance & Analytics System - Complete Plan

## Tab Structure & Organization

### **Performance & KPI Tab** (Current: Personal Records)
**Focus:** Athlete's personal bests and current capabilities

#### Section 1: Personal Records Dashboard
- **Current PRs** (what we have now)
  - Compact list with filters
  - Shows LATEST max for each metric
  - Verify/Edit/Delete buttons
  - Badges: Auto-detected, Verified, PR tracking

#### Section 2: Max Trend Charts
**Layout:** Grid of cards, one card per metric type

**Features:**
- **Line Chart** with shaded area fill
- **Metric Cards:** Weight, Distance, Velocity (blue ball, red ball, etc.)
- **Time Filters:** 1M, 3M, 6M, 1Y, Custom Range
- **Percent Change Badge:** "+5.2% vs 6M ago"
- **Data Points:** Clickable to see workout details
- **Annotations:** Mark verified PRs with star icon

**Example:**
```
┌─────────────────────────────────────────────┐
│ 📊 Bench Press - 1RM (Weight)              │
│ [1M] [3M] [6M] [1Y] [Custom ▼]             │
│                                             │
│   325 lbs ────────●                         │
│   315 lbs ──────●  ↑                        │
│   295 lbs ────●                             │
│   280 lbs ──●                               │
│                                             │
│   Jan   Feb   Mar   Apr                     │
│                                             │
│ Latest: 325 lbs (Apr 5, 2025) ✓            │
│ Change: +16% since Jan                      │
└─────────────────────────────────────────────┘
```

#### Section 3: Velocity Tracking (Baseball/Softball Specific)
**Multiple Ball Weight Comparison**

**Features:**
- **Overlay Chart:** All ball weights on one chart
- **Color-coded:** Blue ball (blue line), Red ball (red), Yellow ball (yellow)
- **Avg vs Max Toggle:** Show average velo or max velo
- **Drill Breakdown:** Filter by drill type (Walking Windup, Crow Hop, etc.)

**Example:**
```
┌─────────────────────────────────────────────┐
│ 🎯 Throwing Velocity - Walking Windup      │
│                                             │
│   90 mph                                    │
│   88 mph ─────────●(Blue)                   │
│   86 mph ────────●(Red)                     │
│   84 mph ───────●(Yellow)                   │
│   82 mph ──────●                            │
│                                             │
│   Jan   Feb   Mar   Apr                     │
│                                             │
│ Blue Ball: 88.5 mph (+3.2 mph)             │
│ Red Ball:  85.3 mph (+2.8 mph)             │
│ Yellow:    82.1 mph (+1.9 mph)             │
└─────────────────────────────────────────────┘
```

---

### **Training History Tab** (Workout Log & Volume Analysis)
**Focus:** What athlete has done, training load, volume tracking

#### Section 1: Workout Log (Existing)
- Calendar view with completed workouts
- Filter by date range, category, status
- Click to see workout details

#### Section 2: Volume Over Time
**By Exercise or Muscle Group**

**Features:**
- **Bar Chart + Line Overlay:** Volume bars, tonnage line
- **Metric Selection:** Total Reps, Total Sets, Tonnage (sets × reps × weight)
- **Exercise Filter:** Specific exercise or muscle group
- **Rolling Average:** 7-day, 14-day, 30-day moving average

**Example:**
```
┌─────────────────────────────────────────────┐
│ 📈 Volume - Bench Press                     │
│ Metric: Tonnage [Total Sets] [Total Reps]  │
│                                             │
│  15000 lbs                                  │
│  12000 lbs     ▓▓▓                          │
│   9000 lbs   ▓▓▓ ▓▓▓ ▓▓▓                    │
│   6000 lbs ▓▓▓   ▓▓▓ ▓▓▓ ▓▓▓                │
│   3000 lbs                                  │
│           W1  W2  W3  W4  W5                │
│                                             │
│ Avg Weekly Volume: 10,450 lbs              │
│ This Week: 12,300 lbs (+18%)               │
└─────────────────────────────────────────────┘
```

#### Section 3: Training Frequency Heatmap
**GitHub-style contribution calendar**

**Features:**
- **Heatmap:** Color intensity = workout count or volume
- **Hover:** Shows details (2 workouts, 45 min total)
- **Streak Tracker:** Current streak, longest streak
- **Rest Day Indicators:** Intentional vs missed

**Example:**
```
┌─────────────────────────────────────────────┐
│ 🗓️ Training Frequency - Last 90 Days       │
│                                             │
│ Mon  ░░▓░░▓▓░░░▓▓░▓                        │
│ Wed  ░▓▓░▓░░▓▓░░▓░░                        │
│ Fri  ▓▓░▓▓▓░░▓░▓▓▓░                        │
│                                             │
│ Current Streak: 5 days                     │
│ Longest Streak: 12 days                    │
│ Total Workouts: 42 in 90 days              │
└─────────────────────────────────────────────┘
```

---

## Additional Features Elite Apps Have

### 1. **Performance Metrics Dashboard**
**What Elite Apps Track:**
- **Velocity-Based Training (VBT):** Bar speed for auto-regulating load
- **Rate of Perceived Exertion (RPE):** Track how hard workouts feel
- **Readiness Score:** Daily readiness based on sleep, soreness, mood
- **Fatigue Index:** Acute:Chronic Workload Ratio (injury risk)
- **1RM Calculator:** Predict 1RM from submaximal lifts
- **Isometric Mid-Thigh Pull:** For explosive power tracking

**Our Implementation:**
- ✅ Already have: Max tracking, auto-logging
- 🔄 Add: RPE logging per exercise
- 🔄 Add: Readiness check-in at workout start
- 🔄 Add: Fatigue monitoring (acute vs chronic load)

### 2. **Comparison & Benchmarking**
**What Elite Apps Have:**
- **Normative Data:** Compare to position-specific benchmarks
- **Team Averages:** See where athlete ranks on team
- **Progress Goals:** Set targets, track progress to goal
- **Percentile Ranking:** "You're in 85th percentile for exit velo"

**Example:**
```
┌─────────────────────────────────────────────┐
│ 📊 Bench Press vs Team (Pitchers)          │
│                                             │
│  Your Max: 225 lbs  (72nd percentile)      │
│  Team Avg: 210 lbs                         │
│  Team Max: 275 lbs                         │
│  Position Avg: 215 lbs                     │
│                                             │
│  [●─────────────────○──────] Goal: 250 lbs │
│  90 lbs to go (10 weeks estimated)         │
└─────────────────────────────────────────────┘
```

### 3. **Exercise-Specific Analytics**
**Per Exercise Deep Dive:**
- **Rep Max Calculator:** Show estimated 1RM, 3RM, 5RM from any set
- **Load Distribution:** Pie chart of weight ranges (heavy/medium/light days)
- **Set-to-Set Consistency:** Chart showing drop-off across sets
- **Rest Time Analysis:** Average rest between sets
- **Velocity Profiles:** Force-velocity curve for power exercises

### 4. **Injury Risk & Recovery**
**What Elite Apps Track:**
- **Acute:Chronic Workload Ratio:** Spike detection
- **Muscle Group Imbalances:** Push/pull ratio, bilateral deficits
- **Range of Motion Tracking:** Flexibility trends
- **Soreness Heatmap:** Body diagram showing soreness levels
- **Return to Play Protocol:** Progressive load tracking post-injury

### 5. **Video Analysis Integration**
**Elite Features:**
- **Form Check Videos:** Upload set video, annotate
- **Side-by-Side Comparison:** Compare to previous or coach demo
- **Bar Path Analysis:** For Olympic lifts
- **Velocity Tracking:** Video-based bar speed analysis

### 6. **Periodization Planning**
**What Elite Apps Show:**
- **Mesocycle View:** Current phase (Hypertrophy, Strength, Power, Peaking)
- **Deload Recommendations:** Auto-suggest based on fatigue
- **Progressive Overload Tracking:** Visual of load progression
- **Block Periodization:** Color-code different training phases

### 7. **Workout Insights & AI Recommendations**
**Smart Features:**
- **Auto-Suggested Weights:** "Based on last session, try 185 lbs today"
- **Readiness-Adjusted Targets:** Lower targets on low-readiness days
- **Exercise Substitutions:** "Bench press unavailable? Try floor press"
- **Recovery Recommendations:** "High fatigue - consider active recovery"

---

## Recommended Implementation Priority

### Phase 1: Core Analytics (Foundation)
1. ✅ **PR List with Filters** (DONE)
2. 🔄 **Max Trend Charts** (Line charts with time filters)
3. 🔄 **Volume Over Time** (Bar charts, exercise selection)
4. 🔄 **Training Frequency Heatmap**

### Phase 2: Advanced Metrics
5. **RPE Logging** (Add to workout logger)
6. **Readiness Check-In** (Quick survey before workout)
7. **Fatigue Monitoring** (Acute:Chronic ratio calculation)
8. **1RM Calculator** (Based on submaximal lifts)

### Phase 3: Comparisons & Goals
9. **Team Benchmarking** (Compare to team averages)
10. **Goal Setting & Tracking** (Target PRs, progress bars)
11. **Exercise Deep Dive** (Per-exercise analytics page)

### Phase 4: Advanced Features
12. **Video Integration** (Upload form checks)
13. **Periodization View** (Training phase calendar)
14. **AI Recommendations** (Smart weight suggestions)

---

## Data Structure Needed

### New Tables to Consider:

#### `readiness_logs`
```sql
- athlete_id
- logged_at
- sleep_quality (1-10)
- soreness_level (1-10)
- stress_level (1-10)
- mood (1-10)
- readiness_score (calculated)
```

#### `exercise_logs` (extend existing)
```sql
- Add: rpe (Rate of Perceived Exertion 1-10)
- Add: bar_velocity (m/s for VBT)
- Add: video_url (form check video)
- Add: rest_seconds (actual rest taken)
```

#### `athlete_goals`
```sql
- athlete_id
- exercise_id
- metric_id
- target_value
- target_date
- created_at
- achieved_at
```

#### `team_benchmarks`
```sql
- organization_id
- exercise_id
- metric_id
- position (optional: "pitcher", "catcher", etc.)
- percentile_50 (median)
- percentile_75
- percentile_90
```

---

## Chart Library Recommendation

**Best Options:**
1. **Recharts** (React-native, responsive, good for line/bar charts)
2. **Chart.js with react-chartjs-2** (More customizable, great docs)
3. **Tremor** (Tailwind-native, beautiful defaults, fast setup)
4. **Victory** (Highly customizable, React-native, animations)

**Recommendation: Tremor**
- Built for Tailwind (matches our stack)
- Beautiful defaults (less custom styling)
- Fast implementation
- Good for dashboards

---

## Summary: Your Questions Answered

### What should go where?

**Performance & KPI Tab:**
- Personal Records (current maxes)
- Max Trend Charts (PRs over time)
- Velocity Tracking (ball weight comparisons)
- Current capabilities focus

**Training History Tab:**
- Workout Log (calendar view)
- Volume Over Time (training load)
- Frequency Heatmap (consistency)
- What athlete has done focus

### What's missing from elite apps?

1. **Fatigue Monitoring** (Acute:Chronic Workload Ratio)
2. **Team Benchmarking** (percentile rankings)
3. **Readiness Tracking** (daily check-ins)
4. **Goal Setting** (target PRs with progress bars)
5. **RPE Logging** (how hard exercises feel)
6. **Video Form Checks** (upload and annotate)
7. **Exercise Deep Dives** (per-exercise analytics page)
8. **1RM Calculator** (estimate from submaximal)
9. **Periodization View** (training phase visualization)
10. **AI Recommendations** (smart weight suggestions)

### Timeline Estimate:
- **Phase 1 (Core Analytics):** 2-3 weeks
- **Phase 2 (Advanced Metrics):** 1-2 weeks
- **Phase 3 (Comparisons):** 1-2 weeks
- **Phase 4 (Advanced Features):** 2-3 weeks

**Total:** 6-10 weeks for complete system
