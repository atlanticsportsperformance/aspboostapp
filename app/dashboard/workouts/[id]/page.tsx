'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import WorkoutSidebar from '@/components/dashboard/workouts/workout-sidebar';
import ExerciseDetailPanel from '@/components/dashboard/workouts/exercise-detail-panel';
import SupersetDetailPanel from '@/components/dashboard/workouts/superset-detail-panel';
import WorkoutTagsEditor from '@/components/dashboard/workouts/workout-tags-editor';
import { AddExerciseDialog } from '@/components/dashboard/workouts/add-exercise-dialog';
import ImportRoutineDialog from '@/components/dashboard/workouts/import-routine-dialog';
import { AssignWorkoutDialog } from '@/components/dashboard/workouts/assign-workout-dialog';

interface Measurement {
  id: string;
  name: string;
  type: string;
  unit: string;
  enabled: boolean;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  tags: string[];
  metric_schema?: {
    measurements: Measurement[];
  };
}

interface SetConfiguration {
  set_number: number;
  reps?: number;
  intensity_type?: 'percent_1rm' | 'rpe' | 'load' | 'none';
  intensity_value?: number;
  time_seconds?: number;
  rest_seconds?: number;
  notes?: string;
}

interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string | null;
  is_placeholder: boolean;
  placeholder_id: string | null;
  order_index: number;
  sets: number | null;
  reps_min: number | null;
  reps_max: number | null;
  time_seconds: number | null;
  percent_1rm: number | null;
  rpe_target: number | null;
  rest_seconds: number | null;
  notes: string | null;
  metric_targets?: Record<string, any>;
  intensity_targets?: any[] | null;
  set_configurations: SetConfiguration[] | null;
  exercises: Exercise | null;
}

interface Routine {
  id: string;
  workout_id: string;
  name: string;
  scheme: string;
  order_index: number;
  rest_between_rounds_seconds: number | null;
  notes: string | null;
  superset_block_name: string | null;
  text_info: string | null;
  routine_exercises: RoutineExercise[];
}

interface PlaceholderDef {
  id: string;
  name: string;
  category_hint?: string;
}

interface Workout {
  id: string;
  name: string;
  estimated_duration_minutes: number | null;
  notes: string | null;
  is_template: boolean;
  tags?: string[];
  category?: 'hitting' | 'throwing' | 'strength_conditioning';
  placeholder_definitions: {
    placeholders: PlaceholderDef[];
  };
  routines: Routine[];
}

export default function WorkoutBuilderPage() {
  const params = useParams();
  const workoutId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showImportRoutine, setShowImportRoutine] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  useEffect(() => {
    fetchWorkout();
  }, [workoutId]);

  async function fetchWorkout() {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        routines (
          *,
          routine_exercises (
            *,
            exercises (*)
          )
        )
      `)
      .eq('id', workoutId)
      .single();

    if (error) {
      console.error('Error fetching workout:', error);
      alert('Failed to load workout');
      router.push('/dashboard/workouts');
      return;
    }

    // Sort routines and exercises
    if (data.routines) {
      data.routines.sort((a, b) => a.order_index - b.order_index);
      data.routines.forEach((r: Routine) => {
        if (r.routine_exercises) {
          r.routine_exercises.sort((a, b) => a.order_index - b.order_index);
        }
      });
    }

    setWorkout(data);
    setLoading(false);
  }

  async function handleSave() {
    if (!workout) return;
    setSaving(true);

    const updateData: any = {
      name: workout.name,
      estimated_duration_minutes: workout.estimated_duration_minutes,
      notes: workout.notes,
    };

    // Only include tags if the column exists (after migration)
    if (workout.tags !== undefined) {
      updateData.tags = workout.tags || [];
    }

    // Only include category if the column exists (after migration)
    if (workout.category !== undefined) {
      updateData.category = workout.category;
    }

    const { error } = await supabase
      .from('workouts')
      .update(updateData)
      .eq('id', workoutId);

    if (error) {
      console.error('Error saving workout:', error);
      alert('Failed to save');
    }

    setSaving(false);
  }

  async function handleUpdateTags(tags: string[]) {
    if (!workout) return;
    setWorkout({ ...workout, tags });

    // Auto-save tags
    const { error } = await supabase
      .from('workouts')
      .update({ tags })
      .eq('id', workoutId);

    if (error) {
      console.error('Error updating tags:', error);
    }
  }

  async function handleAddExercise(exerciseId: string, isPlaceholder: boolean, placeholderId?: string, placeholderName?: string, categoryHint?: string) {
    if (!workout) return;

    // If adding a new placeholder, add it to placeholder_definitions first
    if (isPlaceholder && placeholderName) {
      const newPlaceholderId = placeholderId || `ph_${Date.now()}`;
      const newPlaceholder = {
        id: newPlaceholderId,
        name: placeholderName,
        category_hint: categoryHint
      };

      const updatedPlaceholders = [
        ...(workout.placeholder_definitions?.placeholders || []),
        newPlaceholder
      ];

      // Update workout with new placeholder definition
      const { error: updateError } = await supabase
        .from('workouts')
        .update({
          placeholder_definitions: { placeholders: updatedPlaceholders }
        })
        .eq('id', workoutId);

      if (updateError) {
        console.error('Error updating placeholder definitions:', updateError);
        alert('Failed to create placeholder');
        return;
      }

      placeholderId = newPlaceholderId;
    }

    const newRoutineOrder = workout.routines.length;

    const { data: newRoutine, error: routineError } = await supabase
      .from('routines')
      .insert({
        workout_id: workoutId,
        name: 'Exercise',
        scheme: 'straight',
        order_index: newRoutineOrder
      })
      .select()
      .single();

    if (routineError || !newRoutine) {
      console.error('Error creating routine:', routineError);
      alert(`Failed: ${routineError?.message || 'Unknown error'}`);
      return;
    }

    const exerciseData = {
      routine_id: newRoutine.id,
      exercise_id: isPlaceholder ? null : exerciseId,
      is_placeholder: isPlaceholder,
      placeholder_id: placeholderId || null,
      order_index: 0
    };

    const { data: newExercise, error: exerciseError } = await supabase
      .from('routine_exercises')
      .insert(exerciseData)
      .select()
      .single();

    if (exerciseError) {
      console.error('Error adding exercise:', exerciseError);
      alert(`Failed to add exercise: ${exerciseError.message}`);
      return;
    }

    setShowAddExercise(false);
    await fetchWorkout();

    // Auto-select the newly added exercise
    if (newExercise) {
      setSelectedRoutineId(newRoutine.id);
      setSelectedExerciseId(newExercise.id);
    }
  }

  async function handleCreateBlock() {
    // Create an empty block at the bottom
    const maxOrderIndex = Math.max(...(workout?.routines.map(r => r.order_index) || [0]));

    const { data: newRoutine, error: routineError } = await supabase
      .from('routines')
      .insert({
        workout_id: workoutId,
        name: 'New Block',
        scheme: 'superset',
        order_index: maxOrderIndex + 1
      })
      .select()
      .single();

    if (routineError || !newRoutine) {
      console.error('Error creating block:', routineError);
      alert('Failed to create block');
      return;
    }

    await fetchWorkout();

    // Auto-select the new block
    setSelectedRoutineId(newRoutine.id);
    setSelectedExerciseId(null);
  }

  async function handleLinkExerciseToBlock(exerciseId: string, targetRoutineId: string) {
    // Find the current routine for this exercise
    const currentRoutine = workout?.routines.find(r =>
      r.routine_exercises.some(e => e.id === exerciseId)
    );

    if (!currentRoutine) return;

    // Get the target routine to determine the next order_index
    const targetRoutine = workout?.routines.find(r => r.id === targetRoutineId);
    const nextOrderIndex = targetRoutine?.routine_exercises.length || 0;

    // Move the exercise to the target block
    await supabase
      .from('routine_exercises')
      .update({
        routine_id: targetRoutineId,
        order_index: nextOrderIndex
      })
      .eq('id', exerciseId);

    // If the old routine was a 'straight' routine with only this exercise, delete it
    if (currentRoutine.scheme === 'straight' && currentRoutine.routine_exercises.length === 1) {
      await supabase
        .from('routines')
        .delete()
        .eq('id', currentRoutine.id);
    }

    fetchWorkout();
  }

  async function handleUpdateExercise(updates: Partial<RoutineExercise>) {
    if (!selectedExerciseId) return;

    await supabase
      .from('routine_exercises')
      .update(updates)
      .eq('id', selectedExerciseId);

    // Refetch workout to update UI
    fetchWorkout();
  }

  async function handleDeleteExerciseFromPanel() {
    if (!selectedExerciseId) return;
    handleDeleteExercise(selectedExerciseId);
  }

  async function handleDeleteExercise(exerciseId: string) {
    if (!confirm('Delete this exercise?')) return;

    // Find the exercise's routine
    const routine = workout?.routines.find(r =>
      r.routine_exercises.some(e => e.id === exerciseId)
    );

    if (!routine) return;

    // Delete the exercise
    await supabase
      .from('routine_exercises')
      .delete()
      .eq('id', exerciseId);

    // If this was the last exercise in the routine, delete the routine too
    if (routine.routine_exercises.length === 1) {
      await supabase
        .from('routines')
        .delete()
        .eq('id', routine.id);
    }

    // Clear selection if we deleted the selected exercise
    if (selectedExerciseId === exerciseId) {
      setSelectedExerciseId(null);
      setSelectedRoutineId(null);
    }

    fetchWorkout();
  }

  async function handleDeleteRoutineFromSidebar(routineId: string) {
    if (!confirm('Delete this block and all its exercises?')) return;

    await supabase
      .from('routines')
      .delete()
      .eq('id', routineId);

    // Clear selection if we deleted the selected routine
    if (selectedRoutineId === routineId) {
      setSelectedRoutineId(null);
      setSelectedExerciseId(null);
    }

    fetchWorkout();
  }

  function handleSelectExercise(routineId: string, exerciseId: string) {
    setSelectedRoutineId(routineId);
    setSelectedExerciseId(exerciseId);
  }

  function handleSelectRoutine(routineId: string) {
    setSelectedRoutineId(routineId);
    setSelectedExerciseId(null); // Clear exercise selection when selecting routine
  }

  async function handleUpdateRoutine(updates: Partial<Routine>) {
    if (!selectedRoutineId || !workout) return;

    // Update in database
    await supabase
      .from('routines')
      .update(updates)
      .eq('id', selectedRoutineId);

    // Update local state instead of refetching
    setWorkout({
      ...workout,
      routines: workout.routines.map(r =>
        r.id === selectedRoutineId ? { ...r, ...updates } : r
      )
    });
  }

  async function handleDeleteRoutine() {
    if (!selectedRoutineId) return;
    if (!confirm('Delete this block and all its exercises?')) return;

    await supabase
      .from('routines')
      .delete()
      .eq('id', selectedRoutineId);

    setSelectedRoutineId(null);
    setSelectedExerciseId(null);
    fetchWorkout();
  }

  function toggleExerciseSelection(exerciseId: string) {
    setSelectedExerciseIds(prev =>
      prev.includes(exerciseId)
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  }

  if (loading || !workout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading workout...</div>
      </div>
    );
  }

  const selectedRoutine = workout.routines.find(r => r.id === selectedRoutineId);
  const selectedExercise = selectedRoutine?.routine_exercises.find(e => e.id === selectedExerciseId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 flex flex-col">
      {/* Top Bar */}
      <div className="border-b border-neutral-800 bg-black/30 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/dashboard/workouts" className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2">
              <span>←</span> Back to Workouts
            </Link>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAssignDialog(true)}
                className="px-4 py-2 bg-neutral-900/50 border border-neutral-700 hover:bg-neutral-800/50 text-neutral-300 hover:text-white rounded-md text-sm font-medium transition-all"
              >
                Assign to Athletes
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-neutral-800/50 border border-neutral-600 hover:bg-neutral-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-all"
              >
                {saving ? 'Saving...' : 'Save Workout'}
              </button>
            </div>
          </div>

          {/* Workout Header - Ultra Compact */}
          <div className="space-y-2">
            {/* Name */}
            <input
              type="text"
              value={workout.name}
              onChange={(e) => setWorkout({ ...workout, name: e.target.value })}
              onBlur={handleSave}
              className="w-full text-2xl font-semibold bg-transparent border-b border-neutral-700 hover:border-neutral-500 focus:border-neutral-400 text-white outline-none transition-colors pb-1"
              placeholder="Workout name..."
            />

            {/* Compact Grid: Duration, Category, Notes, Tags */}
            <div className="grid grid-cols-12 gap-2 items-start">
              {/* Duration */}
              <div className="col-span-2">
                <label className="block text-xs text-neutral-400 mb-1">Duration</label>
                <input
                  type="number"
                  value={workout.estimated_duration_minutes || ''}
                  onChange={(e) => setWorkout({ ...workout, estimated_duration_minutes: e.target.value ? parseInt(e.target.value) : null })}
                  onBlur={handleSave}
                  className="w-full px-2 py-1.5 bg-neutral-950/50 border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-neutral-500 transition-colors"
                  placeholder="60"
                />
              </div>

              {/* Category */}
              <div className="col-span-3">
                <label className="block text-xs text-neutral-400 mb-1">Category</label>
                <select
                  value={workout.category || 'strength_conditioning'}
                  onChange={(e) => setWorkout({ ...workout, category: e.target.value as 'hitting' | 'throwing' | 'strength_conditioning' })}
                  onBlur={handleSave}
                  className="w-full px-2 py-1.5 bg-neutral-950/50 border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-neutral-500 transition-colors [&>option]:bg-neutral-900 [&>option]:text-white"
                >
                  <option value="hitting">Hitting</option>
                  <option value="throwing">Throwing</option>
                  <option value="strength_conditioning">Strength & Conditioning</option>
                </select>
              </div>

              {/* Notes */}
              <div className="col-span-4">
                <label className="block text-xs text-neutral-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={workout.notes || ''}
                  onChange={(e) => setWorkout({ ...workout, notes: e.target.value })}
                  onBlur={handleSave}
                  className="w-full px-2 py-1.5 bg-neutral-950/50 border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-neutral-500 transition-colors"
                  placeholder="Add notes..."
                />
              </div>

              {/* Tags */}
              <div className="col-span-3">
                <label className="block text-xs text-neutral-400 mb-1">Tags</label>
                <WorkoutTagsEditor
                  tags={workout.tags || []}
                  onUpdate={handleUpdateTags}
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <WorkoutSidebar
          routines={workout.routines}
          selectedExerciseId={selectedExerciseId}
          selectedRoutineId={selectedRoutineId}
          onSelectExercise={handleSelectExercise}
          onSelectRoutine={handleSelectRoutine}
          onDeleteExercise={handleDeleteExercise}
          onDeleteRoutine={handleDeleteRoutineFromSidebar}
          onAddExercise={() => setShowAddExercise(true)}
          onImportRoutine={() => setShowImportRoutine(true)}
          onCreateBlock={handleCreateBlock}
          onLinkExerciseToBlock={handleLinkExerciseToBlock}
        />

        {/* Right Detail Panel - Show Superset or Exercise Details */}
        {selectedRoutineId && !selectedExerciseId && selectedRoutine?.scheme !== 'straight' ? (
          <SupersetDetailPanel
            routine={selectedRoutine}
            onUpdate={handleUpdateRoutine}
            onDelete={handleDeleteRoutine}
            onSelectExercise={(exerciseId) => handleSelectExercise(selectedRoutineId, exerciseId)}
          />
        ) : (
          <ExerciseDetailPanel
            routine={selectedRoutine || null}
            exercise={selectedExercise || null}
            onUpdate={handleUpdateExercise}
            onDelete={handleDeleteExerciseFromPanel}
          />
        )}
      </div>

      {/* Dialogs */}
      {showAddExercise && (
        <AddExerciseDialog
          workout={workout}
          onAdd={handleAddExercise}
          onClose={() => setShowAddExercise(false)}
        />
      )}

      {showImportRoutine && (
        <ImportRoutineDialog
          onImport={async (sourceRoutineId: string) => {
            if (!workout) return;

            // Fetch the source routine with all its exercises
            const { data: sourceRoutine, error: fetchError } = await supabase
              .from('routines')
              .select(`
                *,
                routine_exercises (*)
              `)
              .eq('id', sourceRoutineId)
              .single();

            if (fetchError || !sourceRoutine) {
              console.error('Error fetching source routine:', fetchError);
              alert('Failed to import routine');
              return;
            }

            // Calculate the next order_index for the new routine
            const maxOrderIndex = Math.max(...(workout.routines.map(r => r.order_index) || [0]));

            // Create a new routine in this workout (copy of the source)
            const { data: newRoutine, error: routineError } = await supabase
              .from('routines')
              .insert({
                workout_id: workoutId,
                name: sourceRoutine.name,
                scheme: sourceRoutine.scheme,
                order_index: maxOrderIndex + 1,
                rest_between_rounds_seconds: sourceRoutine.rest_between_rounds_seconds,
                notes: sourceRoutine.notes,
                superset_block_name: sourceRoutine.superset_block_name,
                text_info: sourceRoutine.text_info
              })
              .select()
              .single();

            if (routineError || !newRoutine) {
              console.error('Error creating routine:', routineError);
              alert('Failed to import routine');
              return;
            }

            // Copy all exercises from the source routine
            if (sourceRoutine.routine_exercises && sourceRoutine.routine_exercises.length > 0) {
              const exercisesToCopy = sourceRoutine.routine_exercises.map((ex: any) => ({
                routine_id: newRoutine.id,
                exercise_id: ex.exercise_id,
                is_placeholder: ex.is_placeholder,
                placeholder_id: ex.placeholder_id,
                order_index: ex.order_index,
                sets: ex.sets,
                reps: ex.reps,
                rest_seconds: ex.rest_seconds,
                notes: ex.notes,
                metric_targets: ex.metric_targets,
                intensity_targets: ex.intensity_targets,
                set_configurations: ex.set_configurations
              }));

              const { error: exercisesError } = await supabase
                .from('routine_exercises')
                .insert(exercisesToCopy);

              if (exercisesError) {
                console.error('Error copying exercises:', exercisesError);
                alert('Failed to copy exercises');
                return;
              }
            }

            setShowImportRoutine(false);
            fetchWorkout();
          }}
          onClose={() => setShowImportRoutine(false)}
        />
      )}

      {showAssignDialog && (
        <AssignWorkoutDialog
          workout={workout}
          onClose={() => setShowAssignDialog(false)}
        />
      )}
    </div>
  );
}
