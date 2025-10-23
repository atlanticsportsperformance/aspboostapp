# Measurements & AMRAP Implementation Plan

## Overview
Implementing Exercise.com-style per-instance measurement customization and AMRAP functionality.

---

## Database Changes ✅ READY

**Migration created:** `20251023040000_add_measurements_and_amrap.sql`

### New Columns Added to `routine_exercises`:

```sql
-- Per-instance measurement customization
enabled_measurements TEXT[] DEFAULT NULL
  -- NULL = show all from exercise.metric_schema
  -- ['reps', 'weight'] = only show these measurements

-- AMRAP support
is_amrap BOOLEAN DEFAULT false
  -- true = all sets are AMRAP
  -- false = use set_configurations for per-set AMRAP
```

---

## How It Works

### **1. Measurement Selection (Per Instance)**

**Current Problem:**
- Exercises have fixed `metric_schema`
- Can't customize which measurements show per workout

**New Solution:**
```typescript
// Example: Back Squat in Week 1
routine_exercises: {
  exercise_id: 'back-squat-uuid',
  enabled_measurements: ['reps', 'weight'], // Only these show
  metric_targets: { reps: 10, weight: 225 }
}

// Same Back Squat in Week 4 (different measurements)
routine_exercises: {
  exercise_id: 'back-squat-uuid',
  enabled_measurements: ['reps', 'weight', 'time'], // Added time
  metric_targets: { reps: 5, weight: 315, time: 45 }
}
```

**UI:**
```
┌─────────────────────────────────────┐
│ Back Squat                          │
├─────────────────────────────────────┤
│ [Measurements] [AMRAP] [Details]    │ ← Tabs
├─────────────────────────────────────┤
│ Available Measurements:             │
│                                     │
│ ☑ Reps            [  10  ]          │
│ ☑ Weight          [ 225  ] lbs      │
│ ☐ Time            [      ] sec      │
│ ☐ Distance        [      ] ft       │
│                                     │
│ + Add Custom Measurement            │
└─────────────────────────────────────┘
```

**Logic:**
```typescript
function getDisplayMeasurements() {
  const allMeasurements = exercise.exercises?.metric_schema?.measurements || [];

  if (exercise.enabled_measurements) {
    // Filter to only enabled ones
    return allMeasurements.filter(m =>
      exercise.enabled_measurements.includes(m.id)
    );
  }

  // NULL = show all
  return allMeasurements;
}
```

---

### **2. Placeholders Start Empty**

**Updated:**
```typescript
// Placeholder creation (no default metrics)
{
  name: "Main Throwing Exercise",
  category: "throwing",
  is_placeholder: true,
  metric_schema: { measurements: [] } // Empty!
}
```

**When added to workout:**
```typescript
// Coach opens detail panel
// Sees Measurements tab with NO measurements checked
// Clicks checkboxes to add: Reps, Peak Velo, Distance
// enabled_measurements = ['reps', 'peak_velo', 'distance']
```

---

### **3. Exercise Replacement Inherits Everything**

**Before Replacement:**
```typescript
routine_exercises: {
  exercise_id: 'placeholder-uuid',
  enabled_measurements: ['reps', 'peak_velo', 'distance'],
  sets: 3,
  reps_min: 8,
  reps_max: 8,
  metric_targets: { reps: 8, peak_velo: 85, distance: 150 }
}
```

**After Replacing with "Javelin Long Toss":**
```typescript
routine_exercises: {
  exercise_id: 'javelin-long-toss-uuid', // ✅ Changed
  enabled_measurements: ['reps', 'peak_velo', 'distance'], // ✅ Preserved
  sets: 3, // ✅ Preserved
  reps_min: 8, // ✅ Preserved
  reps_max: 8, // ✅ Preserved
  metric_targets: { reps: 8, peak_velo: 85, distance: 150 } // ✅ Preserved
}
```

**Only `exercise_id` changes!**

---

### **4. AMRAP Functionality**

**Two Modes:**

#### **A. All Sets AMRAP (Simple)**
```typescript
routine_exercises: {
  is_amrap: true,
  sets: 3
}
```

UI:
```
┌─────────────────────────────────────┐
│ [Measurements] [AMRAP] [Details]    │
├─────────────────────────────────────┤
│ AMRAP Mode:                         │
│                                     │
│ ☑ All Sets AMRAP                    │
│                                     │
│ Sets: 3                             │
│ Rest: 90 seconds                    │
└─────────────────────────────────────┘
```

#### **B. Per-Set AMRAP (Advanced)**
```typescript
routine_exercises: {
  is_amrap: false,
  set_configurations: [
    { set_number: 1, reps: 10, is_amrap: false },
    { set_number: 2, reps: 8, is_amrap: false },
    { set_number: 3, is_amrap: true, reps: null } // Last set AMRAP
  ]
}
```

UI:
```
┌─────────────────────────────────────┐
│ [Measurements] [AMRAP] [Details]    │
├─────────────────────────────────────┤
│ ☐ All Sets AMRAP                    │
│                                     │
│ Per-Set Configuration:              │
│ Set 1: [10 reps] ☐ AMRAP            │
│ Set 2: [ 8 reps] ☐ AMRAP            │
│ Set 3: [-- reps] ☑ AMRAP ← Last set │
└─────────────────────────────────────┘
```

---

## Implementation Tasks

### **Phase 1: Database** ✅
- [x] Create migration
- [ ] Run migration in Supabase

### **Phase 2: Exercise Detail Panel**
- [ ] Remove "Each Side" tab (move to exercise builder)
- [ ] Update tab state: `'measurements' | 'amrap'`
- [ ] Build Measurements Tab:
  - [ ] Fetch all measurements from `exercise.exercises.metric_schema`
  - [ ] Show checkboxes (checked if in `enabled_measurements`)
  - [ ] Toggle adds/removes from `enabled_measurements` array
  - [ ] Only show input fields for checked measurements
- [ ] Build AMRAP Tab:
  - [ ] "All Sets AMRAP" toggle
  - [ ] Per-set checkboxes (if not all sets)
  - [ ] Update `is_amrap` and `set_configurations`

### **Phase 3: Placeholder Updates**
- [x] Remove default metric schema creation
- [ ] Ensure empty metric_schema on creation

### **Phase 4: Replace Exercise Dialog**
- [ ] Build dialog component
- [ ] Preserve `enabled_measurements` during replacement
- [ ] Preserve `is_amrap` and `set_configurations`
- [ ] Plan-scoped replacement option

---

## Code Snippets

### **Toggle Measurement**
```typescript
function toggleMeasurement(measurementId: string) {
  const current = exercise.enabled_measurements || [];

  if (current.includes(measurementId)) {
    // Remove
    const updated = current.filter(id => id !== measurementId);
    onUpdate({ enabled_measurements: updated.length > 0 ? updated : null });
  } else {
    // Add
    onUpdate({ enabled_measurements: [...current, measurementId] });
  }
}
```

### **Toggle All Sets AMRAP**
```typescript
function toggleAllSetsAMRAP(value: boolean) {
  if (value) {
    // Enable all sets AMRAP
    onUpdate({
      is_amrap: true,
      set_configurations: null // Clear per-set config
    });
  } else {
    // Disable
    onUpdate({ is_amrap: false });
  }
}
```

### **Toggle Per-Set AMRAP**
```typescript
function toggleSetAMRAP(setNumber: number, isAMRAP: boolean) {
  const configs = exercise.set_configurations || [];
  const updated = configs.map(config =>
    config.set_number === setNumber
      ? { ...config, is_amrap: isAMRAP, reps: isAMRAP ? null : config.reps }
      : config
  );

  onUpdate({ set_configurations: updated });
}
```

---

## Testing Checklist

### **Measurements:**
- [ ] Add placeholder to workout
- [ ] Open detail panel → Measurements tab
- [ ] Check "Reps" → input field appears
- [ ] Check "Weight" → input field appears
- [ ] Uncheck "Reps" → input field disappears
- [ ] Values persist when toggling measurements

### **AMRAP:**
- [ ] Toggle "All Sets AMRAP" → all sets become AMRAP
- [ ] Untoggle → back to normal
- [ ] Per-set: check Set 3 only → only Set 3 is AMRAP
- [ ] Switching to "All Sets" clears per-set config

### **Replacement:**
- [ ] Create placeholder with custom measurements
- [ ] Set sets/reps/values
- [ ] Replace with real exercise
- [ ] Verify measurements, values, sets/reps all preserved

---

## Benefits

✅ **Matches Exercise.com UX** - Industry standard
✅ **Maximum Flexibility** - Different measurements per workout
✅ **Clean Replacement** - Everything inherits perfectly
✅ **AMRAP Support** - Both all-sets and per-set modes
✅ **No Breaking Changes** - `enabled_measurements: null` = show all (backwards compatible)

---

## Next Session Start Here:

1. Run the migration in Supabase SQL Editor
2. Update Exercise Detail Panel tabs (remove "Each Side", add Measurements logic)
3. Build Measurements tab UI with checkboxes
4. Build AMRAP tab UI
5. Test workflow: placeholder → add measurements → set values → replace
