'use client';

import { useState, useEffect } from 'react';

interface RoutineExercise {
  id: string;
  target_sets: number | null;
  target_reps: number | null;
  target_time_seconds: number | null;
  target_load: number | null;
  intensity_percent: number | null;
  intensity_type: string | null;
  target_rpe: number | null;
  rest_seconds: number | null;
  notes: string | null;
}

interface ExerciseTargetsFormProps {
  routineExercise: RoutineExercise;
  onChange: (updates: Partial<RoutineExercise>) => void;
}

export function ExerciseTargetsForm({ routineExercise, onChange }: ExerciseTargetsFormProps) {
  const [loadType, setLoadType] = useState(routineExercise.intensity_type || 'none');

  useEffect(() => {
    if (routineExercise.intensity_type) {
      setLoadType(routineExercise.intensity_type);
    }
  }, [routineExercise.intensity_type]);

  const handleLoadTypeChange = (type: string) => {
    setLoadType(type);
    onChange({
      intensity_type: type === 'none' ? null : type,
      intensity_percent: type === 'percent_1rm' || type === 'percent_max_velo' ? (routineExercise.intensity_percent || 75) : null,
      target_load: type === 'absolute' ? (routineExercise.target_load || null) : null,
      target_rpe: type === 'rpe' ? (routineExercise.target_rpe || 8) : routineExercise.target_rpe
    });
  };

  return (
    <div className="space-y-3">
      {/* Sets, Reps, Time */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Sets</label>
          <input
            type="number"
            value={routineExercise.target_sets || ''}
            onChange={(e) => onChange({ target_sets: e.target.value ? parseInt(e.target.value) : null })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            placeholder="3"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Reps</label>
          <input
            type="number"
            value={routineExercise.target_reps || ''}
            onChange={(e) => onChange({ target_reps: e.target.value ? parseInt(e.target.value) : null })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="10"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Time (sec)</label>
          <input
            type="number"
            value={routineExercise.target_time_seconds || ''}
            onChange={(e) => onChange({ target_time_seconds: e.target.value ? parseInt(e.target.value) : null })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="30"
          />
        </div>
      </div>

      {/* Load/Intensity */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Load/Intensity Type</label>
        <select
          value={loadType}
          onChange={(e) => handleLoadTypeChange(e.target.value)}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="none">None</option>
          <option value="percent_1rm">% 1RM</option>
          <option value="absolute">Absolute (lbs)</option>
          <option value="percent_max_velo">% Max Velocity</option>
          <option value="rpe">RPE</option>
        </select>
      </div>

      {/* Intensity Value */}
      {loadType === 'percent_1rm' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">% 1RM</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={routineExercise.intensity_percent || ''}
              onChange={(e) => onChange({ intensity_percent: e.target.value ? parseInt(e.target.value) : null })}
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
              placeholder="75"
            />
            <span className="text-gray-400 text-sm">%</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            System will auto-calculate weight from athlete's 1RM
          </p>
        </div>
      )}

      {loadType === 'absolute' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Weight (lbs)</label>
          <input
            type="number"
            step="0.5"
            value={routineExercise.target_load || ''}
            onChange={(e) => onChange({ target_load: e.target.value ? parseFloat(e.target.value) : null })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="225"
          />
        </div>
      )}

      {loadType === 'percent_max_velo' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">% Max Velocity</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={routineExercise.intensity_percent || ''}
              onChange={(e) => onChange({ intensity_percent: e.target.value ? parseInt(e.target.value) : null })}
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
              placeholder="70"
            />
            <span className="text-gray-400 text-sm">%</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            System will auto-calculate from athlete's max velocity
          </p>
        </div>
      )}

      {loadType === 'rpe' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">RPE (Rate of Perceived Exertion)</label>
          <input
            type="number"
            value={routineExercise.target_rpe || ''}
            onChange={(e) => onChange({ target_rpe: e.target.value ? parseInt(e.target.value) : null })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="10"
            placeholder="8"
          />
          <p className="mt-1 text-xs text-gray-500">
            1 = Very Easy, 10 = Maximum Effort
          </p>
        </div>
      )}

      {/* Rest */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Rest (seconds)</label>
        <input
          type="number"
          value={routineExercise.rest_seconds || ''}
          onChange={(e) => onChange({ rest_seconds: e.target.value ? parseInt(e.target.value) : null })}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="90"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Notes</label>
        <textarea
          value={routineExercise.notes || ''}
          onChange={(e) => onChange({ notes: e.target.value || null })}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Focus on tempo, pause at bottom, etc."
        />
      </div>
    </div>
  );
}
