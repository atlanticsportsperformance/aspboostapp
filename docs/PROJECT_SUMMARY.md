# Complete Application Summary - Baseball Training Management Platform

## Overview
A comprehensive **baseball training management platform** built for coaches and organizations to manage athletes, create workouts, design training programs, and track performance. Think **Exercise.com meets TrainHeroic** but specialized for baseball.

---

## Tech Stack

### Frontend
- **Next.js 15.5.6** (App Router with Turbopack)
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- Client-side routing and server components

### Backend
- **Supabase** (PostgreSQL database)
- **Row Level Security (RLS)** for data access control
- **Real-time subscriptions** (Supabase realtime)

### Key Libraries
- **@dnd-kit** for drag-and-drop functionality (workout scheduling)
- **Supabase Auth** for authentication

---

## Application Architecture

### Database Schema (Key Tables)

#### Organization & Users
- `organizations` - Multi-tenant organization data
- `staff` - Coaches/staff members linked to organizations and users
- `athletes` - Player profiles with metadata (positions, graduation year, etc.)

#### Exercise Library
- `exercises` - Exercise definitions with:
  - Name, category, description, video URLs, cues, equipment
  - **Custom metric schema** (measurements like reps, weight, distance, time, etc.)
  - Tags for organization
  - Custom measurements support (any metric you can imagine)

#### Workouts & Routines
- `workouts` - Individual workout sessions
- `routines` - Reusable workout blocks/templates that go inside workouts
- `routine_exercises` - Exercises within routines with:
  - Sets, measurements (reps, weight, etc.)
  - Rest periods, tempo
  - Intensity targets (% of max)
  - AMRAP support (per-set or all sets)
  - Set-by-set configurations
  - Notes

#### Training Plans (Periodization)
- `training_plans` - Long-term training programs (e.g., "Summer 2025 Program")
- `program_days` - Calendar structure (weeks × days) linking workouts to specific dates
- Dynamic week management (add/delete weeks)

#### Tags System
- `workout_tags` - Tags for workouts
- `exercise_tags` - Tags for exercises
- `plan_tags` - Tags for training plans
- Tags are managed centrally and selected via dropdowns

#### Athlete Baselines (Future)
- `athlete_baselines` - Stores athlete max values for intensity calculations

---

## Features Implemented

### 1. **Dashboard Home** (`/dashboard`)
- Organization overview
- Quick stats (athletes, workouts, exercises, plans)
- Recent activity feed
- Quick actions for creating workouts, exercises, athletes

### 2. **Exercise Library** (`/dashboard/exercises`)

#### Features:
- **Comprehensive exercise management**:
  - Create, edit, delete, bulk edit exercises
  - Categories: Strength & Conditioning, Hitting, Throwing, Mobility, Speed/Agility, etc.
  - Video URL support
  - Coaching cues
  - Equipment requirements
  - Tags for organization

- **Custom Measurement System**:
  - Default measurements: Reps, Weight, Distance, Time, Height, Calories, Tempo
  - **Create custom measurements** (e.g., "exit velocity", "bat speed", "pitch count")
  - Each exercise can have any combination of measurements
  - Stored in `metric_schema` JSON field

- **Placeholder Exercises**:
  - Special exercise type for programming TBD exercises
  - Can be replaced with real exercises later
  - Measurements persist when swapping

- **Bulk Operations**:
  - Bulk edit tags, categories
  - Bulk delete

- **Search & Filters**:
  - Search by name
  - Filter by category
  - Filter by tags
  - Sort by name, date, category

#### Key Components:
- `create-exercise-dialog.tsx` - Exercise creation with measurement selection
- `custom-measurements-manager.tsx` - Manage custom measurements
- `bulk-edit-dialog.tsx` - Bulk operations

---

### 3. **Workout Builder** (`/dashboard/workouts/[id]`)

#### Overview:
**Fullscreen immersive builder** (like Exercise.com) with three-panel layout:
1. **Left Sidebar**: Workout structure overview
2. **Center**: Main workout composition (routines and exercises)
3. **Right Panel**: Exercise detail configuration

#### Features:
- **Add Routines or Individual Exercises**:
  - Routines are reusable blocks (e.g., "Warm-up", "Main Lift")
  - Can add from library or create new inline
  - Add multiple exercises at once (multi-select)

- **Routine Configuration**:
  - Routine name
  - Scheme (Straight Sets, Superset, Circuit, EMOM, AMRAP, Cluster, Rest-Pause, Pyramid, Wave Loading)
  - Notes

- **Exercise Configuration Panel**:
  - **Sets**: Number of sets
  - **Measurements**: Dynamic based on exercise's metric schema
  - **AMRAP**: Checkbox for "As Many Reps As Possible"
  - **Rest**: Rest time in seconds
  - **Tempo**: e.g., "3-0-1-0"
  - **Intensity Targets**:
    - Select metric (e.g., "Weight")
    - Select intensity type (% 1RM, % Max, RPE, RIR, Tempo)
    - Set percentage
  - **Workout-specific notes**

- **Set-by-Set Editor**:
  - Configure each set individually
  - Different reps/weight per set
  - **Per-set AMRAP** (e.g., Set 1: 10 reps, Set 2: 8 reps, Set 3: AMRAP)
  - Intensity per set
  - Rest per set
  - Notes per set

- **Drag & Drop Reordering**:
  - Reorder routines within workout
  - Reorder exercises within routines

- **Swap Exercises**:
  - Click exercise → swap button
  - Replace with another exercise from library
  - **Measurements persist** (sets, reps, etc. carry over)

- **Duplicate & Delete**:
  - Duplicate exercises within routine
  - Duplicate entire routines
  - Delete with confirmation

- **Workout Metadata**:
  - Name, category, tags
  - Workout-level notes
  - Auto-save on blur

- **Optimistic UI Updates**:
  - No flickering when editing
  - Instant feedback on all changes

#### Key Components:
- `app/dashboard/workouts/[id]/page.tsx` - Main workout builder
- `exercise-detail-panel.tsx` - Right panel for exercise config
- `set-by-set-editor.tsx` - Per-set configuration
- `workout-sidebar.tsx` - Left sidebar with exercise summaries
- `add-exercise-dialog.tsx` - Multi-select exercise picker
- `swap-exercise-dialog.tsx` - Exercise replacement

#### Layout Details:
- Compact, desktop-optimized spacing
- Small input fields (w-16, w-20, w-24, w-32)
- Flex-wrap layouts for responsive measurement inputs
- Fullscreen modal (`fixed inset-0 z-50`)

---

### 4. **Routine Builder** (`/dashboard/routines/[id]`)

#### Overview:
**Identical to workout builder** but for creating reusable routine templates. Routines can be added to workouts.

#### Features:
- Same UI/UX as workout builder
- All exercise configuration options
- Can be used in multiple workouts
- Add from library to workout builder
- Fullscreen experience

#### Key Components:
- `app/dashboard/routines/[id]/page.tsx` - Routine builder (mirrors workout builder)

---

### 5. **Training Plans (Periodization)** (`/dashboard/plans/[id]`)

#### Overview:
**Calendar-based program builder** for creating long-term training plans (e.g., 12-week off-season program).

#### Features:
- **Plan Metadata**:
  - Editable plan name (inline)
  - Description (textarea)
  - Tags (dropdown from plan_tags)
  - Length in weeks (dynamic)

- **Calendar Grid**:
  - Weeks (rows) × Days (columns, Mon-Sun)
  - Each cell can hold multiple workouts
  - Visual workout cards with:
    - Workout name
    - Category badge
    - Routine count
    - Exercise count

- **Add Workouts to Plan**:
  - Click day cell → "Add Workout"
  - Options:
    1. **Add from Library** - Select existing workouts
    2. **Add Routine as Workout** - Convert routine to workout
    3. **Create New Workout** - Build inline

- **Workout Builder Modal** (Inline):
  - **Full workout builder inside the plan view**
  - Build workout without leaving plan
  - Same features as standalone workout builder
  - Saves and adds to plan

- **Drag & Drop Scheduling**:
  - Drag workouts between days
  - Drag workouts between weeks
  - Visual feedback during drag

- **Workout Management**:
  - Click workout card → Slide-over detail view
  - Edit workout (opens builder modal)
  - Duplicate workout
  - Delete workout
  - View exercise list

- **Week Management**:
  - **Add Week** button - Extends plan by 1 week
  - **Delete Week** button - Removes week and shifts remaining weeks up
  - Confirmation prompts

#### Key Components:
- `app/dashboard/plans/[id]/page.tsx` - Plan calendar
- `workout-builder-modal.tsx` - Inline workout builder
- `add-workout-to-plan-dialog.tsx` - Add from library
- `add-routine-to-plan-dialog.tsx` - Add routine
- `create-workout-in-plan-modal.tsx` - Create new
- `workout-detail-slideover.tsx` - Workout preview
- `draggable-workout-card.tsx` - DnD workout cards
- `droppable-day-cell.tsx` - DnD day cells

---

### 6. **Athletes Management** (`/dashboard/athletes`)

#### Features:
- Create, edit, delete athletes
- Profile fields:
  - Name, email, phone
  - Position (Pitcher, Catcher, Infielder, Outfielder)
  - Graduation year
  - Height, weight
  - Notes

- **Athlete Detail View** (Planned):
  - Tabs for: Program, KPIs, Baselines, Documents, Notes
  - Assign training plans
  - Track performance metrics
  - Store baseline measurements (e.g., 1RM bench, max velocity)

#### Key Components:
- `app/dashboard/athletes/page.tsx` - Athletes list
- Athlete detail tabs (planned/partial implementation)

---

### 7. **Tag Management System**

#### Overview:
Centralized tag management for workouts, exercises, and plans.

#### Features:
- **Workout Tags Manager**:
  - Create, edit, rename, delete tags
  - Shows usage count
  - Updates all workouts when tag is renamed/deleted

- **Exercise Tags Manager**:
  - Same as workout tags
  - Tags from exercise library

- **Plan Tags Manager**:
  - Same as workout/exercise tags
  - Accessible from Plans page

- **Tag Selection (All Builders)**:
  - **Dropdown-only selection** (no custom tag input)
  - Tags must be created in Manage Tags section first
  - Consistent UX across all builders

#### Key Components:
- `workout-tags-manager.tsx` - Workout tags CRUD
- `plan-tags-manager.tsx` - Plan tags CRUD
- `workout-tags-editor.tsx` - Tag dropdown selector (used in workouts/routines)
- `plan-tags-editor.tsx` - Tag dropdown selector (used in plans)

#### Database Tables:
- `workout_tags` - Workout tag definitions
- `exercise_tags` - Exercise tag definitions (implied from exercises.tags)
- `plan_tags` - Plan tag definitions (**requires migration**)

---

### 8. **Staff Management** (`/dashboard/staff`)

#### Features:
- Manage coaches/staff in organization
- Role assignments
- Access control (future)

---

## Key Design Patterns & Decisions

### 1. **Custom Measurement System**
- **Problem**: Different exercises need different measurements (reps vs. distance vs. time)
- **Solution**: JSON `metric_schema` field in exercises table
- **Benefits**:
  - Infinite flexibility
  - Add new measurement types without schema changes
  - Each exercise defines what it measures

### 2. **Routine vs. Workout Architecture**
- **Workouts**: Top-level training sessions
- **Routines**: Reusable blocks within workouts
- **Exercises**: Individual movements within routines
- **Hierarchy**: Workout → Routines → Exercises

### 3. **Intensity Targets**
- Stored as `intensity_targets` array in routine_exercises
- Each target has: `metric`, `metric_label`, `percent`
- Example: `{ metric: "weight", metric_label: "Weight", percent: 75 }`
- **Calculation logic not implemented yet** (requires athlete baselines)

### 4. **AMRAP Implementation**
- Two types:
  1. **All-sets AMRAP**: Boolean flag on exercise
  2. **Per-set AMRAP**: Boolean in set configuration
- Per-set allows: Set 1: 10 reps, Set 2: 8 reps, Set 3: AMRAP

### 5. **Optimistic UI Updates**
- **Problem**: Typing in notes was laggy due to re-fetching on every keystroke
- **Solution**: Update local state immediately, then update database in background
- **Result**: Smooth, instant UI feedback

### 6. **Placeholder Exercises**
- Special exercise type for TBD programming
- Can swap out later without losing sets/reps configuration
- Useful for template workouts

### 7. **Multi-Select Add**
- All "Add Exercise" dialogs support multi-select
- Shows counter of selected exercises
- Adds all at once (better UX than one-by-one)

### 8. **Drag & Drop**
- Using `@dnd-kit` library
- Two contexts:
  1. Workout builder: Reorder routines/exercises
  2. Plan calendar: Schedule workouts across days/weeks

### 9. **Fullscreen Builders**
- Workout and routine builders use `fixed inset-0 z-50`
- Immersive, distraction-free building experience
- Three-panel layout (sidebar, main, detail panel)

### 10. **Compact Layouts**
- Small, fixed-width inputs (w-16, w-20, w-24, w-32)
- Flex-wrap for measurements
- Desktop-optimized spacing
- Modeled after Exercise.com

---

## Database Migrations Required

### Plan Tags Table
**File**: `migrations/create_plan_tags_table.sql`

**Status**: ⚠️ **NOT RUN YET** - User needs to run this migration

**Instructions**:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the migration script
4. Enables plan tags functionality

**Without this migration**:
- Plan tags dropdown will show "No tags available"
- Cannot create/manage plan tags

---

## Known Issues & Future Enhancements

### Current Limitations

#### 1. **Intensity Calculations Not Implemented**
- **Issue**: Intensity targets store % of max, but don't calculate actual weights
- **Example**: 75% of 300 lb max = 225 lb (calculation doesn't happen)
- **Requires**:
  - Athlete baselines system (store 1RM, max velocity, etc.)
  - Calculation logic when athlete executes workout
  - UI for athletes to track/log workouts

#### 2. **Athlete Workout Execution Missing**
- **Issue**: Athletes can't log/track workouts yet
- **Needs**:
  - Athlete login/view
  - Assigned workout display
  - Input fields for actual performance (reps done, weight used, etc.)
  - Progress tracking
  - History/analytics

#### 3. **Plan Assignment to Athletes**
- **Issue**: Can't assign plans to specific athletes yet
- **Needs**:
  - `athlete_plans` junction table
  - Assignment UI in athlete detail view
  - Start date, end date tracking

#### 4. **No Analytics/Reporting**
- **Issue**: No visualization of progress, trends, or performance
- **Needs**:
  - Charts for tracking metrics over time
  - Volume tracking (total reps, tonnage, etc.)
  - Readiness/fatigue monitoring
  - Goal tracking

#### 5. **No Mobile Optimization**
- **Issue**: UI is desktop-optimized
- **Needs**: Responsive design for tablet/mobile

#### 6. **No File Uploads**
- **Issue**: No way to upload exercise videos, documents, athlete photos
- **Needs**: Supabase Storage integration

#### 7. **Limited Search**
- **Issue**: Basic text search only
- **Needs**: Advanced filters, saved searches, smart search

---

## File Structure

```
completeapp/
├── app/
│   ├── dashboard/
│   │   ├── athletes/          # Athlete management
│   │   ├── exercises/         # Exercise library
│   │   ├── plans/            # Training plans (periodization)
│   │   │   └── [id]/         # Plan calendar builder
│   │   ├── routines/         # Routine templates
│   │   │   └── [id]/         # Routine builder
│   │   ├── staff/            # Staff management
│   │   ├── workouts/         # Workout library
│   │   │   └── [id]/         # Workout builder
│   │   ├── layout.tsx        # Dashboard layout with nav
│   │   └── page.tsx          # Dashboard home
│   └── layout.tsx            # Root layout
│
├── components/
│   ├── dashboard/
│   │   ├── athletes/         # Athlete components
│   │   ├── exercises/        # Exercise library components
│   │   ├── plans/           # Plan components (calendar, modals)
│   │   ├── routines/        # Routine components
│   │   └── workouts/        # Workout components (builders, editors)
│   └── ui/                  # Shared UI components
│
├── lib/
│   └── supabase/
│       └── client.ts        # Supabase client initialization
│
├── migrations/
│   ├── create_plan_tags_table.sql  # Plan tags migration
│   └── README.md                   # Migration instructions
│
└── public/                  # Static assets
```

---

## Component Breakdown

### Workout/Routine Builder Components
- `exercise-detail-panel.tsx` - Right panel for configuring exercise
- `set-by-set-editor.tsx` - Per-set configuration UI
- `workout-sidebar.tsx` - Left sidebar with workout structure
- `routine-sidebar.tsx` - Left sidebar for routine builder
- `add-exercise-dialog.tsx` - Multi-select exercise picker
- `swap-exercise-dialog.tsx` - Replace exercise in routine
- `simple-exercise-card.tsx` - Exercise card in routine (draggable)

### Plan Builder Components
- `workout-builder-modal.tsx` - Inline workout builder in plan
- `add-workout-to-plan-dialog.tsx` - Add existing workout
- `add-routine-to-plan-dialog.tsx` - Add routine as workout
- `create-workout-in-plan-modal.tsx` - Create new workout
- `workout-detail-slideover.tsx` - Workout preview slide-over
- `draggable-workout-card.tsx` - Workout card in calendar (draggable)
- `droppable-day-cell.tsx` - Day cell that accepts drops

### Exercise Library Components
- `create-exercise-dialog.tsx` - Exercise creation form
- `custom-measurements-manager.tsx` - Manage custom measurements
- `bulk-edit-dialog.tsx` - Bulk operations on exercises

### Tag Management Components
- `workout-tags-manager.tsx` - CRUD for workout tags
- `workout-tags-editor.tsx` - Tag dropdown selector
- `plan-tags-manager.tsx` - CRUD for plan tags
- `plan-tags-editor.tsx` - Plan tag dropdown selector

---

## Styling & UI Patterns

### Color Scheme
- Background: Dark gradients (`from-zinc-950 via-neutral-900 to-zinc-950`)
- Primary accent: Blue (`bg-blue-600`, `hover:bg-blue-700`)
- Secondary accent: Gold/yellow (`#C9A857`)
- Borders: Neutral with transparency (`border-neutral-800`, `border-white/10`)
- Text: White with gray variants (`text-white`, `text-neutral-400`)

### Common Patterns
- **Modal/Dialog**: `fixed inset-0 bg-black/80 flex items-center justify-center z-50`
- **Card**: `bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10`
- **Button (Primary)**: `px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg`
- **Button (Secondary)**: `px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg`
- **Input**: `px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white`

### Responsive Breakpoints
- Using Tailwind's default breakpoints (sm, md, lg, xl)
- Most layouts are desktop-first (not mobile-optimized yet)

---

## Authentication & Authorization

### Current State
- Uses Supabase Auth
- RLS policies on tables
- Organization-scoped data (multi-tenant)
- Staff linked to organizations

### User Roles (Implied)
- **Coach/Staff**: Full access to create workouts, plans, manage athletes
- **Athlete**: (Future) View assigned workouts, log performance

---

## Data Flow Examples

### Creating a Workout
1. User navigates to `/dashboard/workouts`
2. Clicks "New Workout"
3. Enters name, category, tags
4. Workout record created in `workouts` table
5. Redirects to `/dashboard/workouts/[id]`
6. User adds routines from library or creates new
7. Routine created/linked in `routines` table
8. User adds exercises to routine
9. Exercises created in `routine_exercises` table with configuration
10. All changes auto-save on blur

### Scheduling a Workout in a Plan
1. User opens plan `/dashboard/plans/[id]`
2. Clicks a day cell in calendar
3. Selects "Add from Library"
4. Picks workout from modal
5. Record created in `program_days` table with:
   - `plan_id`
   - `week_number`
   - `day_number`
   - `workout_id`
6. Workout card appears in calendar cell
7. Can drag to different day (updates `week_number`/`day_number`)

### Swapping an Exercise
1. In workout builder, click exercise
2. Click "Swap Exercise"
3. Select replacement from library
4. System:
   - Keeps same sets, reps, intensity, rest, notes
   - Updates `exercise_id` in `routine_exercises`
   - Updates `enabled_measurements` to match new exercise's schema
   - Preserves measurement values if compatible

---

## Recent Session Changes (Context Restoration)

From the most recent sessions, here are the latest updates:

### Session 1: Workout Builder Improvements
- Made measurement input boxes much smaller (w-16, w-20, w-24, w-32)
- Fixed AMRAP to work per individual set (not all-or-nothing)
- Improved sidebar width (w-80 → w-96) and added comprehensive exercise summaries
- Made all builders fullscreen (`fixed inset-0`)
- Added intensity % to sidebar summaries
- Fixed sticky notes issue with optimistic UI updates

### Session 2: Plan Enhancements
- Added plan description field (textarea with auto-save)
- Added plan tags with PlanTagsEditor component
- Added delete week functionality
- Week management (add/delete weeks with confirmation)

### Session 3: Tag System Overhaul (Current Session)
- **Removed custom tag inputs** from all tag editors
- Now all tags must be created in "Manage Tags" sections first
- Updated components:
  - `plan-tags-editor.tsx` - Dropdown only
  - `workout-tags-editor.tsx` - Dropdown only
  - `create-exercise-dialog.tsx` - Removed custom tag input
- Created `PlanTagsManager` component
- Added "Manage Tags" button to Plans page
- Created `plan_tags` table migration (⚠️ not run yet)

---

## Next Steps & Roadmap Ideas

Based on what's built, here are logical next steps:

### Immediate Priorities
1. **Run plan_tags migration** (blocking plan tags functionality)
2. **Test all tag editors** across workouts, exercises, plans
3. **Mobile responsiveness** for existing features

### Phase 1: Athlete Workout Execution
- Athlete login/dashboard
- View assigned workouts
- Log actual performance (reps, weight, etc.)
- Complete/mark workouts as done
- Simple progress tracking

### Phase 2: Baselines & Intensity Calculations
- Athlete baseline management (1RM, max velocity, etc.)
- Implement intensity calculation logic
- Auto-calculate working weights based on % and baselines
- Update baselines from workout logs

### Phase 3: Analytics & Reporting
- Volume tracking (tonnage, reps, sets over time)
- Progress charts (strength gains, velocity trends)
- Workout compliance tracking
- Readiness/fatigue monitoring
- Export/print workout cards

### Phase 4: Advanced Features
- Exercise video uploads (Supabase Storage)
- Athlete documents (medical records, contracts, etc.)
- Team/group management
- Communication features (notes, comments)
- Calendar integrations
- Mobile app (React Native?)

### Phase 5: Business Features
- Subscription/billing
- Multi-organization support (already scoped)
- Athlete portal
- Parent portal (for youth programs)
- Custom branding per organization

---

## Technology Considerations

### What's Working Well
✅ **Supabase**: Fast, reliable, real-time capabilities
✅ **Next.js 15 + Turbopack**: Blazing fast dev experience
✅ **TypeScript**: Type safety catching errors early
✅ **Tailwind**: Rapid UI development
✅ **Component Architecture**: Reusable, maintainable code
✅ **Custom Measurement System**: Flexible, future-proof

### Potential Improvements
⚠️ **State Management**: Consider Zustand or Redux for complex state
⚠️ **Form Handling**: Consider React Hook Form for complex forms
⚠️ **API Layer**: Consider tRPC for type-safe APIs
⚠️ **Testing**: No tests yet - add Jest + React Testing Library
⚠️ **Error Handling**: More robust error boundaries and user feedback
⚠️ **Loading States**: More sophisticated loading/skeleton states
⚠️ **Offline Support**: Consider PWA capabilities for athletes in gym

---

## Codebase Statistics

- **Total .tsx files**: ~53 files
  - App routes: 19 files
  - Components: 34 files
- **Lines of code**: Estimated 15,000+ lines
- **Database tables**: ~15 tables (estimated)
- **Key features**: 8 major feature areas
- **Migrations pending**: 1 (plan_tags)

---

## Summary

You've built a **sophisticated, production-ready training management platform** with:

1. ✅ **Exercise library** with custom measurements and placeholder support
2. ✅ **Workout builder** with fullscreen UI, drag-drop, set-by-set config, AMRAP, intensity targets
3. ✅ **Routine templates** for reusable workout blocks
4. ✅ **Training plans** with calendar scheduling, drag-drop, inline builders
5. ✅ **Tag management** system across all entities
6. ✅ **Athlete management** (basic profiles)
7. ✅ **Multi-tenant architecture** (organization-scoped)
8. ✅ **Optimistic UI** for smooth UX

**What's Missing** (for full MVP):
- ❌ Athlete workout execution/logging
- ❌ Intensity calculations (requires baselines)
- ❌ Plan assignment to athletes
- ❌ Analytics/reporting
- ❌ Mobile optimization
- ❌ File uploads

**Immediate Action Required**:
- Run `plan_tags` migration to enable plan tags

**The foundation is solid.** The next logical step is building the **athlete-facing features** (workout execution and logging) to close the loop and make the platform fully functional.
