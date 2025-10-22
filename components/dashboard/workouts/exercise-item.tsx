'use client';

import { useState } from 'react';

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

interface ExerciseItemProps {
  exercise: RoutineExercise;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<RoutineExercise>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  showGroupIndicator?: boolean;
}

export default function ExerciseItem({
  exercise,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  showGroupIndicator = false
}: ExerciseItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white/5 border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-white/10'} rounded-lg p-4 ${showGroupIndicator ? 'ml-6 border-l-4 border-l-blue-500' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="mt-1"
        />

        {/* Order Controls */}
        <div className="flex flex-col gap-1">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↓
          </button>
        </div>

        {/* Exercise Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-white font-medium">{exercise.exercises?.name || 'Unknown Exercise'}</h3>
              <p className="text-sm text-gray-400">{exercise.exercises?.category}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="px-3 py-1 text-sm text-blue-400 hover:text-blue-300"
              >
                {expanded ? 'Collapse' : 'Configure'}
              </button>
              <button
                onClick={onDelete}
                className="px-3 py-1 text-sm text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Quick Summary */}
          {!expanded && (
            <div className="text-sm text-gray-400">
              {exercise.target_sets && `${exercise.target_sets} sets`}
              {exercise.target_reps && ` × ${exercise.target_reps} reps`}
              {exercise.target_time_seconds && ` × ${exercise.target_time_seconds}s`}
              {exercise.rest_seconds && ` | Rest: ${exercise.rest_seconds}s`}
            </div>
          )}

          {/* Expanded Configuration */}
          {expanded && (
            <div className="mt-4 space-y-3 bg-white/5 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sets</label>
                  <input
                    type="number"
                    value={exercise.target_sets || ''}
                    onChange={(e) => onUpdate({ target_sets: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                    placeholder="3"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Reps</label>
                  <input
                    type="text"
                    value={exercise.target_reps || ''}
                    onChange={(e) => onUpdate({ target_reps: e.target.value })}
                    className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                    placeholder="10"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Time (s)</label>
                  <input
                    type="number"
                    value={exercise.target_time_seconds || ''}
                    onChange={(e) => onUpdate({ target_time_seconds: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                    placeholder="30"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Rest (s)</label>
                  <input
                    type="number"
                    value={exercise.rest_seconds || ''}
                    onChange={(e) => onUpdate({ rest_seconds: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                    placeholder="60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Intensity Type</label>
                  <select
                    value={exercise.intensity_type || 'none'}
                    onChange={(e) => onUpdate({ intensity_type: e.target.value === 'none' ? null : e.target.value })}
                    className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                  >
                    <option value="none">None</option>
                    <option value="percent_1rm">% 1RM</option>
                    <option value="absolute">Absolute Weight</option>
                    <option value="percent_max_velo">% Max Velocity</option>
                    <option value="rpe">RPE</option>
                  </select>
                </div>

                {exercise.intensity_type === 'percent_1rm' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">% 1RM</label>
                    <input
                      type="number"
                      value={exercise.intensity_percent || ''}
                      onChange={(e) => onUpdate({ intensity_percent: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                      placeholder="75"
                    />
                  </div>
                )}

                {exercise.intensity_type === 'absolute' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Load (lbs)</label>
                    <input
                      type="number"
                      value={exercise.target_load || ''}
                      onChange={(e) => onUpdate({ target_load: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                      placeholder="135"
                    />
                  </div>
                )}

                {exercise.intensity_type === 'rpe' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">RPE</label>
                    <input
                      type="number"
                      value={exercise.target_rpe || ''}
                      onChange={(e) => onUpdate({ target_rpe: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                      placeholder="7"
                      min="1"
                      max="10"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <textarea
                  value={exercise.notes || ''}
                  onChange={(e) => onUpdate({ notes: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                  placeholder="Add exercise notes..."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
