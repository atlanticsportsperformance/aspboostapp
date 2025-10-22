'use client';

import { useState } from 'react';
import SetBySetEditor from './set-by-set-editor';

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

interface Routine {
  id: string;
  name: string;
  scheme: string;
  routine_exercises: RoutineExercise[];
}

interface ExerciseDetailPanelProps {
  routine: Routine | null;
  exercise: RoutineExercise | null;
  onUpdate: (updates: Partial<RoutineExercise>) => void;
  onDelete: () => void;
}

export default function ExerciseDetailPanel({
  routine,
  exercise,
  onUpdate,
  onDelete
}: ExerciseDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'measurements' | 'amrap' | 'each-side'>('measurements');
  const [enablePerSet, setEnablePerSet] = useState(false);

  if (!exercise || !routine) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white/5 backdrop-blur-sm">
        <div className="text-center">
          <div className="text-6xl mb-4">👈</div>
          <h3 className="text-xl font-semibold text-white mb-2">Select an exercise</h3>
          <p className="text-gray-400">Choose an exercise from the sidebar to configure it</p>
        </div>
      </div>
    );
  }

  const getEnabledMeasurements = () => {
    return exercise.exercises?.metric_schema?.measurements?.filter(m => m.enabled) || [];
  };

  const getMetricValue = (metricId: string) => {
    return exercise.metric_targets?.[metricId] ?? null;
  };

  const updateMetricValue = (metricId: string, value: any) => {
    const currentTargets = exercise.metric_targets || {};
    const newTargets = { ...currentTargets, [metricId]: value };
    onUpdate({ metric_targets: newTargets });
  };

  const handleIntensityMetricChange = (metric: string) => {
    if (!metric) {
      onUpdate({ intensity_targets: null });
      return;
    }
    const measurement = getEnabledMeasurements().find(m => m.id === metric);
    onUpdate({
      intensity_targets: [{
        id: Date.now().toString(),
        metric,
        metric_label: measurement ? `Max ${measurement.name}` : metric,
        percent: exercise.intensity_targets?.[0]?.percent || 75
      }]
    });
  };

  const handleIntensityPercentChange = (percent: number) => {
    const currentTarget = exercise.intensity_targets?.[0];
    if (currentTarget) {
      onUpdate({
        intensity_targets: [{
          ...currentTarget,
          percent
        }]
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button className="text-gray-400 hover:text-white transition-colors">
              <span className="text-xl">♡</span>
            </button>
            <h2 className="text-2xl font-bold text-white">
              {exercise.exercises?.name || 'Exercise'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
              <span className="text-lg">↻</span>
            </button>
            <button className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
              <span className="text-lg">□</span>
            </button>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
            >
              <span className="text-lg">🗑</span>
            </button>
          </div>
        </div>

        {/* Optional: Can add tabs here later for different views */}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Configuration Bar */}
        <div className="bg-white/10 border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEnablePerSet(!enablePerSet)}
                className={`p-2 rounded-lg transition-colors ${
                  enablePerSet ? 'bg-blue-500/30 text-blue-300' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title={enablePerSet ? 'Switch to simple mode' : 'Configure per set'}
              >
                <span className="text-lg">☰</span>
              </button>
              <span className="text-sm font-medium text-gray-400">
                {enablePerSet ? 'Per-Set Configuration' : 'Configuration'}
              </span>
            </div>
          </div>

          {!enablePerSet ? (
            /* Simple Mode - Compact Grid */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Sets */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Sets</label>
                <input
                  type="number"
                  value={exercise.sets || ''}
                  onChange={(e) => onUpdate({ sets: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="3"
                />
              </div>

              {/* Dynamic Metrics */}
              {getEnabledMeasurements().map((measurement) => (
                <div key={measurement.id}>
                  <label className="block text-xs text-gray-400 mb-1">
                    {measurement.name} {measurement.unit && `(${measurement.unit})`}
                  </label>
                  <input
                    type={measurement.type === 'integer' || measurement.type === 'decimal' ? 'number' : 'text'}
                    step={measurement.type === 'decimal' ? '0.01' : '1'}
                    value={getMetricValue(measurement.id) || ''}
                    onChange={(e) => {
                      if (measurement.type === 'integer') {
                        updateMetricValue(measurement.id, e.target.value ? parseInt(e.target.value) : null);
                      } else if (measurement.type === 'decimal') {
                        updateMetricValue(measurement.id, e.target.value ? parseFloat(e.target.value) : null);
                      } else {
                        updateMetricValue(measurement.id, e.target.value || null);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={measurement.type === 'text' ? 'Enter value' : '0'}
                  />
                </div>
              ))}

              {/* Rest */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rest (sec)</label>
                <input
                  type="number"
                  value={exercise.rest_seconds || ''}
                  onChange={(e) => onUpdate({ rest_seconds: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="60"
                />
              </div>

              {/* Tempo */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tempo</label>
                <input
                  type="text"
                  placeholder="e.g. 3-0-1-0"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Intensity Dropdown */}
              {getEnabledMeasurements().length > 0 && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Intensity</label>
                  <select
                    value={exercise.intensity_targets?.[0]?.metric || ''}
                    onChange={(e) => handleIntensityMetricChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:text-gray-900 [&>option]:bg-white"
                  >
                    <option value="">None</option>
                    {getEnabledMeasurements().map((m) => (
                      <option key={m.id} value={m.id}>% {m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Intensity % */}
              {exercise.intensity_targets?.[0]?.metric && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">%</label>
                  <input
                    type="number"
                    value={exercise.intensity_targets[0].percent || ''}
                    onChange={(e) => handleIntensityPercentChange(e.target.value ? parseInt(e.target.value) : 0)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="75"
                    min="0"
                    max="200"
                  />
                </div>
              )}
            </div>
          ) : (
            /* Per-Set Mode */
            <SetBySetEditor
              totalSets={exercise.sets || 3}
              initialSets={exercise.set_configurations || []}
              enabledMeasurements={getEnabledMeasurements()}
              onUpdateSets={(sets) => onUpdate({ set_configurations: sets })}
            />
          )}
        </div>

        {/* Exercise Notes */}
        <div className="space-y-4">
          {/* Default Exercise Notes (from exercise builder) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <span>Default Exercise Notes</span>
              <span className="text-xs text-gray-500">🔒 Locked</span>
            </label>
            <div className="px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm relative">
              <div className="flex items-start gap-2">
                <span className="text-blue-300 shrink-0">🔒</span>
                <div className="flex-1 text-blue-200">
                  {exercise.exercises?.description || <span className="text-gray-400 italic">No default description set for this exercise</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Workout-Specific Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Workout-Specific Notes</label>
            <textarea
              value={exercise.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add workout-specific notes or instructions for this exercise..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
