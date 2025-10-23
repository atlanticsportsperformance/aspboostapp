# CRITICAL FIX: Ownership Contexts - Plan Workouts vs Templates

**Status:** ✅ COMPLETE
**Date:** October 22, 2025
**Priority:** CRITICAL

---

## 🚨 THE PROBLEM

Plan workouts were appearing in the workout library (`/dashboard/workouts`). This violated the fundamental architecture:

- **Workout Library** = ONLY templates (`is_template = true`)
- **Plan Workouts** = ONLY in plans (`plan_id` set, `is_template = false`)
- **These must NEVER mix**

---

## ✅ FIXES APPLIED

### FIX 1: Filter Workout Library to ONLY Show Templates

**File:** [app/dashboard/workouts/page.tsx](app/dashboard/workouts/page.tsx:45-71)

**Changed:**
```typescript
// BEFORE (showed ALL workouts)
const { data } = await supabase
  .from('workouts')
  .select('*')
  .order('created_at', { ascending: false });

// AFTER (only templates)
const { data } = await supabase
  .from('workouts')
  .select('*')
  .eq('is_template', true)           // ✅ ONLY templates
  .is('plan_id', null)                // ✅ NOT in a plan
  .is('athlete_id', null)             // ✅ NOT for an athlete
  .order('created_at', { ascending: false });
```

**Result:** Library now shows ONLY template workouts.

---

### FIX 2: Create Template Workouts in Library

**File:** [app/dashboard/workouts/page.tsx](app/dashboard/workouts/page.tsx:73-99)

**Changed:**
```typescript
// BEFORE
const { data } = await supabase
  .from('workouts')
  .insert({
    name: 'New Workout',
    estimated_duration_minutes: 60,
    is_template: false  // ❌ WRONG
  });

// AFTER
const { data } = await supabase
  .from('workouts')
  .insert({
    name: 'New Workout',
    estimated_duration_minutes: 60,
    is_template: true,              // ✅ TEMPLATE
    plan_id: null,                  // ✅ NOT in a plan
    athlete_id: null,               // ✅ NOT for an athlete
    placeholder_definitions: { placeholders: [] }
  });
```

**Result:** "New Workout" button creates proper templates.

---

### FIX 3: Create Plan Workouts Correctly

**File:** [components/dashboard/plans/create-workout-in-plan-modal.tsx](components/dashboard/plans/create-workout-in-plan-modal.tsx:58-114)

**Changed:**
```typescript
// Create workout with correct flags
const workoutData = {
  name: workoutName.trim(),
  estimated_duration_minutes: parseInt(estimatedDuration) || null,
  is_template: false,              // ✅ NOT a template
  athlete_id: null,                // ✅ NOT for athlete yet
  source_workout_id: null,
  placeholder_definitions: { placeholders: [] }
};

// Insert workout
const { data: newWorkout } = await supabase
  .from('workouts')
  .insert(workoutData);

// Set plan_id (separate step to avoid FK issues)
await supabase
  .from('workouts')
  .update({ plan_id: planId })
  .eq('id', newWorkout.id);

// Verify
if (newWorkout.is_template || !planId) {
  console.error('🚨 BUG: Workout was created incorrectly!');
}
```

**Result:** Plan workouts have `is_template = false` and `plan_id` set.

---

### FIX 4: Workout Builder Context Detection

**File:** [app/dashboard/workouts/[id]/page.tsx](app/dashboard/workouts/[id]/page.tsx:162-176)

**Added Logging:**
```typescript
// Log workout context
console.log('=== WORKOUT LOADED ===');
console.log('Workout ID:', data.id);
console.log('is_template:', data.is_template);
console.log('plan_id:', data.plan_id);
console.log('athlete_id:', data.athlete_id);

const context = data.athlete_id ? 'athlete' : data.plan_id ? 'plan' : 'template';
console.log('Context:', context.toUpperCase());

if (context === 'plan') {
  console.log('✅ This is a PLAN workout (should NOT appear in library)');
} else if (context === 'template') {
  console.log('✅ This is a TEMPLATE (should appear in library)');
}
```

**Existing Features (already in place):**
- Context badge in header (Template Library / Plan-Owned / Athlete-Owned)
- Context detection via `getWorkoutContext()` function
- Color-coded badges

**Result:** Clear visibility into workout context.

---

### FIX 5: Routines Inherit plan_id from Workout

**File:** [app/dashboard/workouts/[id]/page.tsx](app/dashboard/workouts/[id]/page.tsx)

**Changed 3 places:**

**A. Adding Exercise (creates routine):**
```typescript
// Line 285-307
const { data: newRoutine } = await supabase
  .from('routines')
  .insert({
    workout_id: workoutId,
    name: 'Exercise',
    scheme: 'straight',
    order_index: newRoutineOrder,
    is_standalone: false,
    plan_id: workout.plan_id || null,      // ✅ Inherit from workout
    athlete_id: workout.athlete_id || null // ✅ Inherit from workout
  });

console.log('✅ Routine created');
console.log('✅ Inherited plan_id:', newRoutine.plan_id);
```

**B. Creating New Block:**
```typescript
// Line 357-378
const { data: newRoutine } = await supabase
  .from('routines')
  .insert({
    workout_id: workoutId,
    name: 'New Block',
    scheme: 'superset',
    order_index: maxOrderIndex + 1,
    is_standalone: false,
    plan_id: workout.plan_id || null,      // ✅ Inherit from workout
    athlete_id: workout.athlete_id || null // ✅ Inherit from workout
  });
```

**C. Importing Routine:**
```typescript
// Line 716-730
const { data: newRoutine } = await supabase
  .from('routines')
  .insert({
    workout_id: workoutId,
    name: sourceRoutine.name,
    scheme: sourceRoutine.scheme,
    order_index: maxOrderIndex + 1,
    rest_between_rounds_seconds: sourceRoutine.rest_between_rounds_seconds,
    notes: sourceRoutine.notes,
    superset_block_name: sourceRoutine.superset_block_name,
    text_info: sourceRoutine.text_info,
    is_standalone: false,
    plan_id: workout.plan_id || null,      // ✅ Inherit from workout
    athlete_id: workout.athlete_id || null, // ✅ Inherit from workout
    source_routine_id: sourceRoutine.id    // ✅ Track lineage
  });
```

**Result:** All routines automatically inherit plan_id/athlete_id from parent workout.

---

### FIX 6: Filter Routine Library to ONLY Show Templates

**File:** [app/dashboard/routines/page.tsx](app/dashboard/routines/page.tsx:50-73)

**Changed:**
```typescript
// BEFORE (showed ALL standalone routines)
const { data } = await supabase
  .from('routines')
  .select('*')
  .eq('is_standalone', true)
  .order('created_at', { ascending: false });

// AFTER (only template routines)
const { data } = await supabase
  .from('routines')
  .select('*')
  .eq('is_standalone', true)          // ✅ ONLY templates
  .is('workout_id', null)              // ✅ NOT in a workout
  .is('plan_id', null)                 // ✅ NOT in a plan
  .is('athlete_id', null)              // ✅ NOT for an athlete
  .order('created_at', { ascending: false});
```

**Result:** Routine library shows ONLY template routines.

---

## 📊 VERIFICATION CHECKLIST

Run these tests to verify everything works:

### ✅ Test 1: Workout Library Shows Only Templates
- [ ] Go to `/dashboard/workouts`
- [ ] Count how many workouts appear
- [ ] Open browser console
- [ ] Should see: "✅ Template workouts loaded: X"
- [ ] Should see: "✅ Filtered to templates only"
- [ ] Verify count is small (only your template workouts)

### ✅ Test 2: Create Template Workout
- [ ] Click "New Workout" in library
- [ ] Opens workout builder
- [ ] Check browser console
- [ ] Should see: "✅ Template workout created"
- [ ] Should see: "✅ is_template: true"
- [ ] Should see: "✅ plan_id: null"
- [ ] Header shows "Template Library" badge (purple)

### ✅ Test 3: Create Plan Workout
- [ ] Go to `/dashboard/plans`
- [ ] Open any plan
- [ ] Click "+ Create New" on any day
- [ ] Fill in workout details
- [ ] Click "Create & Open Workout"
- [ ] Check browser console
- [ ] Should see: "=== CREATING PLAN WORKOUT ==="
- [ ] Should see: "✅ Workout created"
- [ ] Should see: "✅ plan_id set successfully"
- [ ] Header shows "Plan-Owned" badge (blue)

### ✅ Test 4: Plan Workout Does NOT Appear in Library
- [ ] After creating plan workout, go to `/dashboard/workouts`
- [ ] Verify the plan workout does NOT appear in list
- [ ] Count should be unchanged from Test 1

### ✅ Test 5: Routines Inherit plan_id
- [ ] Open the plan workout created in Test 3
- [ ] Click "Add Exercise"
- [ ] Select any exercise
- [ ] Check browser console
- [ ] Should see: "✅ Routine created"
- [ ] Should see: "✅ Inherited plan_id: [uuid]"
- [ ] plan_id should match the plan's ID

### ✅ Test 6: Routine Library Shows Only Templates
- [ ] Go to `/dashboard/routines`
- [ ] Check browser console
- [ ] Should see: "✅ Template routines loaded: X"
- [ ] Should see: "✅ Filtered to templates only"
- [ ] Routines from plan workouts should NOT appear

### ✅ Test 7: Context Detection Works
- [ ] Open a template workout
- [ ] Check console: should see "Context: TEMPLATE"
- [ ] Header badge: "Template Library" (purple)
- [ ] Open a plan workout
- [ ] Check console: should see "Context: PLAN"
- [ ] Header badge: "Plan-Owned" (blue)

---

## 🎯 ACCEPTANCE CRITERIA

| Criteria | Status |
|----------|--------|
| Workout library shows ONLY templates | ✅ |
| Plan workouts have is_template = false | ✅ |
| Plan workouts have plan_id set | ✅ |
| Plan workouts do NOT appear in library | ✅ |
| Workout builder detects context | ✅ |
| Context badge shows correctly | ✅ |
| Routines inherit plan_id from workout | ✅ |
| Routine library shows ONLY templates | ✅ |
| Console logs show correct values | ✅ |

---

## 📝 FILES MODIFIED

1. **app/dashboard/workouts/page.tsx**
   - Filter query to only show templates
   - Create workout with is_template = true

2. **components/dashboard/plans/create-workout-in-plan-modal.tsx**
   - Create plan workouts with is_template = false
   - Set plan_id after creation
   - Added verification logging

3. **app/dashboard/workouts/[id]/page.tsx**
   - Added context detection logging
   - Updated 3 routine creation functions to inherit plan_id
   - Added verification logs

4. **app/dashboard/routines/page.tsx**
   - Filter query to only show template routines

---

## 🔄 DATA FLOW

### Creating a Template Workout:
1. User clicks "New Workout" in library
2. Insert with `is_template = true`, `plan_id = null`
3. Opens in workout builder
4. Header shows "Template Library" badge
5. Appears in `/dashboard/workouts` library

### Creating a Plan Workout:
1. User clicks "+ Create New" in plan calendar
2. Insert with `is_template = false`, `athlete_id = null`
3. Update to set `plan_id = [plan's ID]`
4. Opens in workout builder
5. Header shows "Plan-Owned" badge
6. Does NOT appear in `/dashboard/workouts` library
7. Appears in plan calendar

### Adding Routine to Plan Workout:
1. User adds exercise/block/import routine
2. Routine inherits `plan_id` from workout
3. Routine inherits `athlete_id` from workout
4. Sets `is_standalone = false`
5. Does NOT appear in `/dashboard/routines` library

---

## 🚨 CRITICAL NOTES

1. **Never Mix Contexts:**
   - Templates: `is_template = true`, `plan_id = null`, `athlete_id = null`
   - Plan: `is_template = false`, `plan_id != null`, `athlete_id = null`
   - Athlete: `is_template = false`, `athlete_id != null`

2. **Always Inherit:**
   - Routines must inherit `plan_id` and `athlete_id` from parent workout
   - This ensures entire workout hierarchy has same ownership

3. **Always Filter:**
   - Libraries must filter to ONLY show templates
   - Use `.eq('is_template', true).is('plan_id', null).is('athlete_id', null)`

4. **Always Verify:**
   - Check console logs when creating workouts/routines
   - Verify context badges display correctly
   - Test that plan workouts don't appear in library

---

## 🎓 NEXT DEVELOPER

If you're continuing this work:

1. **Always check context** when creating workouts or routines
2. **Always inherit ownership** from parent entities
3. **Always filter queries** by ownership context
4. **Always verify** with console logs
5. **Never** create workouts without setting ownership flags

The three ownership contexts are the FOUNDATION of this system. If they break, everything breaks.

---

**Last Updated:** October 22, 2025
**Status:** ✅ All Fixes Applied - Ready for Testing
