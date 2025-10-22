'use client';

import { useState } from 'react';
import ExerciseItem from './exercise-item';

interface Exercise {
  id: string;
  name: string;
  category: string;
}

interface RoutineExercise {
  id: string;
  exercise_id: string | null;
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
  name: string;
  scheme: string;
  order_index: number;
  rest_between_rounds_seconds: number | null;
  notes: string | null;
  superset_block_name: string | null;
  text_info: string | null;
  routine_exercises: RoutineExercise[];
}

interface ExerciseGroupProps {
  routine: Routine;
  selectedExercises: string[];
  onSelectExercise: (exerciseId: string) => void;
  onUpdateRoutine: (updates: Partial<Routine>) => void;
  onUpdateExercise: (exerciseId: string, updates: Partial<RoutineExercise>) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onMoveExercise: (exerciseId: string, direction: 'up' | 'down') => void;
  onDeleteGroup: () => void;
  onMoveGroup: (direction: 'up' | 'down') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export default function ExerciseGroup({
  routine,
  selectedExercises,
  onSelectExercise,
  onUpdateRoutine,
  onUpdateExercise,
  onDeleteExercise,
  onMoveExercise,
  onDeleteGroup,
  onMoveGroup,
  canMoveUp,
  canMoveDown
}: ExerciseGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const [editingName, setEditingName] = useState(false);

  const sortedExercises = [...routine.routine_exercises].sort((a, b) => a.order_index - b.order_index);

  const getSchemeBadge = () => {
    const schemes: Record<string, { label: string; color: string }> = {
      straight: { label: 'Straight Sets', color: 'bg-gray-500/20 text-gray-300' },
      superset: { label: 'Superset', color: 'bg-blue-500/20 text-blue-300' },
      circuit: { label: 'Circuit', color: 'bg-purple-500/20 text-purple-300' },
      emom: { label: 'EMOM', color: 'bg-green-500/20 text-green-300' },
      amrap: { label: 'AMRAP', color: 'bg-yellow-500/20 text-yellow-300' },
      giant_set: { label: 'Giant Set', color: 'bg-red-500/20 text-red-300' }
    };
    const config = schemes[routine.scheme] || schemes.straight;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getBorderColor = () => {
    if (routine.scheme === 'superset') return 'border-l-blue-500';
    if (routine.scheme === 'circuit') return 'border-l-purple-500';
    if (routine.scheme === 'emom') return 'border-l-green-500';
    if (routine.scheme === 'amrap') return 'border-l-yellow-500';
    if (routine.scheme === 'giant_set') return 'border-l-red-500';
    return 'border-l-gray-500';
  };

  return (
    <div className={`bg-white/5 border border-white/10 rounded-lg overflow-hidden ${routine.scheme !== 'straight' ? `border-l-4 ${getBorderColor()}` : ''}`}>
      {/* Group Header */}
      <div className="p-4 bg-white/5 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 flex-1">
            {/* Order Controls */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onMoveGroup('up')}
                disabled={!canMoveUp}
                className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↑
              </button>
              <button
                onClick={() => onMoveGroup('down')}
                disabled={!canMoveDown}
                className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↓
              </button>
            </div>

            {/* Group Name */}
            {editingName ? (
              <input
                type="text"
                value={routine.name}
                onChange={(e) => onUpdateRoutine({ name: e.target.value })}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                autoFocus
                className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white"
              />
            ) : (
              <h3
                onClick={() => setEditingName(true)}
                className="text-lg font-semibold text-white cursor-pointer hover:text-blue-400"
              >
                {routine.name}
              </h3>
            )}

            {getSchemeBadge()}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white"
            >
              {expanded ? '▼' : '▶'}
            </button>
            <button
              onClick={onDeleteGroup}
              className="px-3 py-1 text-sm text-red-400 hover:text-red-300"
            >
              Delete Group
            </button>
          </div>
        </div>

        {/* Group Settings */}
        {expanded && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Scheme</label>
              <select
                value={routine.scheme}
                onChange={(e) => onUpdateRoutine({ scheme: e.target.value })}
                className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
              >
                <option value="straight">Straight Sets</option>
                <option value="superset">Superset</option>
                <option value="circuit">Circuit</option>
                <option value="emom">EMOM</option>
                <option value="amrap">AMRAP</option>
                <option value="giant_set">Giant Set</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Rest Between Rounds (s)</label>
              <input
                type="number"
                value={routine.rest_between_rounds_seconds || ''}
                onChange={(e) => onUpdateRoutine({ rest_between_rounds_seconds: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                placeholder="180"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Group Notes</label>
              <textarea
                value={routine.notes || ''}
                onChange={(e) => onUpdateRoutine({ notes: e.target.value })}
                rows={2}
                className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                placeholder="Add notes for this group..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Group Exercises */}
      {expanded && (
        <div className="p-4 space-y-3">
          {sortedExercises.length === 0 ? (
            <div className="text-center text-gray-400 py-4">
              No exercises in this group
            </div>
          ) : (
            sortedExercises.map((exercise, index) => (
              <ExerciseItem
                key={exercise.id}
                exercise={exercise}
                isSelected={selectedExercises.includes(exercise.id)}
                onSelect={() => onSelectExercise(exercise.id)}
                onUpdate={(updates) => onUpdateExercise(exercise.id, updates)}
                onDelete={() => onDeleteExercise(exercise.id)}
                onMoveUp={() => onMoveExercise(exercise.id, 'up')}
                onMoveDown={() => onMoveExercise(exercise.id, 'down')}
                canMoveUp={index > 0}
                canMoveDown={index < sortedExercises.length - 1}
                showGroupIndicator={routine.scheme !== 'straight'}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
