'use client';

import { useState, useEffect } from 'react';

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

interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string | null;
  is_placeholder: boolean;
  placeholder_id: string | null;
  order_index: number;
  sets: number | null;
  reps_min: number | null;
  metric_targets?: Record<string, any>;
  exercises: Exercise | null;
}

interface Routine {
  id: string;
  name: string;
  scheme: string;
  notes: string | null;
  routine_exercises: RoutineExercise[];
}

interface SupersetDetailPanelProps {
  routine: Routine;
  onUpdate: (updates: Partial<Routine>) => void;
  onDelete: () => void;
  onSelectExercise: (exerciseId: string) => void;
}

export default function SupersetDetailPanel({
  routine,
  onUpdate,
  onDelete,
  onSelectExercise
}: SupersetDetailPanelProps) {
  const [localName, setLocalName] = useState(routine.name);

  useEffect(() => {
    setLocalName(routine.name);
  }, [routine.id, routine.name]);

  const getExerciseSummary = (exercise: RoutineExercise) => {
    const parts: string[] = [];
    if (exercise.sets) parts.push(`${exercise.sets} Sets`);
    if (exercise.reps_min) parts.push(`${exercise.reps_min} reps`);
    if (exercise.metric_targets?.weight) parts.push(`${exercise.metric_targets.weight} lbs`);
    return parts.length > 0 ? parts.join(', ') : 'Not configured';
  };

  return (
    <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔗</span>
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={(e) => onUpdate({ name: e.target.value })}
              className="text-2xl font-bold bg-transparent border-b-2 border-transparent hover:border-blue-400 focus:border-blue-500 text-white outline-none transition-colors"
              placeholder="Superset name..."
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Scheme Dropdown */}
            <select
              value={routine.scheme}
              onChange={(e) => onUpdate({ scheme: e.target.value })}
              className="px-3 py-1 rounded-full text-sm font-medium bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-gray-900 [&>option]:text-white"
            >
              <option value="superset">Superset</option>
              <option value="circuit">Circuit</option>
              <option value="emom">EMOM</option>
              <option value="amrap">AMRAP</option>
            </select>
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300 text-sm font-medium transition-colors"
            >
              🗑 Delete Block
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-400">
          This {routine.scheme} contains {routine.routine_exercises.length} exercise{routine.routine_exercises.length !== 1 ? 's' : ''}.
          Click an exercise below to configure it.
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Block Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Block Notes & Instructions</label>
          <textarea
            value={routine.notes || ''}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Add instructions for this block (e.g., 'Rest 90 seconds between rounds', 'Perform as a superset with no rest between exercises')..."
          />
        </div>

        {/* Exercises in Block */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Exercises in this Block</h3>
          <div className="space-y-2">
            {routine.routine_exercises
              .sort((a, b) => a.order_index - b.order_index)
              .map((exercise, index) => (
                <button
                  key={exercise.id}
                  onClick={() => onSelectExercise(exercise.id)}
                  className="w-full p-4 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-blue-400/50 rounded-lg transition-all text-left group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center shrink-0 group-hover:bg-blue-500/50 transition-colors">
                        <span className="text-white font-bold text-sm">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-white mb-1">
                          {exercise.exercises?.name || 'Exercise'}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {getExerciseSummary(exercise)}
                        </p>
                      </div>
                    </div>
                    <div className="text-blue-400 group-hover:text-blue-300">
                      <span className="text-lg">→</span>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-200">
            <strong>💡 Tip:</strong> Click any exercise above to configure its sets, reps, weight, and intensity.
            The order shown here (1, 2, 3) is the order athletes will perform them.
          </p>
        </div>
      </div>
    </div>
  );
}
