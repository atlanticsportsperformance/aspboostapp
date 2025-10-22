# Workout Builder - Remaining Tasks

## Critical Issues to Fix

### 1. Database Migrations (MUST RUN FIRST)
Run these SQL files in Supabase SQL Editor:

**a) FIX_WORKOUTS_CONSTRAINTS.sql**
```sql
ALTER TABLE workouts
  ALTER COLUMN day_of_week DROP NOT NULL,
  ALTER COLUMN week_number DROP NOT NULL;
```
**Why**: Allows creating standalone workouts without requiring week/day

**b) ADD_PER_SET_CONFIGURATION.sql**
```sql
ALTER TABLE routine_exercises
  ADD COLUMN IF NOT EXISTS set_configurations jsonb DEFAULT '[]'::jsonb;
```
**Why**: Stores per-set intensity configuration (Set 1: 8 reps @ 60%, Set 2: 10 reps @ 40%, etc.)

---

## Feature Requests to Implement

### 2. Per-Set Intensity Configuration ✅ COMPONENT CREATED
**Status**: Component created (`set-by-set-editor.tsx`) but NOT YET integrated

**Requirements**:
- Set 1: 8 reps @ 60% 1RM
- Set 2: 10 reps @ 40% 1RM
- Each set can have different:
  - Reps
  - Intensity type (% 1RM, RPE, Load, None)
  - Intensity value
  - Time
  - Rest
  - Notes

**Files Created**:
- `/components/dashboard/workouts/set-by-set-editor.tsx` ✅
- `/docs/ADD_PER_SET_CONFIGURATION.sql` ✅

**TODO**:
- [ ] Integrate set-by-set editor into simple-exercise-card.tsx
- [ ] Update interface to include `set_configurations` field
- [ ] Save/load per-set data from database

---

### 3. Superset/Group Notes
**Requirement**: Add notes section for supersets/circuits

**Current State**: Routine table HAS `notes` column but not displayed

**TODO**:
- [ ] Add notes textarea in superset header
- [ ] Auto-save on blur
- [ ] Display notes when superset is collapsed

---

### 4. Add Multiple Exercises at Once
**Requirement**: Select multiple exercises and add them all to workout

**Current State**: Can only add one exercise at a time

**TODO**:
- [ ] Update AddExerciseDialog to support multi-select
- [ ] Add checkboxes to exercise list
- [ ] "Add Selected (N)" button
- [ ] Bulk insert into database

---

### 5. Filter by Tags in Add Exercise Dialog
**Requirement**: Filter exercises by tags when adding

**Current State**: Only has category filter dropdown

**TODO**:
- [ ] Add tags filter (multi-select or checkboxes)
- [ ] Show exercises that match ANY selected tag
- [ ] Update AddExerciseDialog component

---

### 6. Placeholder Support
**Requirement**: Filter placeholders by tags too

**Current State**: Placeholders exist but no tag filtering

**TODO**:
- [ ] Add placeholder tab in AddExerciseDialog
- [ ] Tag filtering for placeholders
- [ ] Visual distinction between exercise and placeholder

---

## Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ Run FIX_WORKOUTS_CONSTRAINTS.sql
2. ✅ Run ADD_PER_SET_CONFIGURATION.sql
3. Integrate set-by-set editor into exercise cards
4. Add superset notes display

### Phase 2: Important (Do Second)
5. Add multiple exercise selection
6. Add tag filtering to exercise dialog

### Phase 3: Nice to Have
7. Placeholder tag filtering
8. Better visual polish
9. Exercise reordering between groups

---

## Current File Status

### Created but Not Integrated:
- `set-by-set-editor.tsx` - Needs integration
- Migration SQL files - Need to be run

### Needs Updates:
- `simple-exercise-card.tsx` - Add set-by-set editor
- `add-exercise-dialog.tsx` - Add multi-select + tag filter
- `page.tsx` (workout builder) - Add superset notes display

### Database:
- `routine_exercises.set_configurations` - Column needs to be added
- `workouts.day_of_week` - Needs to be nullable
- `workouts.week_number` - Needs to be nullable

---

## Next Steps

1. **USER**: Run the two SQL migrations in Supabase
2. **DEV**: Integrate set-by-set editor into exercise card
3. **DEV**: Add superset notes to UI
4. **DEV**: Update add exercise dialog for multi-select + tags
5. **TEST**: Verify all features work end-to-end
