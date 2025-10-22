# Cell 4.4: Ownership Contexts + Placeholder System - Progress Summary

## Overview
This document tracks the implementation of the complete ownership context system and multi-tier placeholder support. This is THE MOST CRITICAL BUILD OF THE ENTIRE PROJECT.

---

## ✅ COMPLETED WORK

### 1. Database Migration Script Created
**File:** `docs/ADD_OWNERSHIP_CONTEXTS.sql`

**What it does:**
- Adds ownership columns to `workouts` and `routines` tables:
  - `plan_id` (UUID) - Links to training_plans
  - `athlete_id` (UUID) - Links to athletes
  - `source_workout_id` / `source_routine_id` (UUID) - Tracks lineage
- Adds `placeholder_name` column to `routine_exercises` table
- Adds ownership constraints (prevents both plan_id AND athlete_id from being set)
- Creates performance indexes for all three ownership contexts
- Adds helper functions for context detection

**STATUS:** ✅ Script created, **READY TO RUN** (user must execute in Supabase SQL Editor)

---

### 2. Workout Builder - Context Detection & Placeholder Support
**File:** `app/dashboard/workouts/[id]/page.tsx`

**Changes:**
- ✅ Added ownership columns to `Workout` interface (plan_id, athlete_id, source_workout_id)
- ✅ Added `placeholder_name` to `RoutineExercise` interface
- ✅ Implemented `getWorkoutContext()` helper function
- ✅ Implemented `getContextBadge()` helper function
- ✅ Added context badge to header (purple=Template, blue=Plan, green=Athlete)
- ✅ Updated `handleAddExercise()` to save `placeholder_name` when adding placeholders

**Context Badge Colors:**
- **Template Library:** Purple (`bg-purple-500/20 text-purple-300 border-purple-500/30`)
- **Plan-Owned:** Blue (`bg-blue-500/20 text-blue-300 border-blue-500/30`)
- **Athlete-Owned:** Green (`bg-green-500/20 text-green-300 border-green-500/30`)

---

### 3. Routine Builder - Context Detection & Placeholder Support
**File:** `app/dashboard/routines/[id]/page.tsx`

**Changes:**
- ✅ Added ownership columns to `Routine` interface (plan_id, athlete_id, source_routine_id)
- ✅ Added `placeholder_name` to `RoutineExercise` interface
- ✅ Implemented `getRoutineContext()` helper function
- ✅ Implemented `getContextBadge()` helper function
- ✅ Added context badge to header (same color scheme as workouts)
- ✅ Updated `handleAddExercise()` to save `placeholder_name` when adding placeholders

---

### 4. Sidebar Components - Placeholder Display
**Files:**
- `components/dashboard/workouts/workout-sidebar.tsx`
- `components/dashboard/routines/routine-sidebar.tsx`

**Changes:**
- ✅ Added `placeholder_name` to `RoutineExercise` interface
- ✅ Updated exercise display to show `placeholder_name` when `is_placeholder = true`
- ✅ Added "PH" badge for placeholder exercises (blue badge with border)
- ✅ Applied to both block exercises and standalone exercises

---

### 5. Exercise Detail Panel - Placeholder Display
**File:** `components/dashboard/workouts/exercise-detail-panel.tsx`

**Changes:**
- ✅ Added `placeholder_name` to `RoutineExercise` interface
- ✅ Updated header to display `placeholder_name` for placeholder exercises
- ✅ Added "PLACEHOLDER" badge in detail panel header

---

### 6. Plan Calendar Builder - TrainHeroic-Style Weekly View
**Files Created:**
- `app/dashboard/plans/page.tsx` - Plans library page
- `app/dashboard/plans/[id]/page.tsx` - Weekly calendar builder

**Features:**
- ✅ Plans library with create/delete functionality
- ✅ 7-day weekly calendar grid (Monday-Sunday)
- ✅ Week navigation (Previous/Next/Today buttons)
- ✅ Day cells with workout display
- ✅ Color-coded workout categories (red=hitting, blue=throwing, green=strength&conditioning)
- ✅ "Add Workout" buttons in each day cell
- ✅ Workout detail preview on click
- ✅ Responsive layout with proper spacing

**Visual Design:**
- Matches existing black-gray-zinc aesthetic
- Blue accents for current day
- Hover states on all interactive elements
- Dashed border for "Add Workout" buttons

---

## 🚧 IN PROGRESS

### 7. Workout Detail Modal/Slide-Over
**Status:** Pending
**What's needed:**
- Slide-over panel (similar to mobile design patterns)
- Quick edit for workout name, duration, notes
- "Edit Full Workout" button → opens workout builder in new tab
- "Remove from Plan" button
- "Copy to Template Library" button

---

## 📋 REMAINING TASKS

### 8. Add Workout to Plan Functionality
**Status:** Pending
**What's needed:**
- Workout library modal in plan calendar
- Search/filter workouts by category and tags
- "Copy to Plan" button for each workout
- Deep copy functionality (workout + all routines + all exercises + placeholder_definitions)
- Set `plan_id` on copied workout

### 9. Placeholder Resolution for Athlete Calendar
**Status:** Pending
**What's needed:**
- Detect placeholders in athlete's assigned workouts
- "Fill Placeholder" dialog
- Exercise picker filtered by category_hint
- Save resolved exercise to athlete's copy (NOT plan or template)

### 10. Assign Plan to Athletes/Teams
**Status:** Pending
**What's needed:**
- "Assign to Athletes" button in plan calendar
- Athlete/team picker
- Date range selector (when to start the plan)
- Deep copy all plan workouts to athlete's calendar
- Set `athlete_id` on all copied workouts
- Preserve placeholders (do NOT resolve at this stage)

### 11. Update Workout/Routine Import to Handle Contexts
**Status:** Pending
**What's needed:**
- When importing routine into workout, check ownership context
- If Plan-Owned workout importing Template routine → copy becomes Plan-Owned
- If Athlete-Owned workout importing Plan routine → copy becomes Athlete-Owned
- Preserve placeholder_definitions and placeholder exercises

### 12. Comprehensive Testing
**Status:** Pending
**Testing checklist:**
- [ ] Create template workout with placeholders
- [ ] Copy template to plan (verify plan_id set, source_workout_id set)
- [ ] Modify plan workout (verify template unchanged)
- [ ] Assign plan to athlete (verify athlete_id set, source_workout_id points to plan workout)
- [ ] Fill placeholder in athlete's workout (verify plan and template unchanged)
- [ ] Delete template (verify plan and athlete copies still exist)
- [ ] Delete plan (verify athlete copies still exist, but source tracking shows "orphaned")

---

## 🗄️ DATABASE TABLES REQUIRED

### Existing Tables (will be modified by migration):
- ✅ `workouts` - Add plan_id, athlete_id, source_workout_id
- ✅ `routines` - Add plan_id, athlete_id, source_routine_id
- ✅ `routine_exercises` - Add placeholder_name

### New Tables Needed:
- ❌ `training_plans` - **NEEDS TO BE CREATED**
  ```sql
  CREATE TABLE training_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- ❌ `plan_calendar` - **NEEDS TO BE CREATED**
  ```sql
  CREATE TABLE plan_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, workout_id, date)
  );

  CREATE INDEX idx_plan_calendar_plan_date ON plan_calendar(plan_id, date);
  ```

---

## 🎯 NEXT STEPS FOR USER

### STEP 1: Create Missing Database Tables
Before running the ownership contexts migration, create these tables in Supabase SQL Editor:

1. **Create `training_plans` table** (see SQL above)
2. **Create `plan_calendar` table** (see SQL above)
3. **Verify tables exist:** `SELECT * FROM training_plans LIMIT 1;`

### STEP 2: Run Ownership Contexts Migration
1. Open Supabase SQL Editor
2. Copy/paste contents of `docs/ADD_OWNERSHIP_CONTEXTS.sql`
3. Execute the script
4. Verify: Run the verification queries at the bottom of the migration script

### STEP 3: Test the New Features
1. Navigate to `/dashboard/workouts` and open any workout
2. Verify context badge shows "Template Library" (purple)
3. Create a new placeholder exercise and verify it displays correctly
4. Navigate to `/dashboard/plans`
5. Create a new training plan
6. Verify weekly calendar displays correctly

### STEP 4: Continue Implementation
Once migration is successful, the remaining tasks can be built:
- Workout detail slide-over modal
- Add workout to plan functionality
- Placeholder resolution
- Assign plan to athletes

---

## 📊 PROGRESS METRICS

| Task | Status | Completion |
|------|--------|------------|
| Database Migration Script | ✅ Complete | 100% |
| Workout Builder Updates | ✅ Complete | 100% |
| Routine Builder Updates | ✅ Complete | 100% |
| Sidebar Component Updates | ✅ Complete | 100% |
| Exercise Detail Panel Updates | ✅ Complete | 100% |
| Plan Calendar Builder (Basic) | ✅ Complete | 100% |
| Workout Detail Modal | 🚧 Pending | 0% |
| Add Workout to Plan | 🚧 Pending | 0% |
| Placeholder Resolution | 🚧 Pending | 0% |
| Assign Plan to Athletes | 🚧 Pending | 0% |
| Import Context Handling | 🚧 Pending | 0% |
| Comprehensive Testing | 🚧 Pending | 0% |

**Overall Progress: 50% Complete**

---

## 🔑 KEY ARCHITECTURAL CONCEPTS

### The Three Ownership Contexts

1. **Template Library** (`plan_id=null`, `athlete_id=null`)
   - Global shared templates
   - Created by coaches
   - Read-only for plans and athletes
   - Can be copied DOWN to plans

2. **Plan-Owned** (`plan_id!=null`, `athlete_id=null`)
   - Belongs to a specific training plan
   - 100% independent copy from template
   - Can be modified without affecting template
   - Can be assigned DOWN to athletes

3. **Athlete-Owned** (`athlete_id!=null`)
   - Belongs to a specific athlete
   - 100% independent copy from plan or template
   - Can have placeholders filled without affecting source
   - This is what athletes execute

### Data Flow Rules

- ✅ **Template → Plan:** Deep copy via "Add to Plan" button
- ✅ **Plan → Athlete:** Deep copy via "Assign Plan" functionality
- ✅ **Template → Athlete:** Deep copy via direct assignment (skips plan)
- ❌ **Athlete → Plan:** NEVER allowed
- ❌ **Plan → Template:** NEVER allowed
- ❌ **Athlete → Template:** NEVER allowed

### Placeholder System

- Placeholders defined in `workout.placeholder_definitions` or `routine.placeholder_definitions`
- Each placeholder has: `id`, `name`, `category_hint`
- Exercises marked with `is_placeholder=true` reference a placeholder via `placeholder_id`
- `placeholder_name` is denormalized for performance (display without JOIN)
- Placeholders can be filled at athlete level without affecting plan or template

---

## 🚨 CRITICAL REMINDERS

1. **DO NOT skip the database migration** - The entire feature depends on those columns
2. **Test each ownership context** - Ensure data isolation works correctly
3. **Verify deep copy functions** - Lineage tracking must work (source_*_id columns)
4. **Check RLS policies** - Athletes should only see/edit their own workouts
5. **Preserve placeholder definitions** - When copying workouts, include placeholder_definitions JSONB

---

## 📁 FILES MODIFIED IN THIS SESSION

### Created:
- `docs/ADD_OWNERSHIP_CONTEXTS.sql`
- `docs/CELL_4.4_PROGRESS_SUMMARY.md` (this file)
- `app/dashboard/plans/page.tsx`
- `app/dashboard/plans/[id]/page.tsx`

### Modified:
- `app/dashboard/workouts/[id]/page.tsx`
- `app/dashboard/routines/[id]/page.tsx`
- `components/dashboard/workouts/workout-sidebar.tsx`
- `components/dashboard/routines/routine-sidebar.tsx`
- `components/dashboard/workouts/exercise-detail-panel.tsx`

---

## 🎓 DEVELOPER HANDOFF NOTES

If continuing this work:

1. **Read the Cell 4.4 specification document first** (user provided detailed requirements)
2. **Verify migration ran successfully** before building new features
3. **Follow the ownership rules strictly** - never allow upward data flow
4. **Test with real data** - create template → plan → athlete to verify isolation
5. **Use the existing badge/color system** - keep UI consistent across all contexts
6. **Preserve the TrainHeroic-style UX** - calendar should feel familiar to users migrating from TH

---

**Last Updated:** October 22, 2025
**Build Status:** 🟡 50% Complete - Database tables needed before migration can run
**Next Action:** User must create `training_plans` and `plan_calendar` tables, then run migration
