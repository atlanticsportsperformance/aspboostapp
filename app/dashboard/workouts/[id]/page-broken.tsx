'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ExerciseGroup from '@/components/dashboard/workouts/exercise-group';
import { AddExerciseDialog } from '@/components/dashboard/workouts/add-exercise-dialog';
import ImportRoutineDialog from '@/components/dashboard/workouts/import-routine-dialog';
import { AssignWorkoutDialog } from '@/components/dashboard/workouts/assign-workout-dialog';

interface Exercise {
  id: string;
  name: string;
  category: string;
  tags: string[];
}

interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string | null;
  is_placeholder: boolean;
  placeholder_id: string | null;
  order_index: number;
  target_sets: number | null;
  target_reps: string | null;
  target_time_seconds: number | null;
  target_load: number | null;
  intensity_percent: number | null;
  intensity_type: string | null;
  target_rpe: number | null;
  rest_seconds: number | null;
  notes: string | null;
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
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showImportRoutine, setShowImportRoutine] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);

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

    const { error } = await supabase
      .from('workouts')
      .update({
        name: workout.name,
        estimated_duration_minutes: workout.estimated_duration_minutes,
        notes: workout.notes,
        is_template: workout.is_template,
        placeholder_definitions: workout.placeholder_definitions
      })
      .eq('id', workoutId);

    if (error) {
      console.error('Error saving workout:', error);
      alert('Failed to save workout');
    }

    setSaving(false);
  }

  async function handleAddExercise(exerciseId: string, isPlaceholder: boolean, placeholderId?: string) {
    if (!workout) return;

    // Find or create "default" routine for ungrouped exercises
    let defaultRoutine = workout.routines.find(r => r.scheme === 'straight' && r.name === 'Exercises');

    if (!defaultRoutine) {
      const { data, error } = await supabase
        .from('routines')
        .insert({
          workout_id: workoutId,
          name: 'Exercises',
          scheme: 'straight',
          order_index: workout.routines.length
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Error creating default routine:', error);
        return;
      }

      defaultRoutine = { ...data, routine_exercises: [] };
      setWorkout({
        ...workout,
        routines: [...workout.routines, defaultRoutine]
      });
    }

    const maxOrder = Math.max(0, ...defaultRoutine.routine_exercises.map(e => e.order_index));

    const { data: newExercise, error } = await supabase
      .from('routine_exercises')
      .insert({
        routine_id: defaultRoutine.id,
        exercise_id: isPlaceholder ? null : exerciseId,
        is_placeholder: isPlaceholder,
        placeholder_id: placeholderId || null,
        order_index: maxOrder + 1,
        target_sets: 3,
        target_reps: '10'
      })
      .select(`
        *,
        exercises (*)
      `)
      .single();

    if (error) {
      console.error('Error adding exercise:', error);
      return;
    }

    fetchWorkout();
    setShowAddExercise(false);
  }

  async function handleImportRoutine(sourceRoutineId: string) {
    if (!workout) return;

    const { data: sourceRoutine, error: fetchError } = await supabase
      .from('routines')
      .select(`
        *,
        routine_exercises (*)
      `)
      .eq('id', sourceRoutineId)
      .eq('is_standalone', true)
      .single();

    if (fetchError || !sourceRoutine) {
      console.error('Error fetching source routine:', fetchError);
      return;
    }

    const order = workout.routines.length;

    const { data: newRoutine, error: routineError } = await supabase
      .from('routines')
      .insert({
        workout_id: workoutId,
        name: sourceRoutine.name,
        scheme: sourceRoutine.scheme,
        order_index: order,
        rest_between_rounds_seconds: sourceRoutine.rest_between_rounds_seconds,
        notes: sourceRoutine.notes,
        superset_block_name: sourceRoutine.superset_block_name,
        text_info: sourceRoutine.text_info,
        is_standalone: false
      })
      .select()
      .single();

    if (routineError || !newRoutine) {
      console.error('Error creating routine:', routineError);
      return;
    }

    if (sourceRoutine.routine_exercises && sourceRoutine.routine_exercises.length > 0) {
      const exercisesToCopy = sourceRoutine.routine_exercises.map((ex: any) => ({
        routine_id: newRoutine.id,
        exercise_id: ex.exercise_id,
        is_placeholder: ex.is_placeholder,
        placeholder_id: ex.placeholder_id,
        order_index: ex.order_index,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        target_time_seconds: ex.target_time_seconds,
        target_load: ex.target_load,
        intensity_percent: ex.intensity_percent,
        intensity_type: ex.intensity_type,
        target_rpe: ex.target_rpe,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes
      }));

      await supabase.from('routine_exercises').insert(exercisesToCopy);
    }

    await supabase
      .from('routine_imports')
      .insert({
        workout_id: workoutId,
        source_routine_id: sourceRoutineId,
        imported_routine_id: newRoutine.id
      });

    setShowImportRoutine(false);
    fetchWorkout();
  }

  function handleSelectExercise(exerciseId: string) {
    setSelectedExercises(prev =>
      prev.includes(exerciseId)
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  }

  async function handleGroupSelected(groupType: string) {
    if (selectedExercises.length < 2) {
      alert('Select at least 2 exercises to create a group');
      return;
    }

    // Find exercises across all routines
    const exercisesToGroup: { routineId: string; exercise: RoutineExercise }[] = [];
    workout?.routines.forEach(routine => {
      routine.routine_exercises.forEach(ex => {
        if (selectedExercises.includes(ex.id)) {
          exercisesToGroup.push({ routineId: routine.id, exercise: ex });
        }
      });
    });

    // Create new group
    const { data: newRoutine, error } = await supabase
      .from('routines')
      .insert({
        workout_id: workoutId,
        name: `${groupType.charAt(0).toUpperCase() + groupType.slice(1)} Group`,
        scheme: groupType,
        order_index: workout!.routines.length
      })
      .select()
      .single();

    if (error || !newRoutine) {
      console.error('Error creating group:', error);
      return;
    }

    // Move exercises to new group
    for (let i = 0; i < exercisesToGroup.length; i++) {
      await supabase
        .from('routine_exercises')
        .update({
          routine_id: newRoutine.id,
          order_index: i
        })
        .eq('id', exercisesToGroup[i].exercise.id);
    }

    setSelectedExercises([]);
    setShowGroupDialog(false);
    fetchWorkout();
  }

  async function handleUngroupSelected() {
    // Implementation for ungrouping
    alert('Ungroup feature coming soon');
  }

  async function handleUpdateRoutine(routineId: string, updates: Partial<Routine>) {
    await supabase
      .from('routines')
      .update(updates)
      .eq('id', routineId);

    if (workout) {
      setWorkout({
        ...workout,
        routines: workout.routines.map(r =>
          r.id === routineId ? { ...r, ...updates } : r
        )
      });
    }
  }

  async function handleUpdateExercise(routineId: string, exerciseId: string, updates: Partial<RoutineExercise>) {
    await supabase
      .from('routine_exercises')
      .update(updates)
      .eq('id', exerciseId);

    if (workout) {
      setWorkout({
        ...workout,
        routines: workout.routines.map(r =>
          r.id === routineId
            ? {
                ...r,
                routine_exercises: r.routine_exercises.map(e =>
                  e.id === exerciseId ? { ...e, ...updates } : e
                )
              }
            : r
        )
      });
    }
  }

  async function handleDeleteExercise(routineId: string, exerciseId: string) {
    await supabase
      .from('routine_exercises')
      .delete()
      .eq('id', exerciseId);

    fetchWorkout();
  }

  async function handleMoveExercise(routineId: string, exerciseId: string, direction: 'up' | 'down') {
    const routine = workout?.routines.find(r => r.id === routineId);
    if (!routine) return;

    const exercises = [...routine.routine_exercises].sort((a, b) => a.order_index - b.order_index);
    const currentIndex = exercises.findIndex(e => e.id === exerciseId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= exercises.length) return;

    const currentEx = exercises[currentIndex];
    const targetEx = exercises[targetIndex];

    await supabase
      .from('routine_exercises')
      .upsert([
        { id: currentEx.id, order_index: targetEx.order_index },
        { id: targetEx.id, order_index: currentEx.order_index }
      ]);

    fetchWorkout();
  }

  async function handleDeleteRoutine(routineId: string) {
    if (!confirm('Delete this group and all its exercises?')) return;

    await supabase
      .from('routines')
      .delete()
      .eq('id', routineId);

    fetchWorkout();
  }

  async function handleMoveRoutine(routineId: string, direction: 'up' | 'down') {
    if (!workout) return;

    const routines = [...workout.routines].sort((a, b) => a.order_index - b.order_index);
    const currentIndex = routines.findIndex(r => r.id === routineId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= routines.length) return;

    const currentRoutine = routines[currentIndex];
    const targetRoutine = routines[targetIndex];

    await supabase
      .from('routines')
      .upsert([
        { id: currentRoutine.id, order_index: targetRoutine.order_index },
        { id: targetRoutine.id, order_index: currentRoutine.order_index }
      ]);

    fetchWorkout();
  }

  if (loading || !workout) {
    return (
      <div className="p-6">
        <div className="text-gray-400">Loading workout...</div>
      </div>
    );
  }

  const hasSelection = selectedExercises.length > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/workouts"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </Link>
          <input
            type="text"
            value={workout.name}
            onChange={(e) => setWorkout({ ...workout, name: e.target.value })}
            onBlur={handleSave}
            className="text-2xl font-bold bg-transparent border-b border-transparent hover:border-white/20 focus:border-blue-500 text-white outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAssignDialog(true)}
            className="px-4 py-2 bg-green-600/20 border border-green-500/30 hover:bg-green-600/30 text-green-300 rounded-lg transition-colors"
          >
            Assign to Athletes
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Selection Actions */}
      {hasSelection && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-between">
          <span className="text-white">
            {selectedExercises.length} exercise{selectedExercises.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowGroupDialog(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              Group Selected
            </button>
            <button
              onClick={handleUngroupSelected}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm"
            >
              Ungroup
            </button>
            <button
              onClick={() => setSelectedExercises([])}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Groups/Exercises List */}
      <div className="space-y-4 mb-6">
        {workout.routines.map((routine, index) => (
          <ExerciseGroup
            key={routine.id}
            routine={routine}
            selectedExercises={selectedExercises}
            onSelectExercise={handleSelectExercise}
            onUpdateRoutine={(updates) => handleUpdateRoutine(routine.id, updates)}
            onUpdateExercise={(exerciseId, updates) => handleUpdateExercise(routine.id, exerciseId, updates)}
            onDeleteExercise={(exerciseId) => handleDeleteExercise(routine.id, exerciseId)}
            onMoveExercise={(exerciseId, direction) => handleMoveExercise(routine.id, exerciseId, direction)}
            onDeleteGroup={() => handleDeleteRoutine(routine.id)}
            onMoveGroup={(direction) => handleMoveRoutine(routine.id, direction)}
            canMoveUp={index > 0}
            canMoveDown={index < workout.routines.length - 1}
          />
        ))}

        {workout.routines.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="mb-4">No exercises yet. Add your first exercise to get started!</p>
          </div>
        )}
      </div>

      {/* Add Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowAddExercise(true)}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          + Add Exercise
        </button>
        <button
          onClick={() => setShowImportRoutine(true)}
          className="px-4 py-3 bg-white/10 border border-white/20 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
        >
          📥 Import Routine
        </button>
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
          onImport={handleImportRoutine}
          onClose={() => setShowImportRoutine(false)}
        />
      )}

      {showAssignDialog && (
        <AssignWorkoutDialog
          workout={workout}
          onClose={() => setShowAssignDialog(false)}
        />
      )}

      {showGroupDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Create Group</h2>
            <p className="text-gray-400 mb-4">Choose the type of group for the selected exercises:</p>
            <div className="space-y-2">
              {['superset', 'circuit', 'emom', 'amrap', 'giant_set'].map(type => (
                <button
                  key={type}
                  onClick={() => handleGroupSelected(type)}
                  className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-left"
                >
                  {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowGroupDialog(false)}
              className="mt-4 w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
