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
    <div className="flex flex-col h-screen bg-black">
      {/* Top Header Bar */}
      <div className="border-b border-neutral-800 bg-black/30 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/dashboard/routines"
              className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <span>←</span> Back to Routines
            </Link>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-neutral-800/50 border border-neutral-600 hover:bg-neutral-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-all"
              >
                {saving ? 'Saving...' : 'Save Routine'}
              </button>
            </div>
          </div>

          {/* Routine Header - Ultra Compact */}
          <div className="space-y-2">
            {/* Name */}
            <input
              type="text"
              value={routine.name}
              onChange={(e) => setRoutine({ ...routine, name: e.target.value })}
              onBlur={handleSave}
              className="w-full text-2xl font-semibold bg-transparent border-b border-neutral-700 hover:border-neutral-500 focus:border-neutral-400 text-white outline-none transition-colors pb-1"
              placeholder="Routine name..."
            />

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
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <RoutineSidebar
          exercises={sortedExercises}
          selectedExerciseId={selectedExerciseId}
          onSelectExercise={setSelectedExerciseId}
          onDeleteExercise={handleDeleteExercise}
          onMoveExercise={handleMoveExercise}
          onAddExercise={() => setShowAddExercise(true)}
          getPlaceholderName={getPlaceholderName}
        />

        {/* Detail Panel */}
        <ExerciseDetailPanel
          routine={routine}
          exercise={selectedExercise || null}
          onUpdate={(updates) => selectedExercise && handleUpdateExercise(selectedExercise.id, updates)}
          onDelete={() => selectedExercise && handleDeleteExercise(selectedExercise.id)}
        />
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
          onClose={() => setShowAddExercise(false)}
        />
      )}
    </div>
  );
}
