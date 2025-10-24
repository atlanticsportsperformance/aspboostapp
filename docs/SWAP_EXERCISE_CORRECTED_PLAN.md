# Swap/Replace Exercise Feature - CORRECTED Implementation Plan

## ✅ CORRECT Understanding

When swapping/replacing an exercise, **ALL programming details stay exactly the same**. We ONLY change which exercise it is.

### Example (Correct):
```
BEFORE SWAP:
  Placeholder "Lower Body Power"
  - 3 sets x 8 reps @ 75% 1RM
  - 90s rest
  - Note: "Focus on explosiveness"

AFTER SWAP (replace with Power Clean):
  Power Clean
  - 3 sets x 8 reps @ 75% 1RM  ✅ SAME
  - 90s rest                    ✅ SAME
  - Note: "Focus on explosiveness" ✅ SAME
  - exercise_id: [new_id]      ⬅️ ONLY THIS CHANGES
  - is_placeholder: false       ⬅️ AND THIS
```

### What Exercise.com Does (Our Model)

From the conversation summary, you mentioned:
> "the way that exercise.com does their switch is that **no matter what exercise is switched into the one before it inherits the sets and reps and metrics that were already there**"

This is the correct behavior we need to implement.

---

## Simplified Swap Logic

### Database Update (Simple!)

```typescript
async function handleSwapExercise(
  exerciseId: string,      // routine_exercise.id (the row we're updating)
  newExerciseId: string,   // new exercise.id (the exercise we're swapping to)
  newExercise: Exercise    // new exercise object (for enabled_measurements)
) {
  // Get the new exercise's available measurements
  const newMeasurements = newExercise.metric_schema?.measurements || [];
  const newMeasurementIds = newMeasurements.map(m => m.id);

  // Update ONLY the exercise reference and enabled_measurements
  const { error } = await supabase
    .from('routine_exercises')
    .update({
      exercise_id: newExerciseId,         // ⬅️ Point to new exercise
      is_placeholder: false,               // ⬅️ No longer a placeholder
      placeholder_id: null,                // ⬅️ Clear placeholder data
      placeholder_name: null,              // ⬅️ Clear placeholder data
      enabled_measurements: newMeasurementIds  // ⬅️ Update available measurements

      // ✅ KEEP EVERYTHING ELSE:
      // - sets (stays same)
      // - metric_targets (stays same - values like 8 reps, 75%, etc.)
      // - intensity_targets (stays same)
      // - set_configurations (stays same)
      // - rest_seconds (stays same)
      // - notes (stays same)
      // - is_amrap (stays same)
      // - tempo (stays same)
    })
    .eq('id', exerciseId);

  if (error) {
    console.error('Error swapping exercise:', error);
    alert('Failed to replace exercise');
    return;
  }

  // Refresh the UI
  await fetchWorkout();
}
```

### That's It!

No compatibility checking needed. No filtering measurements. Just swap the exercise reference and let the UI handle displaying the measurements based on `enabled_measurements`.

---

## Why This Works

### The Architecture Already Supports This

1. **`metric_targets`** stores generic key-value pairs:
   ```json
   {
     "reps": 8,
     "weight": 225,
     "distance": 100
   }
   ```
   These values don't care what exercise they're attached to!

2. **`enabled_measurements`** tells the UI which inputs to show:
   ```json
   ["reps", "weight"]
   ```
   When we swap exercises, we update this to match the new exercise's schema.

3. **The UI renders inputs dynamically** based on `enabled_measurements`:
   - If new exercise has "reps", show reps input with value from `metric_targets.reps`
   - If new exercise has "distance", show distance input with value from `metric_targets.distance`
   - If new exercise doesn't have "weight", that input just doesn't appear (but value stays in database)

### Example: Box Jump → Broad Jump

```
BEFORE (Box Jump):
  enabled_measurements: ["reps", "height"]
  metric_targets: { reps: 10, height: 24 }

  UI shows:
    Reps: [10]
    Height: [24]

AFTER SWAP (Broad Jump):
  enabled_measurements: ["reps", "distance"]  ⬅️ Updated
  metric_targets: { reps: 10, height: 24 }    ⬅️ Unchanged!

  UI shows:
    Reps: [10]           ✅ Still there!
    Distance: [ ]         ⬅️ New field (blank)

  Height value (24) still in database, just not displayed
```

### User Can Fix Incompatible Measurements

If they swap to an exercise with different measurements, they just:
1. See the compatible values still filled in (reps, sets, rest, etc.)
2. See blank inputs for new measurement types
3. Fill in the blanks manually

**No warnings needed!** The user can see what needs to be filled.

---

## Updated Implementation Plan

### Step 1: Create Swap Dialog (20 mins)

**File**: `components/dashboard/workouts/swap-exercise-dialog.tsx`

Just a simple exercise picker - no compatibility checking!

```typescript
interface SwapExerciseDialogProps {
  onSwap: (exerciseId: string, exercise: Exercise) => void;
  onClose: () => void;
}

export function SwapExerciseDialog({ onSwap, onClose }: SwapExerciseDialogProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');

  // Fetch exercises (same as add-exercise-dialog)
  // Search/filter exercises
  // Click exercise → calls onSwap(exercise.id, exercise)

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      {/* Search bar */}
      {/* Exercise list */}
      {/* Select button */}
    </div>
  );
}
```

### Step 2: Add Button Handler (5 mins)

**File**: `components/dashboard/workouts/exercise-detail-panel.tsx`

```typescript
interface ExerciseDetailPanelProps {
  routine: Routine | null;
  exercise: RoutineExercise | null;
  onUpdate: (updates: Partial<RoutineExercise>) => void;
  onDelete: () => void;
  onSwap: (newExerciseId: string, newExercise: Exercise) => void; // NEW
}

export default function ExerciseDetailPanel({
  routine,
  exercise,
  onUpdate,
  onDelete,
  onSwap
}: ExerciseDetailPanelProps) {
  const [showSwapDialog, setShowSwapDialog] = useState(false);

  // Update button (around line 220)
  <button
    onClick={() => setShowSwapDialog(true)}  // ⬅️ ADD THIS
    className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
    title="Replace Exercise"
  >
    <span className="text-lg">↻</span>
  </button>

  // Add dialog at end
  {showSwapDialog && (
    <SwapExerciseDialog
      onSwap={(newExerciseId, newExercise) => {
        onSwap(newExerciseId, newExercise);
        setShowSwapDialog(false);
      }}
      onClose={() => setShowSwapDialog(false)}
    />
  )}
}
```

### Step 3: Implement Swap in Workout Builder (10 mins)

**File**: `app/dashboard/workouts/[id]/page.tsx`

```typescript
async function handleSwapExercise(
  newExerciseId: string,
  newExercise: Exercise
) {
  if (!selectedExerciseId) return;

  // Get new exercise's measurements
  const newMeasurements = newExercise.metric_schema?.measurements || [];
  const newMeasurementIds = newMeasurements.map(m => m.id);

  // Simple update - just change exercise reference
  const { error } = await supabase
    .from('routine_exercises')
    .update({
      exercise_id: newExerciseId,
      is_placeholder: false,
      placeholder_id: null,
      placeholder_name: null,
      enabled_measurements: newMeasurementIds
    })
    .eq('id', selectedExerciseId);

  if (error) {
    console.error('Error swapping exercise:', error);
    alert('Failed to replace exercise');
    return;
  }

  await fetchWorkout();
}

// Pass to ExerciseDetailPanel
<ExerciseDetailPanel
  routine={selectedRoutine}
  exercise={selectedExercise}
  onUpdate={handleUpdateExercise}
  onDelete={handleDeleteExercise}
  onSwap={handleSwapExercise}  // ⬅️ ADD THIS
/>
```

### Step 4: Copy to Routine Builder (5 mins)

**File**: `app/dashboard/routines/[id]/page.tsx`

Same function, same pattern.

### Step 5: Copy to Plan Workout Builder (5 mins)

**File**: `components/dashboard/plans/workout-builder-modal.tsx`

Same function, same pattern.

---

## Total Time: ~45 minutes

Much simpler than the original plan!

---

## What Happens in Different Scenarios

### Scenario 1: Placeholder → Real Exercise
```
BEFORE:
  [TBD Exercise] - 3x8 @ 75%
  metric_targets: { reps: 8 }
  enabled_measurements: ["reps"]

AFTER (swap to Power Clean):
  Power Clean - 3x8 @ 75%
  metric_targets: { reps: 8 }         ⬅️ SAME
  enabled_measurements: ["reps", "weight"]  ⬅️ Updated

UI NOW SHOWS:
  Reps: [8]      ✅ Preserved
  Weight: [ ]     ⬅️ User fills this in
```

### Scenario 2: Exercise → Different Exercise (Compatible)
```
BEFORE (Back Squat):
  3x8 @ 185 lbs
  metric_targets: { reps: 8, weight: 185 }
  enabled_measurements: ["reps", "weight"]

AFTER (Front Squat):
  3x8 @ 185 lbs  ✅ ALL SAME!
  metric_targets: { reps: 8, weight: 185 }
  enabled_measurements: ["reps", "weight"]
```

### Scenario 3: Exercise → Different Exercise (Incompatible)
```
BEFORE (Box Jump):
  3x10, 24" height
  metric_targets: { reps: 10, height: 24 }
  enabled_measurements: ["reps", "height"]

AFTER (Broad Jump):
  metric_targets: { reps: 10, height: 24 }  ⬅️ SAME (height value still in DB)
  enabled_measurements: ["reps", "distance"]  ⬅️ Updated

UI NOW SHOWS:
  Reps: [10]      ✅ Preserved
  Distance: [ ]    ⬅️ User fills this in
  (Height input hidden, but value still in DB in case they swap back)
```

---

## Files to Create/Modify

### New Files (1)
✨ `components/dashboard/workouts/swap-exercise-dialog.tsx`

### Modified Files (4)
📝 `components/dashboard/workouts/exercise-detail-panel.tsx` - Add button handler
📝 `app/dashboard/workouts/[id]/page.tsx` - Add swap function
📝 `app/dashboard/routines/[id]/page.tsx` - Add swap function
📝 `components/dashboard/plans/workout-builder-modal.tsx` - Add swap function

---

## Testing Checklist

- [ ] Swap placeholder → real exercise (values preserved)
- [ ] Swap exercise → different exercise (same measurements)
- [ ] Swap exercise → different measurements (reps stay, new metrics blank)
- [ ] Swap exercise with intensity targets (targets preserved)
- [ ] Swap exercise with AMRAP (AMRAP flag preserved)
- [ ] Swap exercise with set-by-set config (config preserved)
- [ ] Swap exercise with notes (notes preserved)
- [ ] Cancel swap (no changes)
- [ ] Works in workout builder
- [ ] Works in routine builder
- [ ] Works in plan workout builder

---

## Success Criteria

✅ Swap changes only `exercise_id`, `is_placeholder`, and `enabled_measurements`
✅ All programming details (sets, reps, intensity, rest, notes) stay the same
✅ UI updates immediately to show new exercise
✅ Compatible measurements display with existing values
✅ Incompatible measurements show blank (user fills in)
✅ No data loss - old measurement values stay in database
✅ Works across all three builders

---

## Summary

**The Fix**: We were overcomplicating it! Just update the exercise reference and let the existing UI logic handle displaying the right inputs. All values stay the same - exactly like Exercise.com does it.

**Why It Works**: Our architecture with `metric_targets` (generic values) + `enabled_measurements` (what to show) already supports this perfectly.

**Implementation**: Much simpler - just 5 small updates across existing files.
