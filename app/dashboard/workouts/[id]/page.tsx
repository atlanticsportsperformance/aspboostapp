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
  placeholder_name: string | null;
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
  plan_id: string | null;
  athlete_id: string | null;
  source_workout_id: string | null;
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
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Determine ownership context
  function getWorkoutContext() {
    if (!workout) return 'template';
    if (workout.athlete_id) return 'athlete';
    if (workout.plan_id) return 'plan';
    return 'template';
  }

  function getContextBadge() {
    const context = getWorkoutContext();
    const badges = {
      template: { label: 'Template Library', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      plan: { label: 'Plan-Owned', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
      athlete: { label: 'Athlete-Owned', color: 'bg-green-500/20 text-green-300 border-green-500/30' }
    };
    return badges[context];
  }

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

    // Log workout context
    console.log('=== WORKOUT LOADED ===');
    console.log('Workout ID:', data.id);
    console.log('is_template:', data.is_template);
    console.log('plan_id:', data.plan_id);
    console.log('athlete_id:', data.athlete_id);

    const context = data.athlete_id ? 'athlete' : data.plan_id ? 'plan' : 'template';
    console.log('Context:', context.toUpperCase());

    if (context === 'plan') {
      console.log('✅ This is a PLAN workout (should NOT appear in library)');
    } else if (context === 'template') {
      console.log('✅ This is a TEMPLATE (should appear in library)');
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

  async function handleAddExercise(
    exerciseId: string,
    isPlaceholder: boolean,
    placeholderId?: string,
    placeholderName?: string,
    categoryHint?: string,
    sets?: string,
    reps?: string,
    intensity?: string
  ) {
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

    const { data: newRoutine, error: routineError} = await supabase
      .from('routines')
      .insert({
        workout_id: workoutId,
        name: 'Exercise',
        scheme: 'straight',
        order_index: newRoutineOrder,
        is_standalone: false,
        plan_id: workout.plan_id || null,      // ✅ Inherit from workout
        athlete_id: workout.athlete_id || null // ✅ Inherit from workout
      })
      .select()
      .single();

    if (routineError || !newRoutine) {
      console.error('❌ Error creating routine:', routineError);
      alert(`Failed: ${routineError?.message || 'Unknown error'}`);
      return;
    }

    console.log('✅ Routine created');
    console.log('✅ Inherited plan_id:', newRoutine.plan_id);
    console.log('✅ Inherited athlete_id:', newRoutine.athlete_id);

    const exerciseData: any = {
      routine_id: newRoutine.id,
      exercise_id: isPlaceholder ? null : exerciseId,
      is_placeholder: isPlaceholder,
      placeholder_id: placeholderId || null,
      placeholder_name: isPlaceholder ? placeholderName : null,
      order_index: 0
    };

    // Add sets/reps/intensity if provided (for placeholders)
    if (sets) {
      exerciseData.sets = parseInt(sets) || null;
    }
    if (reps) {
      const repsNum = parseInt(reps);
      exerciseData.reps_min = repsNum || null;
      exerciseData.reps_max = repsNum || null;
    }
    if (intensity) {
      exerciseData.notes = intensity;
    }

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

  async function handleAddMultipleExercises(exerciseIds: string[]) {
    if (!workout || exerciseIds.length === 0) return;

    // Create routines and exercises for each selected exercise
    const routinesToCreate = exerciseIds.map((_, index) => ({
      workout_id: workoutId,
      name: 'Exercise',
      scheme: 'straight',
      order_index: workout.routines.length + index,
      is_standalone: false,
      plan_id: workout.plan_id || null,
      athlete_id: workout.athlete_id || null
    }));

    const { data: newRoutines, error: routineError } = await supabase
      .from('routines')
      .insert(routinesToCreate)
      .select();

    if (routineError || !newRoutines) {
      console.error('Error creating routines:', routineError);
      alert('Failed to add exercises');
      return;
    }

    // Create routine_exercises for each
    const exercisesToInsert = exerciseIds.map((exerciseId, index) => ({
      routine_id: newRoutines[index].id,
      exercise_id: exerciseId,
      is_placeholder: false,
      placeholder_id: null,
      placeholder_name: null,
      order_index: 0
    }));

    const { data: newExercises, error: exerciseError } = await supabase
      .from('routine_exercises')
      .insert(exercisesToInsert)
      .select();

    if (exerciseError) {
      console.error('Error adding exercises:', exerciseError);
      alert('Failed to add exercises');
      return;
    }

    setShowAddExercise(false);
    await fetchWorkout();

    // Auto-select the first newly added exercise
    if (newRoutines.length > 0 && newExercises && newExercises.length > 0) {
      setSelectedRoutineId(newRoutines[0].id);
      setSelectedExerciseId(newExercises[0].id);
    }
  }

  async function handleAddMultiplePlaceholders(placeholderIds: string[]) {
    console.log('🔵 handleAddMultiplePlaceholders called with:', placeholderIds);
    if (!workout || placeholderIds.length === 0) {
      console.log('❌ No workout or empty placeholderIds');
      return;
    }

    // Create routines for each selected placeholder
    const routinesToCreate = placeholderIds.map((_, index) => ({
      workout_id: workoutId,
      name: 'Exercise',
      scheme: 'straight',
      order_index: workout.routines.length + index,
      is_standalone: false,
      plan_id: workout.plan_id || null,
      athlete_id: workout.athlete_id || null
    }));

    const { data: newRoutines, error: routineError } = await supabase
      .from('routines')
      .insert(routinesToCreate)
      .select();

    if (routineError || !newRoutines) {
      console.error('Error creating routines:', routineError);
      alert('Failed to add placeholders');
      return;
    }

    // Create routine_exercises for each placeholder
    // Placeholders from library are real exercises with is_placeholder=true in exercises table
    const exercisesToInsert = placeholderIds.map((placeholderId, index) => ({
      routine_id: newRoutines[index].id,
      exercise_id: placeholderId,  // Placeholder exercises are real exercises
      is_placeholder: false,        // Not using old placeholder system
      placeholder_id: null,
      placeholder_name: null,
      order_index: 0,
      sets: 3                       // Default 3 sets
    }));

    const { data: newExercises, error: exerciseError } = await supabase
      .from('routine_exercises')
      .insert(exercisesToInsert)
      .select(`*, exercises (id, name, category, tags, description, metric_schema)`);

    if (exerciseError) {
      console.error('Error adding placeholders:', exerciseError);
      alert('Failed to add placeholders');
      return;
    }

    setShowAddExercise(false);
    await fetchWorkout();

    // Auto-select the first newly added placeholder
    if (newRoutines.length > 0 && newExercises && newExercises.length > 0) {
      setSelectedRoutineId(newRoutines[0].id);
      setSelectedExerciseId(newExercises[0].id);
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
        order_index: maxOrderIndex + 1,
        is_standalone: false,
        plan_id: workout.plan_id || null,      // ✅ Inherit from workout
        athlete_id: workout.athlete_id || null // ✅ Inherit from workout
      })
      .select()
      .single();

    if (routineError || !newRoutine) {
      console.error('❌ Error creating block:', routineError);
      alert('Failed to create block');
      return;
    }

    console.log('✅ Block created');
    console.log('✅ Inherited plan_id:', newRoutine.plan_id);

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
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/dashboard/workouts" className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2 text-sm lg:text-base">
              <span>←</span> <span className="hidden sm:inline">Back to Workouts</span><span className="sm:hidden">Back</span>
            </Link>
            <div className="flex gap-2 lg:gap-3">
              <button
                onClick={() => setShowAssignDialog(true)}
                className="hidden sm:block px-3 lg:px-4 py-2 bg-neutral-900/50 border border-neutral-700 hover:bg-neutral-800/50 text-neutral-300 hover:text-white rounded-md text-xs lg:text-sm font-medium transition-all"
              >
                Assign
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 lg:px-4 py-2 bg-neutral-800/50 border border-neutral-600 hover:bg-neutral-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs lg:text-sm font-medium transition-all"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Workout Header - Responsive */}
          <div className="space-y-3">
            {/* Name and Context Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <input
                type="text"
                value={workout.name}
                onChange={(e) => setWorkout({ ...workout, name: e.target.value })}
                onBlur={handleSave}
                className="w-full sm:flex-1 text-xl lg:text-2xl font-semibold bg-transparent border-b border-neutral-700 hover:border-neutral-500 focus:border-neutral-400 text-white outline-none transition-colors pb-1"
                placeholder="Workout name..."
              />
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${getContextBadge().color}`}>
                {getContextBadge().label}
              </span>
            </div>

            {/* Responsive Grid: Duration, Category, Notes, Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 lg:gap-2 items-start">
              {/* Duration */}
              <div className="sm:col-span-1 lg:col-span-2">
                <label className="block text-xs text-neutral-400 mb-1">Duration (min)</label>
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
              <div className="sm:col-span-1 lg:col-span-3">
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
              <div className="sm:col-span-2 lg:col-span-4">
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
              <div className="sm:col-span-2 lg:col-span-3">
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
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden lg:block">
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
        </div>

        {/* Mobile Sidebar - Slide-up drawer */}
        {showMobileSidebar && (
          <>
            {/* Overlay */}
            <div
              className="lg:hidden fixed inset-0 bg-black/70 z-40"
              onClick={() => setShowMobileSidebar(false)}
            />
            {/* Drawer */}
            <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-neutral-950 border-t border-neutral-800 rounded-t-2xl max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Routines & Exercises</h2>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-2 hover:bg-neutral-800/50 rounded text-neutral-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <WorkoutSidebar
                  routines={workout.routines}
                  selectedExerciseId={selectedExerciseId}
                  selectedRoutineId={selectedRoutineId}
                  onSelectExercise={(routineId, exerciseId) => {
                    handleSelectExercise(routineId, exerciseId);
                    setShowMobileSidebar(false);
                  }}
                  onSelectRoutine={(routineId) => {
                    handleSelectRoutine(routineId);
                    setShowMobileSidebar(false);
                  }}
                  onDeleteExercise={handleDeleteExercise}
                  onDeleteRoutine={handleDeleteRoutineFromSidebar}
                  onAddExercise={() => {
                    setShowAddExercise(true);
                    setShowMobileSidebar(false);
                  }}
                  onImportRoutine={() => {
                    setShowImportRoutine(true);
                    setShowMobileSidebar(false);
                  }}
                  onCreateBlock={handleCreateBlock}
                  onLinkExerciseToBlock={handleLinkExerciseToBlock}
                />
              </div>
            </div>
          </>
        )}

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

      {/* Mobile Floating Buttons - OUTSIDE overflow container */}
      <div className="lg:hidden fixed bottom-20 right-4 z-[60] flex flex-col gap-3">
        {/* Import Routine Button */}
        <button
          onClick={() => setShowImportRoutine(true)}
          className="w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
          title="Import Routine"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        </button>

        {/* Add Exercise Button */}
        <button
          onClick={() => setShowAddExercise(true)}
          className="w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
          title="Add Exercise"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Show Routines Button */}
        <button
          onClick={() => setShowMobileSidebar(true)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
          title="Show Routines"
        >
          <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {workout.routines && workout.routines.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                {workout.routines.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Dialogs */}
      {showAddExercise && (
        <AddExerciseDialog
          workout={workout}
          onAdd={handleAddExercise}
          onAddMultiple={handleAddMultipleExercises}
          onAddMultiplePlaceholders={handleAddMultiplePlaceholders}
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
            // Preserve scheme, but if 'straight', convert to 'circuit' to ensure it displays as a block
            const preservedScheme = sourceRoutine.scheme === 'straight' ? 'circuit' : sourceRoutine.scheme;
            console.log(`📋 Source scheme: "${sourceRoutine.scheme}" → Importing as: "${preservedScheme}"`);

            const { data: newRoutine, error: routineError } = await supabase
              .from('routines')
              .insert({
                workout_id: workoutId,
                name: sourceRoutine.name,
                scheme: preservedScheme,  // Preserve superset/circuit, convert straight
                order_index: maxOrderIndex + 1,
                rest_between_rounds_seconds: sourceRoutine.rest_between_rounds_seconds,
                notes: sourceRoutine.notes,
                superset_block_name: sourceRoutine.superset_block_name || sourceRoutine.name,
                text_info: sourceRoutine.text_info,
                is_standalone: false,
                plan_id: workout.plan_id || null,      // ✅ Inherit from workout
                athlete_id: workout.athlete_id || null, // ✅ Inherit from workout
                source_routine_id: sourceRoutine.id    // ✅ Track lineage
              })
              .select()
              .single();

            if (routineError || !newRoutine) {
              console.error('❌ Error importing routine:', routineError);
              alert('Failed to import routine');
              return;
            }

            // Copy all exercises from the source routine
            if (sourceRoutine.routine_exercises && sourceRoutine.routine_exercises.length > 0) {
              console.log('📋 Source routine exercises:', sourceRoutine.routine_exercises);

              const exercisesToCopy = sourceRoutine.routine_exercises.map((ex: any) => {
                const exerciseData: any = {
                  routine_id: newRoutine.id,
                  exercise_id: ex.exercise_id,
                  order_index: ex.order_index,
                  sets: ex.sets || 3
                };

                // Only include optional fields if they exist
                if (ex.rest_seconds != null) exerciseData.rest_seconds = ex.rest_seconds;
                if (ex.notes) exerciseData.notes = ex.notes;
                if (ex.metric_targets) exerciseData.metric_targets = ex.metric_targets;
                if (ex.intensity_targets) exerciseData.intensity_targets = ex.intensity_targets;
                if (ex.set_configurations) exerciseData.set_configurations = ex.set_configurations;
                if (ex.enabled_measurements) exerciseData.enabled_measurements = ex.enabled_measurements;
                if (ex.is_amrap != null) exerciseData.is_amrap = ex.is_amrap;

                return exerciseData;
              });

              console.log('📤 Exercises to insert:', exercisesToCopy);

              const { error: exercisesError } = await supabase
                .from('routine_exercises')
                .insert(exercisesToCopy);

              if (exercisesError) {
                console.error('❌ Error copying exercises:', exercisesError);
                console.error('❌ Full error details:', JSON.stringify(exercisesError, null, 2));
                alert('Failed to copy exercises');
                return;
              }

              console.log('✅ Exercises copied successfully');
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
