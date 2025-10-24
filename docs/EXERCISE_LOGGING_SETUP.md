# Exercise Logging System - Setup Instructions

## ✅ COMPLETED

1. **Database Migration File Created**: `supabase/migrations/create_exercise_logs.sql`
2. **Workout Execution Page Created**: `app/dashboard/athletes/[id]/workouts/[instance-id]/execute/page.tsx`
3. **Calendar Modal Updated**: Added "Start Workout" button to athlete calendar

## 🔴 CRITICAL: RUN THIS FIRST

You MUST run the SQL migration in Supabase SQL Editor before testing:

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"

### Step 2: Copy and Run Migration
1. Open `supabase/migrations/create_exercise_logs.sql`
2. Copy ALL the SQL content
3. Paste into Supabase SQL Editor
4. Click "Run" (or press Cmd/Ctrl + Enter)

### Step 3: Verify Tables Created
Run this query to verify:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exercise_logs';
```

Should return: `exercise_logs`

### Step 4: Verify Functions Created
Run this query:
```sql
SELECT proname FROM pg_proc WHERE proname IN ('get_last_performance', 'calculate_workout_volume', 'detect_potential_pr', 'get_exercise_progress');
```

Should return 4 functions.

## 📝 TESTING CHECKLIST

Once database is set up, test the full workflow:

### Test 1: Open Athlete Calendar
- [ ] Navigate to Athletes
- [ ] Click an athlete
- [ ] Go to Calendar tab
- [ ] See workouts on calendar

### Test 2: Click Workout
- [ ] Click a workout chip
- [ ] Modal appears
- [ ] See "Start Workout" button (green)
- [ ] See workout details

### Test 3: Start Workout
- [ ] Click "Start Workout"
- [ ] Navigate to execution page
- [ ] URL: `/dashboard/athletes/[id]/workouts/[instance-id]/execute`
- [ ] See workout name and date
- [ ] See "Start Workout" button
- [ ] Progress bar shows 0%

### Test 4: Begin Workout
- [ ] Click "Start Workout"
- [ ] Timer starts
- [ ] First exercise loads
- [ ] See target reps/weight
- [ ] See "Last Time" data (if exists)

### Test 5: Log a Set
- [ ] Enter reps (use +/- buttons)
- [ ] Enter weight (use +5/-5 buttons)
- [ ] Select RPE (1-10 scale)
- [ ] Add notes (optional)
- [ ] Click "Complete Set"

### Test 6: Verify Data Saved
- [ ] Set saves successfully
- [ ] Progress updates (e.g., "1 / 3 sets")
- [ ] Next set number increments
- [ ] Can see logged sets in exercise list

### Test 7: Complete All Sets
- [ ] Log all sets for first exercise
- [ ] Automatically moves to next exercise
- [ ] Progress bar updates
- [ ] Completed exercises show green checkmark

### Test 8: Finish Workout
- [ ] Complete all exercises
- [ ] Click "Complete" button
- [ ] Redirects to athlete page
- [ ] Workout shows as completed on calendar

### Test 9: View Logs in Database
```sql
SELECT * FROM exercise_logs WHERE athlete_id = '[athlete-id]' ORDER BY logged_at DESC LIMIT 10;
```
- [ ] Logs exist
- [ ] Has correct data (reps, weight, RPE)
- [ ] workout_instance_id matches
- [ ] exercise_id matches

### Test 10: Continue In-Progress Workout
- [ ] Start a workout
- [ ] Log one set
- [ ] Navigate away
- [ ] Return to calendar
- [ ] Click workout
- [ ] See "Continue Workout" button (blue)
- [ ] Click Continue
- [ ] Resumes from next set

## 🐛 TROUBLESHOOTING

### Error: "exercise_logs does not exist"
**Solution**: Run the SQL migration in Supabase SQL Editor

### Error: "RPC function get_last_performance does not exist"
**Solution**: Run the SQL migration - functions weren't created

### Error: "Failed to log set"
**Check**:
1. RLS policies enabled?
2. User authenticated?
3. Check browser console for errors
4. Verify athlete_id matches logged-in user

### Sets not saving
**Debug**:
```sql
-- Check if INSERT is working
SELECT * FROM exercise_logs ORDER BY created_at DESC LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'exercise_logs';
```

### "Last Time" not showing
**Reason**: No previous logs exist for this exercise
**Expected**: Will show after logging first workout

### Target weight not calculated
**Check**:
1. Does athlete have 1RM in athlete_maxes?
2. Does exercise have percent_1rm set?
3. Check console logs for calculation errors

## 📊 DATABASE SCHEMA

### exercise_logs Table
```sql
- id (uuid, primary key)
- workout_instance_id (uuid, FK)
- routine_exercise_id (uuid, FK)
- athlete_id (uuid, FK)
- exercise_id (uuid, FK)
- set_number (int)
- target_sets (int)
- target_reps (int)
- target_weight (numeric)
- target_intensity_percent (numeric)
- actual_reps (int)
- actual_weight (numeric)
- metrics (jsonb)
- rpe (int, 1-10)
- notes (text)
- is_complete (boolean)
- logged_at (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### Helper Functions
1. **get_last_performance(athlete_id, exercise_id)** - Returns last workout data
2. **calculate_workout_volume(workout_instance_id)** - Sums weight × reps
3. **detect_potential_pr(athlete_id, exercise_id, weight, reps)** - Detects PRs using Epley formula
4. **get_exercise_progress(athlete_id, exercise_id, limit)** - Returns historical data for charts

## 🎯 FEATURES INCLUDED

✅ Exercise logging with reps/weight/RPE
✅ Target calculation from 1RM
✅ "Last time" performance display
✅ Set-by-set tracking
✅ Progress bar
✅ Timer
✅ Rest timer (can be added)
✅ Notes per set
✅ Continue in-progress workouts
✅ Mobile responsive

## 🚀 NEXT STEPS (Future Work)

1. **Progress Charts** (Prompt 2)
   - Weight over time
   - Volume over time
   - Velocity over time

2. **Auto PR Detection**
   - Use `detect_potential_pr()` function
   - Alert after logging sets
   - Option to update 1RM

3. **Rest Timer**
   - Add countdown timer between sets
   - Auto-start on set completion

4. **Exercise History**
   - View all logs for an exercise
   - Filter by date range

5. **Volume Tracking**
   - Total volume per workout
   - Weekly/monthly totals
   - Volume trends

## 📞 SUPPORT

If you encounter issues:
1. Check browser console (F12) for errors
2. Check Supabase logs for database errors
3. Verify RLS policies are correct
4. Check that user is authenticated

---

**Created**: October 28, 2025
**Status**: Database migration pending, code complete
**Next**: Run SQL migration, then test workflow
