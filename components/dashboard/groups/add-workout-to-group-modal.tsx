'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Search, Calendar, Clock } from 'lucide-react';

interface Workout {
  id: string;
  name: string;
  category: string | null;
  estimated_duration_minutes: number | null;
  notes: string | null;
  is_template: boolean;
  routines_count?: number;
}

interface AddWorkoutToGroupModalProps {
  groupId: string;
  initialDate: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddWorkoutToGroupModal({
  groupId,
  initialDate,
  onClose,
  onAdded
}: AddWorkoutToGroupModalProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState<Workout[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [scheduledDate, setScheduledDate] = useState(initialDate);
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [autoAssign, setAutoAssign] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchWorkouts();
  }, []);

  useEffect(() => {
    // Filter workouts based on search term
    if (searchTerm.trim() === '') {
      setFilteredWorkouts(workouts);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredWorkouts(
        workouts.filter(
          w =>
            w.name.toLowerCase().includes(term) ||
            w.category?.toLowerCase().includes(term) ||
            w.notes?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, workouts]);

  async function fetchWorkouts() {
    // Fetch template workouts (global library)
    const { data: templateWorkouts, error } = await supabase
      .from('workouts')
      .select(`
        *,
        routines(id)
      `)
      .eq('is_template', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workouts:', error);
    } else {
      // Add routines count
      const enriched = (templateWorkouts || []).map(w => ({
        ...w,
        routines_count: w.routines?.length || 0,
        routines: undefined // Remove nested data
      }));
      setWorkouts(enriched);
      setFilteredWorkouts(enriched);
    }

    setLoading(false);
  }

  async function handleAddWorkout() {
    if (!selectedWorkoutId || !scheduledDate) {
      alert('Please select a workout and date');
      return;
    }

    setSaving(true);

    try {
      // Step 1: Fetch the template workout with all details
      const { data: templateWorkout, error: workoutError } = await supabase
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

      if (workoutError || !templateWorkout) {
        throw new Error('Failed to fetch workout');
      }

      // Step 2: Create a group-owned copy of the workout
      const { data: newWorkout, error: createError } = await supabase
        .from('workouts')
        .insert({
          name: templateWorkout.name,
          category: templateWorkout.category,
          is_template: false,
          group_id: groupId, // Mark as group-owned
          source_workout_id: templateWorkout.id, // Track source
          estimated_duration_minutes: templateWorkout.estimated_duration_minutes,
          notes: templateWorkout.notes,
          tags: templateWorkout.tags,
          is_active: true
        })
        .select()
        .single();

      if (createError || !newWorkout) {
        throw new Error('Failed to create workout copy');
      }

      // Step 3: Copy all routines and exercises
      if (templateWorkout.routines && templateWorkout.routines.length > 0) {
        for (const routine of templateWorkout.routines) {
          // Copy routine
          const { data: newRoutine, error: routineError } = await supabase
            .from('routines')
            .insert({
              workout_id: newWorkout.id,
              name: routine.name,
              scheme: routine.scheme,
              order_index: routine.order_index,
              is_standalone: false,
              group_id: groupId, // Mark as group-owned
              source_routine_id: routine.id // Track source
            })
            .select()
            .single();

          if (routineError || !newRoutine) {
            throw new Error('Failed to copy routine');
          }

          // Copy routine exercises
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
                metric_targets: ex.metric_targets,
                intensity_targets: ex.intensity_targets,
                set_configurations: ex.set_configurations,
                tracked_max_metrics: ex.tracked_max_metrics,
                notes: ex.notes,
                is_amrap: ex.is_amrap,
                is_placeholder: ex.is_placeholder,
                placeholder_id: ex.placeholder_id,
                placeholder_name: ex.placeholder_name
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

            const { error: exercisesError } = await supabase
              .from('routine_exercises')
              .insert(exerciseCopies);

            if (exercisesError) {
              throw new Error('Failed to copy exercises');
            }
          }
        }
      }

      // Step 4: Create the group workout schedule
      // The database trigger will auto-create instances for all group members
      const { data: { user } } = await supabase.auth.getUser();

      const { error: scheduleError } = await supabase
        .from('group_workout_schedules')
        .insert({
          group_id: groupId,
          workout_id: newWorkout.id,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime || null,
          notes: notes || null,
          auto_assign: autoAssign,
          created_by: user?.id
        });

      if (scheduleError) {
        throw new Error('Failed to create schedule');
      }

      // Success!
      console.log('✅ Workout added to group calendar successfully');
      onAdded();
    } catch (err: any) {
      console.error('Error adding workout to group:', err);
      alert(`Failed to add workout: ${err.message}`);
      setSaving(false);
    }
  }

  function getCategoryColor(category: string | null) {
    switch (category?.toLowerCase()) {
      case 'hitting':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'throwing':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'strength_conditioning':
        return 'bg-green-500/10 border-green-500/30 text-green-400';
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
    }
  }

  function formatCategory(category: string | null) {
    if (!category) return 'General';
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' & ');
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Add Workout from Library</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search workouts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
            />
          </div>

          {/* Workout Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Workout *
            </label>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading workouts...</div>
            ) : filteredWorkouts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {searchTerm ? 'No workouts found' : 'No workouts available. Create a workout template first.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredWorkouts.map((workout) => (
                  <button
                    key={workout.id}
                    onClick={() => setSelectedWorkoutId(workout.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedWorkoutId === workout.id
                        ? 'bg-[#9BDDFF]/10 border-[#9BDDFF] ring-2 ring-[#9BDDFF]/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{workout.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {workout.category && (
                            <span className={`text-xs px-2 py-0.5 rounded border ${getCategoryColor(workout.category)}`}>
                              {formatCategory(workout.category)}
                            </span>
                          )}
                          {workout.estimated_duration_minutes && (
                            <span className="text-xs text-gray-400">
                              {workout.estimated_duration_minutes} min
                            </span>
                          )}
                          {workout.routines_count! > 0 && (
                            <span className="text-xs text-gray-400">
                              {workout.routines_count} routines
                            </span>
                          )}
                        </div>
                        {workout.notes && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{workout.notes}</p>
                        )}
                      </div>
                      {selectedWorkoutId === workout.id && (
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#9BDDFF] flex items-center justify-center">
                          <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  Date *
                </div>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  Time (optional)
                </div>
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent resize-none"
              placeholder="Any special instructions for the group..."
            />
          </div>

          {/* Auto-assign toggle */}
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
            <input
              type="checkbox"
              id="auto-assign"
              checked={autoAssign}
              onChange={(e) => setAutoAssign(e.target.checked)}
              className="w-4 h-4 text-[#9BDDFF] bg-white/5 border-white/20 rounded focus:ring-2 focus:ring-[#9BDDFF]"
            />
            <label htmlFor="auto-assign" className="flex-1 cursor-pointer">
              <div className="text-sm font-medium text-white">Auto-assign to all members</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Automatically create workout instances for all group members and sync updates
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddWorkout}
            disabled={saving || !selectedWorkoutId || !scheduledDate}
            className="flex-1 px-4 py-2 bg-[#9BDDFF] text-black rounded-lg hover:bg-[#7BC5F0] disabled:opacity-50 transition-colors font-medium"
          >
            {saving ? 'Adding Workout...' : 'Add to Group Calendar'}
          </button>
        </div>
      </div>
    </div>
  );
}
