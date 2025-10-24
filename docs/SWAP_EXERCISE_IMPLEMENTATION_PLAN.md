# Swap/Replace Exercise Feature - Implementation Plan

## Current State Analysis

### What Exists
✅ **Button UI**: The "Replace Exercise" button (↻) exists in `exercise-detail-panel.tsx` (line 218-223)
✅ **Visual Element**: Button has proper styling and tooltip
❌ **No Functionality**: Button has no `onClick` handler
❌ **No Dialog Component**: The `swap-exercise-dialog.tsx` component mentioned in docs **does not exist**
❌ **No Handler Logic**: No swap/replace functions in workout or routine builders

### What Was Documented (But Never Built)
According to PROJECT_SUMMARY.md, the feature should:
- Allow clicking exercise → swap button
- Open dialog to select replacement from library
- **Preserve measurements** (sets, reps, intensity, rest, notes)
- Update `exercise_id` in `routine_exercises`
- Update `enabled_measurements` to match new exercise's schema
- Keep measurement values if compatible

---

## Feature Requirements

### User Story
**As a coach**, I want to replace an exercise in a routine/workout with a different exercise **while preserving all the programming details** (sets, reps, weight, intensity, rest periods, notes), so I don't have to reconfigure everything from scratch.

### Use Cases

#### Use Case 1: Direct Swap (Compatible Measurements)
```
Current: Barbell Back Squat - 4x8 @ 75% 1RM, 3 min rest
Replace with: Front Squat - 4x8 @ 75% 1RM, 3 min rest
Result: All settings transfer perfectly (both use reps + weight)
```

#### Use Case 2: Incompatible Measurements
```
Current: Box Jumps - 3x10 reps, 24" height
Replace with: Broad Jump - 3x10 reps, 8 ft distance
Result:
  - Sets (3) transfers ✅
  - Reps (10) transfers ✅
  - Height measurement gets dropped (incompatible) ⚠️
  - Distance measurement is blank (new metric) ⚠️
  - User gets warning about incompatible measurements
```

#### Use Case 3: Placeholder Replacement
```
Current: [TBD - Lower Body Power] - 3x5, unspecified measurements
Replace with: Power Clean - 3x5, now has weight metric
Result:
  - Sets and reps transfer ✅
  - Measurements get activated ✅
  - is_placeholder changes to false ✅
```

---

## Technical Implementation Plan

### Phase 1: Create Swap Exercise Dialog Component

**File**: `components/dashboard/workouts/swap-exercise-dialog.tsx`

**Features**:
- Modal dialog that overlays current view
- Search bar to filter exercises
- Category filter dropdown
- Tag filter
- Exercise list (similar to `add-exercise-dialog.tsx`)
- Shows exercise details on hover/selection
- **Warning badge** if measurements are incompatible
- "Replace" button (disabled until exercise selected)
- "Cancel" button

**Key Logic**:
```typescript
interface SwapExerciseDialogProps {
  currentExercise: RoutineExercise;
  onSwap: (newExerciseId: string, newExercise: Exercise) => void;
  onClose: () => void;
}

function checkMeasurementCompatibility(
  currentMeasurements: string[],
  newMeasurements: Measurement[]
): {
  compatible: string[];      // Measurements that exist in both
  dropped: string[];          // Current measurements that will be lost
  new: string[];             // New measurements that will be blank
}
```

**UI Flow**:
1. User clicks ↻ button on exercise
2. Dialog opens showing exercise library
3. User searches/filters for replacement
4. User selects replacement
5. System shows compatibility warning (if applicable)
6. User clicks "Replace"
7. System updates database
8. Dialog closes, UI refreshes with new exercise

---

### Phase 2: Add Swap Handler to Exercise Detail Panel

**File**: `components/dashboard/workouts/exercise-detail-panel.tsx`

**Changes**:
```typescript
interface ExerciseDetailPanelProps {
  // ... existing props
  onSwap: (newExerciseId: string, newExercise: Exercise) => void; // NEW
}

export default function ExerciseDetailPanel({
  routine,
  exercise,
  onUpdate,
  onDelete,
  onSwap  // NEW
}: ExerciseDetailPanelProps) {
  const [showSwapDialog, setShowSwapDialog] = useState(false);

  // Add onClick handler to button (line ~220)
  <button
    onClick={() => setShowSwapDialog(true)}
    className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
    title="Replace Exercise"
  >
    <span className="text-lg">↻</span>
  </button>

  // Render dialog
  {showSwapDialog && (
    <SwapExerciseDialog
      currentExercise={exercise}
      onSwap={(newExerciseId, newExercise) => {
        onSwap(newExerciseId, newExercise);
        setShowSwapDialog(false);
      }}
      onClose={() => setShowSwapDialog(false)}
    />
  )}
}
```

---

### Phase 3: Implement Swap Logic in Workout Builder

**File**: `app/dashboard/workouts/[id]/page.tsx`

**New Function**: `handleSwapExercise`

```typescript
async function handleSwapExercise(
  exerciseId: string,           // routine_exercise.id
  newExerciseId: string,         // new exercise.id
  newExercise: Exercise
) {
  if (!workout) return;

  // Find the current exercise configuration
  const currentExercise = workout.routines
    .flatMap(r => r.routine_exercises)
    .find(e => e.id === exerciseId);

  if (!currentExercise) return;

  // Get current measurements
  const currentMeasurements = currentExercise.enabled_measurements || [];

  // Get new exercise's available measurements
  const newMeasurements = newExercise.metric_schema?.measurements || [];
  const newMeasurementIds = newMeasurements.map(m => m.id);

  // Determine which measurements transfer
  const compatibleMeasurements = currentMeasurements.filter(m =>
    newMeasurementIds.includes(m)
  );

  // Build new metric_targets (only keep compatible values)
  const newMetricTargets: Record<string, any> = {};
  if (currentExercise.metric_targets) {
    Object.entries(currentExercise.metric_targets).forEach(([key, value]) => {
      if (compatibleMeasurements.includes(key)) {
        newMetricTargets[key] = value;
      }
    });
  }

  // Build new set_configurations (preserve but filter incompatible metrics)
  let newSetConfigs = currentExercise.set_configurations;
  if (newSetConfigs && Array.isArray(newSetConfigs)) {
    newSetConfigs = newSetConfigs.map(set => {
      const newMetricValues: Record<string, any> = {};
      if (set.metric_values) {
        Object.entries(set.metric_values).forEach(([key, value]) => {
          if (compatibleMeasurements.includes(key)) {
            newMetricValues[key] = value;
          }
        });
      }
      return {
        ...set,
        metric_values: newMetricValues
      };
    });
  }

  // Update in database
  const { error } = await supabase
    .from('routine_exercises')
    .update({
      exercise_id: newExerciseId,
      is_placeholder: false,
      placeholder_id: null,
      placeholder_name: null,
      enabled_measurements: compatibleMeasurements,
      metric_targets: newMetricTargets,
      set_configurations: newSetConfigs
      // Keep: sets, rest_seconds, notes, intensity_targets, is_amrap, tempo
    })
    .eq('id', exerciseId);

  if (error) {
    console.error('Error swapping exercise:', error);
    alert('Failed to replace exercise');
    return;
  }

  // Refresh workout data
  await fetchWorkout();
}
```

**Pass to ExerciseDetailPanel**:
```typescript
<ExerciseDetailPanel
  routine={selectedRoutine}
  exercise={selectedExercise}
  onUpdate={handleUpdateExercise}
  onDelete={handleDeleteExercise}
  onSwap={(newExerciseId, newExercise) =>
    handleSwapExercise(selectedExercise.id, newExerciseId, newExercise)
  }
/>
```

---

### Phase 4: Implement Same Logic in Routine Builder

**File**: `app/dashboard/routines/[id]/page.tsx`

**Add Same Function**: Copy `handleSwapExercise` from workout builder (identical logic)

**Pass to ExerciseDetailPanel**: Same pattern as workout builder

---

### Phase 5: Implement Same Logic in Plan Workout Builder

**File**: `components/dashboard/plans/workout-builder-modal.tsx`

**Add Same Function**: Copy `handleSwapExercise` logic

**Pass to ExerciseDetailPanel**: Same pattern

---

## Measurement Compatibility Matrix

### Preserved Fields (Always Transfer)
✅ `sets` - Always compatible
✅ `rest_seconds` - Always compatible
✅ `notes` - Always compatible
✅ `tempo` - Always compatible
✅ `is_amrap` - Always compatible
✅ `intensity_targets` - Only if target metric exists in new exercise

### Conditional Fields (Filter by Compatibility)
⚠️ `enabled_measurements` - Only keep measurements that exist in new exercise
⚠️ `metric_targets` - Only keep targets for compatible measurements
⚠️ `set_configurations.metric_values` - Only keep compatible metric values

### Example Scenarios

#### Scenario 1: Squat → Front Squat
```
Old measurements: ['reps', 'weight']
New measurements: ['reps', 'weight', 'tempo']

Result:
  ✅ Keep: reps, weight values
  ⚠️ Add: tempo (blank)
  Compatible: 100%
```

#### Scenario 2: Box Jump → Broad Jump
```
Old measurements: ['reps', 'height']
New measurements: ['reps', 'distance']

Result:
  ✅ Keep: reps value
  ❌ Drop: height value
  ⚠️ Add: distance (blank)
  Compatible: 50%
```

#### Scenario 3: Bench Press → Plank
```
Old measurements: ['reps', 'weight']
New measurements: ['time']

Result:
  ❌ Drop: reps, weight values
  ⚠️ Add: time (blank)
  Compatible: 0%
```

---

## UI/UX Considerations

### Confirmation Dialog for Low Compatibility
If compatibility < 75%, show warning:

```
⚠️ Measurement Mismatch Warning

Replacing "Box Jumps" with "Broad Jump" will result in:
  ✅ Preserved: 3 sets, 10 reps, 90s rest
  ❌ Lost: Height (24")
  ⚠️ Blank: Distance (you'll need to set this)

Continue with replacement?
  [Cancel] [Replace Anyway]
```

### Visual Indicators in Dialog
- **Green checkmark**: Fully compatible (100%)
- **Yellow warning**: Partial compatibility (50-99%)
- **Red alert**: Low compatibility (<50%)

---

## Testing Checklist

### Test Cases
- [ ] Swap exercise with 100% compatible measurements
- [ ] Swap exercise with partial compatibility (some measurements lost)
- [ ] Swap exercise with 0% compatibility (all measurements lost)
- [ ] Swap placeholder with real exercise
- [ ] Swap exercise that has intensity targets
- [ ] Swap exercise that has AMRAP enabled
- [ ] Swap exercise with set-by-set configurations
- [ ] Swap exercise with notes (should preserve)
- [ ] Cancel swap dialog (should not change anything)
- [ ] Swap in workout builder
- [ ] Swap in routine builder
- [ ] Swap in plan workout builder modal

---

## Implementation Order

### Step 1: Create Swap Dialog Component (30 mins)
- Copy structure from `add-exercise-dialog.tsx`
- Modify to single-select (not multi)
- Add compatibility checking logic
- Add warning badges

### Step 2: Add to Workout Builder (20 mins)
- Create `handleSwapExercise` function
- Wire up to ExerciseDetailPanel
- Test thoroughly

### Step 3: Add to Routine Builder (10 mins)
- Copy function from workout builder
- Wire up to ExerciseDetailPanel
- Test

### Step 4: Add to Plan Workout Builder (10 mins)
- Copy function to modal component
- Wire up to ExerciseDetailPanel
- Test

### Step 5: Polish & Edge Cases (20 mins)
- Add loading states
- Add error handling
- Add confirmation dialogs for low compatibility
- Test all edge cases

**Total Estimated Time**: ~90 minutes

---

## Files to Create/Modify

### New Files (1)
- ✨ `components/dashboard/workouts/swap-exercise-dialog.tsx`

### Modified Files (4)
- 📝 `components/dashboard/workouts/exercise-detail-panel.tsx`
- 📝 `app/dashboard/workouts/[id]/page.tsx`
- 📝 `app/dashboard/routines/[id]/page.tsx`
- 📝 `components/dashboard/plans/workout-builder-modal.tsx`

---

## Success Criteria

✅ User can click ↻ button on any exercise
✅ Dialog opens with searchable exercise library
✅ User can select replacement exercise
✅ System warns if measurements are incompatible
✅ Replacement updates database correctly
✅ Sets, reps, rest, notes, intensity all preserve
✅ Incompatible measurements are cleanly removed
✅ UI refreshes immediately after swap
✅ Works in all three builders (workout, routine, plan)
✅ No data corruption or orphaned records

---

## Future Enhancements (Post-MVP)

### Nice-to-Have Features
1. **Exercise preview comparison**: Side-by-side view of old vs. new exercise
2. **Measurement mapping**: Allow user to manually map incompatible measurements
3. **Swap history**: Track exercise swaps for undo functionality
4. **Bulk swap**: Replace exercise across multiple routines at once
5. **Smart suggestions**: Suggest similar exercises based on category/tags
6. **Copy option**: Instead of replace, create duplicate with new exercise

---

## Summary

**Current Problem**: The "Replace Exercise" button exists but does nothing.

**Solution**: Build the complete swap exercise feature with:
1. New dialog component for selecting replacement
2. Swap logic that preserves compatible configuration
3. Warnings for incompatible measurements
4. Integration across all three builders

**Complexity**: Medium (requires careful data handling)

**Value**: HIGH - This is a core feature for efficient workout programming. Coaches frequently need to make exercise substitutions without losing programming details.

**Ready to Implement**: Yes - All requirements are clear, architecture is defined, and implementation path is straightforward.
