'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Routine {
  id: string;
  name: string;
  scheme: string;
  notes: string | null;
  routine_exercises: any[];
}

interface AddRoutineToAthleteModalProps {
  athleteId: string;
  date: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddRoutineToAthleteModal({
  athleteId,
  date,
  onClose,
  onSuccess
}: AddRoutineToAthleteModalProps) {
  const supabase = createClient();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [schemeFilter, setSchemeFilter] = useState('all');
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchRoutines();
  }, []);

  async function fetchRoutines() {
    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        routine_exercises (*)
      `)
      .eq('is_standalone', true)
      .is('athlete_id', null)
      .is('plan_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching routines:', error);
    } else {
      setRoutines(data || []);
    }

    setLoading(false);
  }

  const filteredRoutines = routines.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScheme = schemeFilter === 'all' || r.scheme === schemeFilter;
    return matchesSearch && matchesScheme;
  });

  async function handleAddRoutine() {
    if (!selectedRoutineId) {
      alert('Please select a routine');
      return;
    }

    setAdding(true);

    try {
      const selectedRoutine = routines.find(r => r.id === selectedRoutineId);
      if (!selectedRoutine) return;

      // Step 1: Create a workout for this routine
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          name: selectedRoutine.name,
          is_template: false,
          athlete_id: athleteId,
          plan_id: null,
          source_workout_id: null,
          placeholder_definitions: { placeholders: [] }
        })
        .select()
        .single();

      if (workoutError || !newWorkout) {
        console.error('Error creating workout:', workoutError);
        alert('Failed to create workout');
        setAdding(false);
        return;
      }

      // Step 2: Copy the routine to the new workout
      const { data: newRoutine, error: routineError } = await supabase
        .from('routines')
        .insert({
          workout_id: newWorkout.id,
          name: selectedRoutine.name,
          scheme: selectedRoutine.scheme,
          order_index: 0,
          rest_between_rounds_seconds: selectedRoutine.rest_between_rounds_seconds,
          notes: selectedRoutine.notes,
          superset_block_name: selectedRoutine.superset_block_name,
          text_info: selectedRoutine.text_info,
          is_standalone: false,
          athlete_id: athleteId,
          plan_id: null,
          source_routine_id: selectedRoutineId
        })
        .select()
        .single();

      if (routineError || !newRoutine) {
        console.error('Error copying routine:', routineError);
        alert('Failed to copy routine');
        setAdding(false);
        return;
      }

      // Step 3: Copy all exercises
      if (selectedRoutine.routine_exercises && selectedRoutine.routine_exercises.length > 0) {
        const exerciseCopies = selectedRoutine.routine_exercises.map(ex => {
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
            console.log('🔧 [Routine Import] Auto-populated enabled_measurements from metric_targets:', exerciseCopy.enabled_measurements);
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

      // Step 4: Create workout instance
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
        alert('Failed to schedule routine');
        setAdding(false);
        return;
      }

      console.log('✅ Routine added successfully!');
      alert('Routine added successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
      setAdding(false);
    }
  }

  const getSchemeBadge = (scheme: string) => {
    const schemes: Record<string, { label: string; color: string }> = {
      straight: { label: 'Straight Sets', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
      superset: { label: 'Superset', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
      circuit: { label: 'Circuit', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      emom: { label: 'EMOM', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
      amrap: { label: 'AMRAP', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
      giant_set: { label: 'Giant Set', color: 'bg-red-500/20 text-red-300 border-red-500/30' }
    };
    const config = schemes[scheme] || schemes.straight;
    return (
      <span className={`px-2 py-0.5 rounded text-xs border ${config.color}`}>
        {config.label}
      </span>
    );
  };

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
            <h2 className="text-xl font-bold text-white">Add Routine from Library</h2>
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
            placeholder="Search routines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSchemeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                schemeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
              }`}
            >
              All
            </button>
            {['straight', 'superset', 'circuit', 'emom', 'amrap', 'giant_set'].map(scheme => (
              <button
                key={scheme}
                onClick={() => setSchemeFilter(scheme)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  schemeFilter === scheme
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                }`}
              >
                {scheme.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Routine List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading routines...</div>
          ) : filteredRoutines.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No routines found. Try adjusting your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredRoutines.map((routine) => {
                const exerciseCount = routine.routine_exercises?.length || 0;

                return (
                  <button
                    key={routine.id}
                    onClick={() => setSelectedRoutineId(routine.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selectedRoutineId === routine.id
                        ? 'bg-blue-500/20 border-blue-500'
                        : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-white font-medium flex-1">{routine.name}</h3>
                      {selectedRoutineId === routine.id && (
                        <svg className="w-5 h-5 text-blue-400 shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {getSchemeBadge(routine.scheme)}
                    </div>

                    {routine.notes && (
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                        {routine.notes}
                      </p>
                    )}

                    <div className="text-sm text-gray-400">
                      {exerciseCount} Exercise{exerciseCount !== 1 ? 's' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-neutral-800">
          <p className="text-sm text-gray-400">
            {selectedRoutineId ? 'Routine selected' : 'Select a routine to continue'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={adding}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRoutine}
              disabled={adding || !selectedRoutineId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add to Calendar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
