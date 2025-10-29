'use client';

import { useState } from 'react';
import SetBySetEditor from './set-by-set-editor';

interface Measurement {
  id: string;
  name: string;
  category: 'single' | 'paired';
  primary_metric_id: string;
  primary_metric_name: string;
  primary_metric_type: 'integer' | 'decimal' | 'time';
  secondary_metric_id?: string | null;
  secondary_metric_name?: string | null;
  secondary_metric_type?: 'integer' | 'decimal' | 'time' | null;
  is_locked?: boolean;
  enabled: boolean;

  // Legacy fields for backwards compatibility
  type?: string;
  unit?: string;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
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

interface IntensityTarget {
  id: string;
  metric: string; // 'weight', 'distance', 'time', etc.
  metric_label: string; // '1RM', 'Max Distance', 'Best Time', etc.
  percent: number;
}

interface RoutineExercise {
  id: string;
  exercise_id: string | null;
  sets: number | null;
  reps_min: number | null;
  reps_max: number | null;
  time_seconds: number | null;
  percent_1rm: number | null;
  rpe_target: number | null;
  rest_seconds: number | null;
  distance: number | null;
  intensity_type: string | null;
  intensity_percent: number | null;
  intensity_targets: IntensityTarget[] | null;
  metric_targets: Record<string, string | number | boolean | null> | null; // Flexible storage for all metrics
  notes: string | null;
  set_configurations: SetConfiguration[] | null;
  exercises: Exercise | null;
}

interface SimpleExerciseCardProps {
  exercise: RoutineExercise;
  index: number;
  totalCount: number;
  onUpdate: (updates: Partial<RoutineExercise>) => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

export default function SimpleExerciseCard({
  exercise,
  index,
  totalCount,
  onUpdate,
  onDelete,
  onMove
}: SimpleExerciseCardProps) {
  const [usePerSetConfig, setUsePerSetConfig] = useState(
    exercise.set_configurations && exercise.set_configurations.length > 0
  );
  const [isExpanded, setIsExpanded] = useState(true);

  // Get enabled measurements from metric_schema
  const getEnabledMeasurements = () => {
    return exercise.exercises?.metric_schema?.measurements?.filter(m => m.enabled) || [];
  };

  // Helper to get metric target value
  const getMetricValue = (metricId: string) => {
    return exercise.metric_targets?.[metricId] ?? null;
  };

  // Helper to update metric target value
  const updateMetricValue = (metricId: string, value: string | number | null) => {
    const currentTargets = exercise.metric_targets || {};
    const newTargets = { ...currentTargets, [metricId]: value };
    onUpdate({ metric_targets: newTargets });
  };

  function handleTogglePerSet(enabled: boolean) {
    setUsePerSetConfig(enabled);
    if (!enabled) {
      // Clear per-set config when disabled
      onUpdate({ set_configurations: null });
    }
  }

  function handleUpdateSets(sets: SetConfiguration[]) {
    onUpdate({ set_configurations: sets });
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <div className="flex items-start gap-4">
        {/* Order Controls */}
        <div className="flex flex-col gap-1 pt-1">
          <button
            onClick={() => onMove('up')}
            disabled={index === 0}
            className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          >
            ↑
          </button>
          <span className="text-xs text-gray-500 text-center">{index + 1}</span>
          <button
            onClick={() => onMove('down')}
            disabled={index === totalCount - 1}
            className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          >
            ↓
          </button>
        </div>

        {/* Exercise Content */}
        <div className="flex-1 space-y-4">
          {/* Exercise Name & Controls */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {/* Expand/Collapse Button */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
              <div>
                <h4 className="text-white font-medium text-lg">{exercise.exercises?.name || 'Unknown Exercise'}</h4>
                <p className="text-sm text-gray-400">{exercise.exercises?.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Per-Set Toggle */}
              <button
                onClick={() => handleTogglePerSet(!usePerSetConfig)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  usePerSetConfig
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-white/10 text-gray-400 border border-white/20 hover:bg-white/20'
                }`}
              >
                {usePerSetConfig ? '✓ Per-Set Config' : 'Enable Per-Set'}
              </button>
              <button
                onClick={onDelete}
                className="px-3 py-1 text-sm text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Configuration Section */}
          {isExpanded && (
            <>
              {usePerSetConfig ? (
                /* Per-Set Configuration */
                <div className="bg-white/5 border border-blue-500/30 rounded-lg p-4">
                  <SetBySetEditor
                    totalSets={exercise.sets || 3}
                    onUpdateSets={handleUpdateSets}
                    initialSets={exercise.set_configurations || []}
                    enabledMeasurements={getEnabledMeasurements()}
                  />
                </div>
              ) : (
                /* Simple Configuration */
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    {/* Sets - Always shown */}
                    <div className="flex flex-col">
                      <label className="block text-xs text-gray-400 mb-1">Sets</label>
                      <input
                        type="number"
                        value={exercise.sets || ''}
                        onChange={(e) => onUpdate({ sets: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-16 px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="3"
                      />
                    </div>

                    {/* Dynamic metric fields based on metric_schema */}
                    {getEnabledMeasurements().map((measurement) => {
                      const metricType = measurement.primary_metric_type || measurement.type;
                      const metricName = measurement.primary_metric_name || measurement.unit;

                      return (
                        <div key={measurement.id} className="flex flex-col">
                          <label className="block text-xs text-gray-400 mb-1">
                            {measurement.name} {metricName && `(${metricName})`}
                          </label>
                          <input
                            type={metricType === 'integer' || metricType === 'decimal' ? 'number' : 'text'}
                            step={metricType === 'decimal' ? '0.01' : '1'}
                            value={getMetricValue(measurement.id) || ''}
                            onChange={(e) => {
                              if (metricType === 'integer') {
                                updateMetricValue(measurement.id, e.target.value ? parseInt(e.target.value) : null);
                              } else if (metricType === 'decimal') {
                                updateMetricValue(measurement.id, e.target.value ? parseFloat(e.target.value) : null);
                              } else {
                                updateMetricValue(measurement.id, e.target.value || null);
                              }
                            }}
                            className="w-20 px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={metricType === 'time' ? 'HH:MM:SS' : '0'}
                          />
                        </div>
                      );
                    })}

                    {/* Intensity % - Inline with other fields */}
                    {getEnabledMeasurements().length > 0 && (
                      <>
                        <div className="flex flex-col">
                          <label className="block text-xs text-gray-400 mb-1">Intensity</label>
                          <select
                            value={exercise.intensity_targets?.[0]?.metric || ''}
                            onChange={(e) => {
                              const metric = e.target.value;
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
                            }}
                            className="w-32 px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:text-gray-900 [&>option]:bg-white"
                          >
                            <option value="">None</option>
                            {getEnabledMeasurements().map((m) => (
                              <option key={m.id} value={m.id}>% {m.name}</option>
                            ))}
                          </select>
                        </div>

                        {exercise.intensity_targets?.[0]?.metric && (
                          <div className="flex flex-col">
                            <label className="block text-xs text-gray-400 mb-1">%</label>
                            <input
                              type="number"
                              value={exercise.intensity_targets[0].percent || ''}
                              onChange={(e) => {
                                const currentTarget = exercise.intensity_targets?.[0];
                                if (currentTarget) {
                                  onUpdate({
                                    intensity_targets: [{
                                      ...currentTarget,
                                      percent: e.target.value ? parseInt(e.target.value) : 0
                                    }]
                                  });
                                }
                              }}
                              className="w-16 px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="75"
                              min="0"
                              max="200"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Rest & Tempo - Second Row */}
                  <div className="flex flex-wrap gap-3">
                    {/* Rest */}
                    <div className="flex flex-col">
                      <label className="block text-xs text-gray-400 mb-1">Rest (s)</label>
                      <input
                        type="number"
                        value={exercise.rest_seconds || ''}
                        onChange={(e) => onUpdate({ rest_seconds: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-20 px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="60"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Notes</label>
                    <textarea
                      value={exercise.notes || ''}
                      onChange={(e) => onUpdate({ notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Add notes..."
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
