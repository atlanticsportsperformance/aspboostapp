'use client';

import { useState } from 'react';
import { AddExerciseDialog } from './add-exercise-dialog';
import { ExerciseTargetsForm } from './exercise-targets-form';

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
  target_reps: number | null;
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

interface Workout {
  id: string;
  placeholder_definitions: {
    placeholders: Array<{
      id: string;
      name: string;
      category_hint?: string;
    }>;
  };
}

interface RoutineCardProps {
  routine: Routine;
  workout: Workout;
  onUpdate: (updates: Partial<Routine>) => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
  onAddExercise: (exerciseId: string, isPlaceholder: boolean, placeholderId?: string) => void;
  onUpdateExercise: (exerciseId: string, updates: Partial<RoutineExercise>) => void;
  onMoveExercise: (exerciseId: string, direction: 'up' | 'down') => void;
  onDeleteExercise: (exerciseId: string) => void;
}

export function RoutineCard({
  routine,
  workout,
  onUpdate,
  onMove,
  onDelete,
  onAddExercise,
  onUpdateExercise,
  onMoveExercise,
  onDeleteExercise
}: RoutineCardProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const getPlaceholderName = (placeholderId: string) => {
    const placeholder = workout.placeholder_definitions?.placeholders?.find(
      p => p.id === placeholderId
    );
    return placeholder?.name || 'Unknown Placeholder';
  };

  const getBorderColor = () => {
    if (routine.scheme === 'superset') return 'border-l-4 border-blue-500';
    if (routine.scheme === 'circuit') return 'border-l-4 border-purple-500';
    if (routine.scheme === 'emom') return 'border-l-4 border-green-500';
    if (routine.scheme === 'amrap') return 'border-l-4 border-yellow-500';
    return '';
  };

  return (
    <div className={`bg-white/5 border border-white/10 rounded-lg p-4 ${getBorderColor()}`}>
      {/* Routine Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={routine.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="flex-1 px-3 py-1.5 bg-white/10 border border-white/20 rounded text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {routine.superset_block_name && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-sm rounded">
                {routine.superset_block_name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">Scheme:</label>
              <select
                value={routine.scheme}
                onChange={(e) => onUpdate({ scheme: e.target.value })}
                className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="straight">Straight Sets</option>
                <option value="superset">Superset</option>
                <option value="circuit">Circuit</option>
                <option value="emom">EMOM</option>
                <option value="amrap">AMRAP</option>
              </select>
            </div>

            {routine.scheme !== 'straight' && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Block Name:</label>
                <input
                  type="text"
                  value={routine.superset_block_name || ''}
                  onChange={(e) => onUpdate({ superset_block_name: e.target.value || null })}
                  placeholder="e.g., A1/A2"
                  className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {routine.text_info && (
            <div className="mt-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-300 text-sm">
              {routine.text_info}
            </div>
          )}
        </div>

        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onMove('up')}
            className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors"
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => onMove('down')}
            className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors"
            title="Move down"
          >
            ↓
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-colors"
            title="Delete routine"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-2">
        {routine.routine_exercises.map((exercise, index) => (
          <div
            key={exercise.id}
            className="bg-white/[0.02] border border-white/5 rounded-lg p-4"
          >
            {/* Exercise Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm font-medium">
                    {index + 1}.
                  </span>
                  <span className="text-white font-medium">
                    {exercise.is_placeholder ? (
                      <span className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">
                          PLACEHOLDER
                        </span>
                        <span>{getPlaceholderName(exercise.placeholder_id!)}</span>
                      </span>
                    ) : (
                      exercise.exercises?.name || 'Unknown Exercise'
                    )}
                  </span>
                </div>
                {exercise.exercises?.category && !exercise.is_placeholder && (
                  <div className="mt-1">
                    <span className="px-2 py-0.5 bg-white/10 text-gray-400 text-xs rounded">
                      {exercise.exercises.category.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-1 ml-4">
                <button
                  onClick={() => onMoveExercise(exercise.id, 'up')}
                  className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors text-sm"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => onMoveExercise(exercise.id, 'down')}
                  className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors text-sm"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => onDeleteExercise(exercise.id)}
                  className="p-1 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-colors text-sm"
                  title="Delete exercise"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Exercise Targets Form */}
            <ExerciseTargetsForm
              routineExercise={exercise}
              onChange={(updates) => onUpdateExercise(exercise.id, updates)}
            />
          </div>
        ))}
      </div>

      {/* Add Exercise Button */}
      <button
        onClick={() => setShowAddDialog(true)}
        className="mt-3 w-full px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors text-sm font-medium"
      >
        + Add Exercise
      </button>

      {/* Add Exercise Dialog */}
      {showAddDialog && (
        <AddExerciseDialog
          workout={workout}
          onClose={() => setShowAddDialog(false)}
          onAdd={onAddExercise}
        />
      )}
    </div>
  );
}
