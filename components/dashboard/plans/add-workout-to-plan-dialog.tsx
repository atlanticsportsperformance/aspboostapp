'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Workout {
  id: string;
  name: string;
  category: string | null;
  estimated_duration_minutes: number | null;
  tags: string[] | null;
}

interface AddWorkoutToPlanDialogProps {
  planId: string;
  programLengthWeeks: number;
  weekNumber?: number;
  dayNumber?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddWorkoutToPlanDialog({
  planId,
  programLengthWeeks,
  weekNumber,
  dayNumber,
  onClose,
  onSuccess
}: AddWorkoutToPlanDialogProps) {
  const supabase = createClient();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(weekNumber || 1);
  const [selectedDay, setSelectedDay] = useState(dayNumber || 1);
  const [copying, setCopying] = useState(false);

  // Pre-filled week/day from dropdown
  const hasPreselectedDay = weekNumber !== undefined && dayNumber !== undefined;

  const WORKOUT_CATEGORIES = [
    { value: 'hitting', label: 'Hitting' },
    { value: 'throwing', label: 'Throwing' },
    { value: 'strength_conditioning', label: 'Strength & Conditioning' }
  ] as const;

  const dayNames = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

  useEffect(() => {
    fetchWorkouts();
  }, []);

  async function fetchWorkouts() {
    setLoading(true);
    // Fetch template workouts only (no plan_id, no athlete_id)
    const { data, error } = await supabase
      .from('workouts')
      .select('id, name, category, estimated_duration_minutes, tags')
      .eq('is_template', true)         // ✅ ONLY templates
      .is('plan_id', null)
      .is('athlete_id', null)
      .order('name');

    if (error) {
      console.error('Error fetching workouts:', error);
    } else {
      console.log('✅ Template workouts for plan library:', data?.length);
      setWorkouts(data || []);
    }
    setLoading(false);
  }

  const filteredWorkouts = workouts.filter(workout => {
    const matchesSearch = workout.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || workout.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  function getCategoryColor(category: string | null) {
    const colors: { [key: string]: string } = {
      hitting: 'bg-red-500/20 text-red-300 border-red-500/30',
      throwing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      strength_conditioning: 'bg-green-500/20 text-green-300 border-green-500/30',
    };
    return colors[category?.toLowerCase() || ''] || 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30';
  }

  async function handleAddWorkout() {
    if (!selectedWorkoutId) {
      alert('Please select a workout');
      return;
    }

    setCopying(true);

    // Get current user's organization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: staffData } = await supabase
      .from('staff')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!staffData) {
      alert('Unable to determine your organization');
      setCopying(false);
      return;
    }

    // Step 1: Fetch the template workout with all its data
    const { data: templateWorkout, error: fetchError } = await supabase
      .from('workouts')
      .select(`
        *,
        routines (
          *,
          routine_exercises (*)
        )
      `)
      .eq('id', selectedWorkoutId)
      .single();

    if (fetchError || !templateWorkout) {
      console.error('Error fetching template workout:', fetchError);
      alert('Failed to fetch workout');
      setCopying(false);
      return;
    }

    // Step 2: Create a plan-owned copy of the workout
    const { data: newWorkout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        name: templateWorkout.name,
        estimated_duration_minutes: templateWorkout.estimated_duration_minutes,
        notes: templateWorkout.notes,
        is_template: false,
        tags: templateWorkout.tags,
        category: templateWorkout.category,
        plan_id: planId, // Mark as plan-owned
        athlete_id: null,
        source_workout_id: templateWorkout.id, // Track lineage
        placeholder_definitions: templateWorkout.placeholder_definitions
      })
      .select()
      .single();

    if (workoutError || !newWorkout) {
      console.error('Error creating workout copy:', workoutError);
      alert('Failed to copy workout');
      setCopying(false);
      return;
    }

    // Step 3: Copy all routines
    if (templateWorkout.routines && templateWorkout.routines.length > 0) {
      for (const routine of templateWorkout.routines) {
        const { data: newRoutine, error: routineError } = await supabase
          .from('routines')
          .insert({
            workout_id: newWorkout.id,
            name: routine.name,
            scheme: routine.scheme,
            order_index: routine.order_index,
            rest_between_rounds_seconds: routine.rest_between_rounds_seconds,
            notes: routine.notes,
            superset_block_name: routine.superset_block_name,
            text_info: routine.text_info,
            is_standalone: false,
            plan_id: planId, // Mark as plan-owned
            source_routine_id: routine.id
          })
          .select()
          .single();

        if (routineError || !newRoutine) {
          console.error('Error copying routine:', routineError);
          continue;
        }

        // Step 4: Copy all exercises for this routine
        if (routine.routine_exercises && routine.routine_exercises.length > 0) {
          const exercisesToCopy = routine.routine_exercises.map((ex: any) => ({
            routine_id: newRoutine.id,
            exercise_id: ex.exercise_id,
            is_placeholder: ex.is_placeholder || false,
            placeholder_id: ex.placeholder_id,
            placeholder_name: ex.placeholder_name,
            order_index: ex.order_index,
            sets: ex.sets,
            reps_min: ex.reps_min,
            reps_max: ex.reps_max,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes,
            metric_targets: ex.metric_targets,
            intensity_targets: ex.intensity_targets,
            set_configurations: ex.set_configurations
          }));

          await supabase
            .from('routine_exercises')
            .insert(exercisesToCopy);
        }
      }
    }

    // Step 5: Link the workout to the program day by creating a new program_day entry
    const { error: programDayError } = await supabase
      .from('program_days')
      .insert({
        plan_id: planId,
        week_number: selectedWeek,
        day_number: selectedDay,
        workout_id: newWorkout.id,
        order_index: 0
      });

    if (programDayError) {
      console.error('Error linking workout to program day:', programDayError);
      console.error('Error details:', JSON.stringify(programDayError, null, 2));
      alert(`Workout copied but failed to assign to program day: ${programDayError.message || 'Unknown error'}`);
    }

    setCopying(false);
    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg w-full max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Add Workout to Plan</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-white/10 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Search workouts</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-neutral-900 [&>option]:text-white"
              >
                <option value="all">All Categories</option>
                {WORKOUT_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignment Controls - only show if not preselected */}
          {!hasPreselectedDay ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Assign to Week</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-neutral-900 [&>option]:text-white"
                >
                  {Array.from({ length: programLengthWeeks }, (_, i) => i + 1).map(week => (
                    <option key={week} value={week}>Week {week}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Assign to Day</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-neutral-900 [&>option]:text-white"
                >
                  {dayNames.map((name, index) => (
                    <option key={index + 1} value={index + 1}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">
                Will add to <span className="font-semibold">Week {selectedWeek}, {dayNames[selectedDay - 1]}</span>
              </p>
            </div>
          )}
        </div>

        {/* Workout List */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading workouts...</div>
          ) : filteredWorkouts.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No workouts found. Create some template workouts first!
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredWorkouts.map(workout => (
                <button
                  key={workout.id}
                  onClick={() => setSelectedWorkoutId(workout.id)}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    selectedWorkoutId === workout.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white">{workout.name}</h3>
                    {workout.category && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getCategoryColor(workout.category)}`}>
                        {workout.category.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  {workout.estimated_duration_minutes && (
                    <div className="text-sm text-gray-400">
                      {workout.estimated_duration_minutes} min
                    </div>
                  )}
                  {workout.tags && workout.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {workout.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-neutral-800 rounded text-xs text-gray-400">
                          {tag}
                        </span>
                      ))}
                      {workout.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{workout.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <div className="text-sm text-gray-400">
            {selectedWorkoutId && (
              <>Will copy to Week {selectedWeek}, {dayNames[selectedDay - 1]}</>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddWorkout}
              disabled={!selectedWorkoutId || copying}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {copying ? 'Copying...' : 'Add to Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
