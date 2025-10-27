# Perceived Intensity System for Throwing Exercises

## Overview

When prescribing intensity for **throwing exercises**, athletes perceive effort differently than their actual biomechanical output. This system automatically corrects for this discrepancy based on research from Slenker et al (2014) and Wilk et al (2002).

## How It Works

### For THROWING Category Exercises

When a coach prescribes intensity for a throwing exercise:

1. **Coach Input:** Enters desired perceived intensity (e.g., 60%)
2. **Automatic Conversion:** System converts to actual intensity (60% → 80%)
3. **Target Calculation:** Uses corrected intensity with athlete's max
4. **Display:** Shows both perceived and actual values

### For NON-THROWING Exercises

No conversion applied - prescribed intensity is used directly.

---

## Example Scenarios

### Scenario 1: Bullpen Work (Throwing Exercise)

**Setup:**
- Exercise: "Bullpen - 6oz Ball" (category: `throwing`)
- Athlete's Max: 100 mph
- Coach Prescription: 60% intensity

**What Happens:**

1. **In Workout Builder:**
   ```
   ☑ Intensity %: [60]%
   🎯 Throwing: 60% effort → 80% actual (Moderate)
   ```

2. **In Sidebar Summary:**
   ```
   Bullpen - 6oz Ball
   3 Sets, 10 Reps, 60% effort (80% actual)
   ```

3. **Target Calculation:**
   ```
   Perceived: 60%
   Actual: 80% (from correction chart)
   Athlete Max: 100 mph
   Target: 100 × 0.80 = 80 mph
   ```

4. **Athlete Sees:**
   ```
   Target: 80 mph
   (or 78-82 mph range)
   ```

---

### Scenario 2: Weighted Ball Throws (Throwing Exercise)

**Setup:**
- Exercise: "Plyo Ball Throw - 2lb" (category: `throwing`)
- Athlete's Max: 45 mph
- Coach Prescription: 85% intensity

**What Happens:**

1. **In Workout Builder:**
   ```
   ☑ Intensity %: [85]%
   🎯 Throwing: 85% effort → 92% actual (Very Hard)
   ```

2. **Target Calculation:**
   ```
   Perceived: 85%
   Actual: 92%
   Athlete Max: 45 mph
   Target: 45 × 0.92 = 41.4 mph
   ```

---

### Scenario 3: Back Squat (Strength Exercise - NO CORRECTION)

**Setup:**
- Exercise: "Back Squat" (category: `strength_conditioning`)
- Athlete's 1RM: 315 lbs
- Coach Prescription: 60% intensity

**What Happens:**

1. **In Workout Builder:**
   ```
   ☑ Intensity %: [60]%
   (No throwing correction shown)
   ```

2. **Target Calculation:**
   ```
   Prescribed: 60%
   Actual: 60% (NO CONVERSION)
   Athlete Max: 315 lbs
   Target: 315 × 0.60 = 189 lbs
   ```

---

## Perceived to Actual Conversion Chart

| Perceived % | Actual % | Label |
|------------|----------|-------|
| 15% | 35% | Very Light |
| 20% | 40% | Very Light |
| 25% | 45% | Light |
| 30% | 50% | Light |
| 35% | 55% | Moderate |
| 40% | 60% | Moderate |
| 45% | 65% | Moderate |
| 50% | 70% | Moderate |
| 55% | 75% | Hard |
| **60%** | **80%** | **Hard** |
| 65% | 84% | Hard |
| 70% | 86% | Very Hard |
| 75% | 88% | Very Hard |
| 80% | 90% | Very Hard |
| 85% | 92% | Very Hard |
| 90% | 94% | Maximum |
| 95% | 96% | Maximum |
| 100% | 99% | Maximum |

*Chart based on research from Slenker et al (2014), Wilk et al (2002)*

---

## Implementation Details

### Files Modified

1. **`lib/perceived-intensity.ts`** - NEW
   - Conversion chart and helper functions
   - `getActualIntensity(perceived)` - Converts perceived % to actual %
   - `shouldUsePerceivedIntensity(category)` - Checks if exercise is "throwing"
   - `calculateThrowingTarget(max, perceived, category)` - Calculates final target

2. **`components/dashboard/workouts/exercise-detail-panel.tsx`**
   - Shows blue indicator for throwing exercises
   - "🎯 Throwing: 60% effort → 80% actual (Moderate)"
   - Visual feedback in workout builder

3. **`components/dashboard/workouts/workout-sidebar.tsx`**
   - Updates exercise summary display
   - Shows: "60% effort (80% actual)" for throwing
   - Shows: "60% Max Weight" for non-throwing

---

## Usage for Coaches

### Setting Up a Throwing Exercise

1. **Create/Edit Exercise**
   - Set category to `throwing`
   - Add measurements (e.g., "Peak Velocity 6oz")

2. **Prescribe in Workout**
   - Add exercise to workout
   - Enable "Intensity %"
   - Enter desired **perceived** intensity (what you tell the athlete)
   - System automatically converts to actual

3. **Visual Confirmation**
   - Look for blue "🎯 Throwing" indicator
   - Verify actual % matches your intent
   - Example: 60% effort → 80% actual

### Common Prescriptions

**Recovery Day:**
- Perceived: 40-50%
- Actual: 60-70%
- Athlete throws at low-moderate intensity

**Building Velocity:**
- Perceived: 60-70%
- Actual: 80-86%
- Sweet spot for velocity development

**Competition Prep:**
- Perceived: 85-95%
- Actual: 92-96%
- Near-maximal effort

**Max Effort:**
- Perceived: 100%
- Actual: 99%
- All-out throws

---

## Developer Notes

### How to Calculate Targets (for athlete workout view)

```typescript
import { calculateThrowingTarget, getActualIntensity } from '@/lib/perceived-intensity';

// Get athlete's max from athlete_maxes table
const athleteMax = 100; // mph

// Get prescribed intensity from workout
const prescribedPercent = 60; // %

// Get exercise category
const exerciseCategory = 'throwing';

// Calculate target
const target = calculateThrowingTarget(athleteMax, prescribedPercent, exerciseCategory);
// Result: 80 mph (100 × 0.80)

// Or get just the corrected %
const actualPercent = getActualIntensity(prescribedPercent);
// Result: 80
```

### Database Schema

No schema changes needed! The system uses:
- `exercises.category` - Must be "throwing" to trigger correction
- `intensity_targets[].percent` - Stores PERCEIVED % (what coach enters)
- `athlete_maxes` - Fetches athlete's max for target calculation

The correction happens **at display/calculation time**, not in storage.

---

## Testing Checklist

- [x] Create throwing exercise (category: "throwing")
- [x] Add to workout and set intensity to 60%
- [x] Verify workout builder shows "60% effort → 80% actual"
- [x] Verify sidebar shows "60% effort (80% actual)"
- [ ] Open workout as athlete (Phase 2 - when logging is built)
- [ ] Verify target shows 80 mph (not 60 mph) for 100 mph max athlete
- [x] Create strength exercise (category: "strength_conditioning")
- [x] Set intensity to 60%
- [x] Verify NO correction indicator appears
- [x] Verify sidebar shows "60% Max Weight" (no "actual" text)

---

## Future Enhancements

1. **Custom Correction Charts**
   - Allow different charts per sport/population
   - Youth vs Pro athletes may have different curves

2. **Athlete-Specific Adjustments**
   - Track if individual athletes consistently over/under-throw
   - Apply personalized correction factors

3. **Real-Time Feedback**
   - During workout logging, show if athlete is hitting targets
   - "You're throwing at 75 mph (target was 80 mph, -6.25%)"

4. **Analytics**
   - Track perceived vs actual over time
   - Identify fatigue patterns (actual % drops while perceived stays same)
