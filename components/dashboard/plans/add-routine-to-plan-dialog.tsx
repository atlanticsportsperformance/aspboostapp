'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Routine {
  id: string;
  name: string;
  scheme: string;
  category: string | null;
  tags: string[] | null;
  description: string | null;
  routine_exercises: {
    id: string;
    exercise_id: string | null;
    exercises: {
      name: string;
    } | null;
  }[];
}

interface AddRoutineToPlanDialogProps {
  planId: string;
  weekNumber?: number;
  dayNumber?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddRoutineToPlanDialog({
  planId,
  weekNumber,
  dayNumber,
  onClose,
  onSuccess
}: AddRoutineToPlanDialogProps) {
  const supabase = createClient();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const ROUTINE_CATEGORIES = [
    { value: 'hitting', label: 'Hitting' },
    { value: 'throwing', label: 'Throwing' },
    { value: 'strength_conditioning', label: 'Strength & Conditioning' }
  ] as const;

  useEffect(() => {
    fetchRoutines();
  }, []);

  async function fetchRoutines() {
    setLoading(true);

    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        routine_exercises (
          id,
          exercise_id,
          exercises (name)
        )
      `)
      .eq('is_standalone', true)
      .is('workout_id', null)
      .is('plan_id', null)
      .is('athlete_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching routines:', error);
    } else {
      setRoutines(data || []);
    }

    setLoading(false);
  }

  async function handleAddRoutine() {
    if (!selectedRoutineId) {
      alert('Please select a routine');
      return;
    }

    setCopying(true);

    try {
      // Fetch the full routine with all exercises
      const { data: sourceRoutine, error: fetchError } = await supabase
        .from('routines')
        .select(`
          *,
          routine_exercises (
            *,
            exercises (*)
          )
        `)
        .eq('id', selectedRoutineId)
        .single();

      if (fetchError || !sourceRoutine) {
        console.error('Error fetching routine:', fetchError);
        alert('Failed to load routine');
        setCopying(false);
        return;
      }

      // Step 1: Create a wrapper workout for this routine
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          name: sourceRoutine.name,
          category: sourceRoutine.category,
          is_template: false,
          plan_id: planId,
          athlete_id: null,
          source_workout_id: null,
          placeholder_definitions: { placeholders: [] }
        })
        .select()
        .single();

      if (workoutError || !newWorkout) {
        console.error('Error creating workout:', workoutError);
        alert('Failed to create workout');
        setCopying(false);
        return;
      }

      // Step 2: Copy the routine and link to the new workout
      const { data: newRoutine, error: routineError } = await supabase
        .from('routines')
        .insert({
          workout_id: newWorkout.id,
          name: sourceRoutine.name,
          scheme: sourceRoutine.scheme,
          description: sourceRoutine.description,
          superset_block_name: sourceRoutine.superset_block_name,
          text_info: sourceRoutine.text_info,
          order_index: 0,
          is_standalone: false,
          plan_id: planId,
          athlete_id: null,
          category: sourceRoutine.category,
          tags: sourceRoutine.tags
        })
        .select()
        .single();

      if (routineError || !newRoutine) {
        console.error('Error copying routine:', routineError);
        alert('Failed to copy routine');
        setCopying(false);
        return;
      }

      // Step 3: Copy all exercises from the routine
      if (sourceRoutine.routine_exercises && sourceRoutine.routine_exercises.length > 0) {
        const exercisesToInsert = sourceRoutine.routine_exercises.map((ex: any) => ({
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

        const { error: exercisesError } = await supabase
          .from('routine_exercises')
          .insert(exercisesToInsert);

        if (exercisesError) {
          console.error('Error copying exercises:', exercisesError);
          console.error('Error details:', JSON.stringify(exercisesError, null, 2));
          alert(`Failed to copy exercises: ${exercisesError.message || 'Unknown error'}`);
          setCopying(false);
          return;
        }
      }

      // Step 4: If week/day specified, assign to program_days
      if (weekNumber && dayNumber) {
        const { error: programDayError } = await supabase
          .from('program_days')
          .insert({
            plan_id: planId,
            week_number: weekNumber,
            day_number: dayNumber,
            workout_id: newWorkout.id,
            order_index: 0
          });

        if (programDayError) {
          console.error('Error assigning to program day:', programDayError);
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
      setCopying(false);
    }
  }

  const filteredRoutines = routines.filter(routine => {
    const matchesSearch = routine.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || routine.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  function getCategoryColor(category: string | null) {
    const colors: { [key: string]: string } = {
      hitting: 'bg-red-500',
      throwing: 'bg-blue-500',
      strength_conditioning: 'bg-green-500',
    };
    return colors[category?.toLowerCase() || ''] || 'bg-neutral-500';
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Add Routine from Library</h2>
            <p className="text-sm text-gray-400 mt-1">
              Select a routine template to add to your plan
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search routines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {ROUTINE_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Routine List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-gray-400 text-center py-8">Loading routines...</div>
          ) : filteredRoutines.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              No routines found. Create routines in the Routines Library first.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRoutines.map((routine) => (
                <label
                  key={routine.id}
                  className={`relative flex flex-col p-4 rounded-lg cursor-pointer transition-all border-2 ${
                    selectedRoutineId === routine.id
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-white/5 hover:bg-white/10 border-transparent hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="routine"
                    value={routine.id}
                    checked={selectedRoutineId === routine.id}
                    onChange={() => setSelectedRoutineId(routine.id)}
                    className="absolute top-4 right-4 w-4 h-4"
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${getCategoryColor(routine.category)}`} />
                    <div className="text-white font-medium">{routine.name}</div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {routine.scheme.replace('_', ' ')} • {routine.routine_exercises?.length || 0} exercises
                  </div>
                  {routine.description && (
                    <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {routine.description}
                    </div>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={copying}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleAddRoutine}
            disabled={!selectedRoutineId || copying}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copying ? 'Adding...' : 'Add Routine'}
          </button>
        </div>
      </div>
    </div>
  );
}
