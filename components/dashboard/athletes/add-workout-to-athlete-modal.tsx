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

interface AddWorkoutToAthleteModalProps {
  athleteId: string;
  date: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddWorkoutToAthleteModal({
  athleteId,
  date,
  onClose,
  onSuccess
}: AddWorkoutToAthleteModalProps) {
  const supabase = createClient();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const WORKOUT_CATEGORIES = [
    { value: 'hitting', label: 'Hitting' },
    { value: 'throwing', label: 'Throwing' },
    { value: 'strength_conditioning', label: 'Strength & Conditioning' }
  ] as const;

  useEffect(() => {
    fetchWorkouts();
  }, []);

  async function fetchWorkouts() {
    setLoading(true);
    // Fetch template workouts only
    const { data, error } = await supabase
      .from('workouts')
      .select('id, name, category, estimated_duration_minutes, tags')
      .eq('is_template', true)
      .is('plan_id', null)
      .is('athlete_id', null)
      .order('name');

    if (error) {
      console.error('Error fetching workouts:', error);
    } else {
      console.log('✅ Template workouts available:', data?.length);
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

    try {
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

      // Step 2: Create an athlete-owned copy of the workout
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          name: templateWorkout.name,
          estimated_duration_minutes: templateWorkout.estimated_duration_minutes,
          notes: templateWorkout.notes,
          is_template: false,
          tags: templateWorkout.tags,
          category: templateWorkout.category,
          plan_id: null,
          athlete_id: athleteId,
          source_workout_id: templateWorkout.id,
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
              athlete_id: athleteId,
              plan_id: null,
              source_routine_id: routine.id
            })
            .select()
            .single();

          if (routineError || !newRoutine) {
            console.error('Error copying routine:', routineError);
            continue;
          }

          // Step 4: Copy exercises for this routine
          if (routine.routine_exercises && routine.routine_exercises.length > 0) {
            const exerciseCopies = routine.routine_exercises.map(ex => {
              const exerciseCopy: any = {
                routine_id: newRoutine.id,
                exercise_id: ex.exercise_id,
                order_index: ex.order_index,
                sets: ex.sets,
                reps_min: ex.reps_min,
                reps_max: ex.reps_max,
                time_seconds: ex.time_seconds,
                percent_1rm: ex.percent_1rm,
                rpe_target: ex.rpe_target,
                rest_seconds: ex.rest_seconds,
                notes: ex.notes,
                is_placeholder: ex.is_placeholder,
                placeholder_id: ex.placeholder_id,
                placeholder_name: ex.placeholder_name,
                metric_targets: ex.metric_targets,
                intensity_targets: ex.intensity_targets,
                set_configurations: ex.set_configurations,
                tracked_max_metrics: ex.tracked_max_metrics,
                is_amrap: ex.is_amrap
              };

              // Handle enabled_measurements - auto-populate from metric_targets if missing
              if (ex.enabled_measurements && ex.enabled_measurements.length > 0) {
                exerciseCopy.enabled_measurements = ex.enabled_measurements;
              } else if (ex.metric_targets && Object.keys(ex.metric_targets).length > 0) {
                // CRITICAL FIX: If enabled_measurements is missing but metric_targets exists,
                // auto-populate enabled_measurements from metric_targets keys
                exerciseCopy.enabled_measurements = Object.keys(ex.metric_targets);
                console.log('🔧 Auto-populated enabled_measurements from metric_targets:', exerciseCopy.enabled_measurements);
              }

              return exerciseCopy;
            });

            const { error: exerciseError } = await supabase
              .from('routine_exercises')
              .insert(exerciseCopies);

            if (exerciseError) {
              console.error('Error copying exercises:', exerciseError);
            }
          }
        }
      }

      // Step 5: Create workout instance for the selected date
      const { error: instanceError } = await supabase
        .from('workout_instances')
        .insert({
          workout_id: newWorkout.id,
          athlete_id: athleteId,
          scheduled_date: date,
          status: 'not_started'
        });

      if (instanceError) {
        console.error('Error creating workout instance:', instanceError);
        alert('Failed to schedule workout');
        setCopying(false);
        return;
      }

      console.log('✅ Workout copied and scheduled successfully!');
      alert('Workout added successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
      setCopying(false);
    }
  }

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-neutral-800">
          <div>
            <h2 className="text-xl font-bold text-white">Add Workout from Library</h2>
            <p className="text-sm text-gray-400 mt-1">{formattedDate}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-neutral-800 space-y-3">
          <input
            type="text"
            placeholder="Search workouts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
              }`}
            >
              All
            </button>
            {WORKOUT_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  categoryFilter === cat.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Workout List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading workouts...</div>
          ) : filteredWorkouts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No workouts found. Try adjusting your filters.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWorkouts.map(workout => (
                <button
                  key={workout.id}
                  onClick={() => setSelectedWorkoutId(workout.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedWorkoutId === workout.id
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{workout.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {workout.category && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(workout.category)}`}>
                            {workout.category === 'strength_conditioning' ? 'Strength & Conditioning' :
                             workout.category.charAt(0).toUpperCase() + workout.category.slice(1)}
                          </span>
                        )}
                        {workout.estimated_duration_minutes && (
                          <span className="text-xs text-gray-400">
                            {workout.estimated_duration_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedWorkoutId === workout.id && (
                      <svg className="w-5 h-5 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-neutral-800">
          <p className="text-sm text-gray-400">
            {selectedWorkoutId ? 'Workout selected' : 'Select a workout to continue'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={copying}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddWorkout}
              disabled={copying || !selectedWorkoutId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {copying ? 'Adding...' : 'Add to Calendar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
