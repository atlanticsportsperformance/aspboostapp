'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AddExerciseDialog } from '@/components/dashboard/workouts/add-exercise-dialog';
import ExerciseDetailPanel from '@/components/dashboard/workouts/exercise-detail-panel';
import RoutineSidebar from '@/components/dashboard/routines/routine-sidebar';
import WorkoutTagsEditor from '@/components/dashboard/workouts/workout-tags-editor';

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
  description?: string | null;
  metric_schema?: {
    measurements: Measurement[];
  };
}

interface IntensityTarget {
  id: string;
  metric: string;
  metric_label: string;
  percent: number;
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
  rest_seconds: number | null;
  notes: string | null;
  metric_targets?: Record<string, any>;
  intensity_targets?: IntensityTarget[] | null;
  set_configurations?: any[] | null;
  exercises: Exercise | null;
}

interface PlaceholderDef {
  id: string;
  name: string;
  category_hint?: string;
}

interface Routine {
  id: string;
  name: string;
  scheme: string;
  description: string | null;
  superset_block_name: string | null;
  text_info: string | null;
  rest_between_rounds_seconds: number | null;
  notes: string | null;
  is_standalone: boolean;
  tags?: string[];
  category?: 'hitting' | 'throwing' | 'strength_conditioning';
  plan_id: string | null;
  athlete_id: string | null;
  source_routine_id: string | null;
  placeholder_definitions: {
    placeholders: PlaceholderDef[];
  };
  routine_exercises: RoutineExercise[];
}

export default function RoutineBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const routineId = params.id as string;

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Determine ownership context
  function getRoutineContext() {
    if (!routine) return 'template';
    if (routine.athlete_id) return 'athlete';
    if (routine.plan_id) return 'plan';
    return 'template';
  }

  function getContextBadge() {
    const context = getRoutineContext();
    const badges = {
      template: { label: 'Template Library', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      plan: { label: 'Plan-Owned', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
      athlete: { label: 'Athlete-Owned', color: 'bg-green-500/20 text-green-300 border-green-500/30' }
    };
    return badges[context];
  }

  useEffect(() => {
    if (routineId) fetchRoutine();
  }, [routineId]);

  async function fetchRoutine() {
    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        routine_exercises (
          *,
          exercises (id, name, category, tags, description, metric_schema)
        )
      `)
      .eq('id', routineId)
      .eq('is_standalone', true)
      .single();

    if (error) {
      console.error('Error fetching routine:', error);
      alert('Failed to load routine');
      router.push('/dashboard/routines');
    } else {
      setRoutine(data);
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!routine) return;
    setSaving(true);

    const updateData: any = {
      name: routine.name,
      scheme: routine.scheme,
      description: routine.description,
      superset_block_name: routine.superset_block_name,
      text_info: routine.text_info,
      rest_between_rounds_seconds: routine.rest_between_rounds_seconds,
      notes: routine.notes,
      updated_at: new Date().toISOString()
    };

    // Only include tags if the column exists (after migration)
    if (routine.tags !== undefined) {
      updateData.tags = routine.tags || [];
    }

    // Only include category if the column exists (after migration)
    if (routine.category !== undefined) {
      updateData.category = routine.category;
    }

    const { error } = await supabase
      .from('routines')
      .update(updateData)
      .eq('id', routine.id);

    if (error) {
      console.error('Error saving routine:', error);
      alert('Failed to save routine');
    }

    setSaving(false);
  }

  async function handleUpdateTags(tags: string[]) {
    if (!routine) return;
    setRoutine({ ...routine, tags });

    // Auto-save tags
    const { error } = await supabase
      .from('routines')
      .update({ tags })
      .eq('id', routineId);

    if (error) {
      console.error('Error updating tags:', error);
    }
  }

  async function handleAddExercise(exerciseId: string, isPlaceholder: boolean, placeholderId?: string, placeholderName?: string, categoryHint?: string) {
    if (!routine) return;

    // If adding a new placeholder, add it to placeholder_definitions first
    if (isPlaceholder && placeholderName) {
      const newPlaceholderId = placeholderId || `ph_${Date.now()}`;
      const newPlaceholder: PlaceholderDef = {
        id: newPlaceholderId,
        name: placeholderName,
        category_hint: categoryHint
      };

      const updatedPlaceholders = [
        ...(routine.placeholder_definitions?.placeholders || []),
        newPlaceholder
      ];

      // Update routine with new placeholder definition
      const { error: updateError } = await supabase
        .from('routines')
        .update({
          placeholder_definitions: { placeholders: updatedPlaceholders }
        })
        .eq('id', routine.id);

      if (updateError) {
        console.error('Error updating placeholder definitions:', updateError);
        alert('Failed to create placeholder');
        return;
      }

      // Update local state
      setRoutine({
        ...routine,
        placeholder_definitions: { placeholders: updatedPlaceholders }
      });

      placeholderId = newPlaceholderId;
    }

    const maxOrder = Math.max(0, ...routine.routine_exercises.map(e => e.order_index));

    const { data, error } = await supabase
      .from('routine_exercises')
      .insert({
        routine_id: routine.id,
        exercise_id: isPlaceholder ? null : exerciseId,
        is_placeholder: isPlaceholder,
        placeholder_id: placeholderId || null,
        placeholder_name: isPlaceholder ? placeholderName : null,
        order_index: maxOrder + 1,
        sets: 3
      })
      .select(`
        *,
        exercises (id, name, category, tags, description, metric_schema)
      `)
      .single();

    if (error) {
      console.error('Error adding exercise:', error);
      alert('Failed to add exercise');
    } else {
      setRoutine({
        ...routine,
        routine_exercises: [...routine.routine_exercises, data]
      });
      // Auto-select the newly added exercise
      setSelectedExerciseId(data.id);
    }

    setShowAddExercise(false);
  }

  async function handleAddMultipleExercises(exerciseIds: string[]) {
    if (!routine || exerciseIds.length === 0) return;

    const maxOrder = Math.max(0, ...routine.routine_exercises.map(e => e.order_index));

    // Create array of exercises to insert
    const exercisesToInsert = exerciseIds.map((exerciseId, index) => ({
      routine_id: routine.id,
      exercise_id: exerciseId,
      is_placeholder: false,
      placeholder_id: null,
      placeholder_name: null,
      order_index: maxOrder + index + 1,
      sets: 3
    }));

    const { data, error } = await supabase
      .from('routine_exercises')
      .insert(exercisesToInsert)
      .select(`
        *,
        exercises (id, name, category, tags, description, metric_schema)
      `);

    if (error) {
      console.error('Error adding exercises:', error);
      alert('Failed to add exercises');
    } else {
      setRoutine({
        ...routine,
        routine_exercises: [...routine.routine_exercises, ...data]
      });
      // Auto-select the first newly added exercise
      if (data.length > 0) {
        setSelectedExerciseId(data[0].id);
      }
    }

    setShowAddExercise(false);
  }

  async function handleAddMultiplePlaceholders(placeholderIds: string[]) {
    console.log('🔵 Routine: handleAddMultiplePlaceholders called with:', placeholderIds);
    if (!routine || placeholderIds.length === 0) {
      console.log('❌ No routine or empty placeholderIds');
      return;
    }

    const maxOrder = Math.max(0, ...routine.routine_exercises.map(e => e.order_index));

    // Placeholders from library are real exercises with is_placeholder=true
    const exercisesToInsert = placeholderIds.map((placeholderId, index) => ({
      routine_id: routine.id,
      exercise_id: placeholderId,
      is_placeholder: false,
      placeholder_id: null,
      placeholder_name: null,
      order_index: maxOrder + index + 1,
      sets: 3
    }));

    const { data, error } = await supabase
      .from('routine_exercises')
      .insert(exercisesToInsert)
      .select(`
        *,
        exercises (id, name, category, tags, description, metric_schema)
      `);

    if (error) {
      console.error('Error adding placeholders:', error);
      alert('Failed to add placeholders');
    } else {
      setRoutine({
        ...routine,
        routine_exercises: [...routine.routine_exercises, ...data]
      });
      // Auto-select the first newly added placeholder
      if (data.length > 0) {
        setSelectedExerciseId(data[0].id);
      }
    }

    setShowAddExercise(false);
  }

  function getPlaceholderName(placeholderId: string | null): string {
    if (!placeholderId || !routine) return 'Unknown Placeholder';
    const placeholder = routine.placeholder_definitions?.placeholders?.find(p => p.id === placeholderId);
    return placeholder?.name || placeholderId;
  }

  async function handleUpdateExercise(exerciseId: string, updates: Partial<RoutineExercise>) {
    if (!routine) return;

    const { error } = await supabase
      .from('routine_exercises')
      .update(updates)
      .eq('id', exerciseId);

    if (error) {
      console.error('Error updating exercise:', error);
      return;
    }

    setRoutine({
      ...routine,
      routine_exercises: routine.routine_exercises.map(e =>
        e.id === exerciseId ? { ...e, ...updates } : e
      )
    });
  }

  async function handleDeleteExercise(exerciseId: string) {
    if (!routine) return;
    if (!confirm('Remove this exercise?')) return;

    const { error } = await supabase
      .from('routine_exercises')
      .delete()
      .eq('id', exerciseId);

    if (error) {
      console.error('Error deleting exercise:', error);
      alert('Failed to remove exercise');
    } else {
      setRoutine({
        ...routine,
        routine_exercises: routine.routine_exercises.filter(e => e.id !== exerciseId)
      });
      // Clear selection if deleted exercise was selected
      if (selectedExerciseId === exerciseId) {
        setSelectedExerciseId(null);
      }
    }
  }

  async function handleMoveExercise(exerciseId: string, direction: 'up' | 'down') {
    if (!routine) return;

    const exercises = [...routine.routine_exercises].sort((a, b) => a.order_index - b.order_index);
    const currentIndex = exercises.findIndex(e => e.id === exerciseId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= exercises.length) return;

    const currentEx = exercises[currentIndex];
    const targetEx = exercises[targetIndex];

    const { error } = await supabase
      .from('routine_exercises')
      .upsert([
        { id: currentEx.id, order_index: targetEx.order_index },
        { id: targetEx.id, order_index: currentEx.order_index }
      ]);

    if (error) {
      console.error('Error reordering exercises:', error);
    } else {
      fetchRoutine();
    }
  }

  if (loading || !routine) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-neutral-400">Loading routine...</div>
      </div>
    );
  }

  const sortedExercises = [...routine.routine_exercises].sort((a, b) => a.order_index - b.order_index);
  const selectedExercise = routine.routine_exercises.find(e => e.id === selectedExerciseId);

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/dashboard/routines"
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </Link>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : '💾 Save'}
          </button>
        </div>

        {/* Routine Header */}
        <div className="space-y-2">
          {/* Name and Badge */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={routine.name}
              onChange={(e) => setRoutine({ ...routine, name: e.target.value })}
              onBlur={handleSave}
              className="flex-1 text-2xl font-semibold bg-transparent border-b border-neutral-700 hover:border-neutral-500 focus:border-neutral-400 text-white outline-none transition-colors pb-1"
              placeholder="Routine name..."
            />
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${getContextBadge().color}`}>
              {getContextBadge().label}
            </span>
          </div>

          {/* Compact Grid: Scheme, Category, Description, Tags */}
          <div className="grid grid-cols-12 gap-2 items-start">
            {/* Scheme */}
            <div className="col-span-2">
              <label className="block text-xs text-neutral-400 mb-1">Scheme</label>
                <select
                  value={routine.scheme}
                  onChange={(e) => setRoutine({ ...routine, scheme: e.target.value })}
                  onBlur={handleSave}
                  className="w-full px-2 py-1.5 bg-neutral-950/50 border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-neutral-500 transition-colors [&>option]:bg-neutral-900 [&>option]:text-white"
                >
                  <option value="straight">Straight</option>
                  <option value="superset">Superset</option>
                  <option value="circuit">Circuit</option>
                  <option value="emom">EMOM</option>
                  <option value="amrap">AMRAP</option>
                  <option value="giant_set">Giant</option>
                </select>
              </div>

              {/* Category */}
              <div className="col-span-3">
                <label className="block text-xs text-neutral-400 mb-1">Category</label>
                <select
                  value={routine.category || 'strength_conditioning'}
                  onChange={(e) => setRoutine({ ...routine, category: e.target.value as 'hitting' | 'throwing' | 'strength_conditioning' })}
                  onBlur={handleSave}
                  className="w-full px-2 py-1.5 bg-neutral-950/50 border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-neutral-500 transition-colors [&>option]:bg-neutral-900 [&>option]:text-white"
                >
                  <option value="hitting">Hitting</option>
                  <option value="throwing">Throwing</option>
                  <option value="strength_conditioning">Strength & Conditioning</option>
                </select>
              </div>

              {/* Description */}
              <div className="col-span-4">
                <label className="block text-xs text-neutral-400 mb-1">Description</label>
                <input
                  type="text"
                  value={routine.description || ''}
                  onChange={(e) => setRoutine({ ...routine, description: e.target.value })}
                  onBlur={handleSave}
                  className="w-full px-2 py-1.5 bg-neutral-950/50 border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-neutral-500 transition-colors"
                  placeholder="Add description..."
                />
              </div>

              {/* Tags */}
              <div className="col-span-3">
                <label className="block text-xs text-neutral-400 mb-1">Tags</label>
                <WorkoutTagsEditor
                  tags={routine.tags || []}
                  onUpdate={handleUpdateTags}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden lg:block">
          <RoutineSidebar
            exercises={sortedExercises}
            selectedExerciseId={selectedExerciseId}
            onSelectExercise={setSelectedExerciseId}
            onDeleteExercise={handleDeleteExercise}
            onMoveExercise={handleMoveExercise}
            onAddExercise={() => setShowAddExercise(true)}
            getPlaceholderName={getPlaceholderName}
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
                <h2 className="text-lg font-semibold text-white">Exercises ({sortedExercises.length})</h2>
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
                <RoutineSidebar
                  exercises={sortedExercises}
                  selectedExerciseId={selectedExerciseId}
                  onSelectExercise={(id) => {
                    setSelectedExerciseId(id);
                    setShowMobileSidebar(false);
                  }}
                  onDeleteExercise={handleDeleteExercise}
                  onMoveExercise={handleMoveExercise}
                  onAddExercise={() => {
                    setShowAddExercise(true);
                    setShowMobileSidebar(false);
                  }}
                  getPlaceholderName={getPlaceholderName}
                />
              </div>
            </div>
          </>
        )}

        {/* Detail Panel */}
        <ExerciseDetailPanel
          routine={routine}
          exercise={selectedExercise || null}
          onUpdate={(updates) => selectedExercise && handleUpdateExercise(selectedExercise.id, updates)}
          onDelete={() => selectedExercise && handleDeleteExercise(selectedExercise.id)}
        />
      </div>

      {/* Mobile Floating Buttons - OUTSIDE overflow container */}
      <div className="lg:hidden fixed bottom-20 right-4 z-[60] flex flex-col gap-3">
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

        {/* Show Exercises Button */}
        <button
          onClick={() => setShowMobileSidebar(true)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
          title="Show Exercises"
        >
          <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {sortedExercises.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                {sortedExercises.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Add Exercise Dialog */}
      {showAddExercise && (
        <AddExerciseDialog
          workout={{
            id: routineId,
            is_template: true,
            placeholder_definitions: routine.placeholder_definitions || { placeholders: [] }
          }}
          onAdd={handleAddExercise}
          onAddMultiple={handleAddMultipleExercises}
          onAddMultiplePlaceholders={handleAddMultiplePlaceholders}
          onClose={() => setShowAddExercise(false)}
        />
      )}
    </div>
  );
}
