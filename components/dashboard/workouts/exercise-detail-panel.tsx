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
  enabled_measurements?: string[] | null;
  is_amrap?: boolean;
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
  const [enablePerSet, setEnablePerSet] = useState(false);
  const [showMeasurementsDropdown, setShowMeasurementsDropdown] = useState(false);

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
    const measurement = getDisplayMeasurements().find(m => m.id === metric);
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

  // Get all available measurements (from exercise schema or standard set)
  const getAllAvailableMeasurements = () => {
    const exerciseMeasurements = exercise.exercises?.metric_schema?.measurements || [];

    // Standard measurements that can always be added
    const standardMeasurements = [
      { id: 'reps', name: 'Reps', type: 'integer', unit: '', enabled: true },
      { id: 'weight', name: 'Weight', type: 'decimal', unit: 'lbs', enabled: true },
      { id: 'time', name: 'Time', type: 'integer', unit: 'sec', enabled: true },
      { id: 'distance', name: 'Distance', type: 'decimal', unit: 'ft', enabled: true },
      { id: 'exit_velo', name: 'Exit Velo', type: 'decimal', unit: 'mph', enabled: true },
      { id: 'peak_velo', name: 'Peak Velo', type: 'decimal', unit: 'mph', enabled: true }
    ];

    // Merge exercise measurements with standard ones (no duplicates)
    const allMeasurements = [...exerciseMeasurements];
    standardMeasurements.forEach(std => {
      if (!allMeasurements.find(m => m.id === std.id)) {
        allMeasurements.push(std);
      }
    });

    return allMeasurements;
  };

  // Get measurements that should be displayed (based on enabled_measurements)
  const getDisplayMeasurements = () => {
    const allMeasurements = getAllAvailableMeasurements();

    if (exercise.enabled_measurements && exercise.enabled_measurements.length > 0) {
      // Filter to only enabled ones
      return allMeasurements.filter(m => exercise.enabled_measurements!.includes(m.id));
    }

    // If null/empty, show all from exercise schema (backwards compatible)
    return exercise.exercises?.metric_schema?.measurements || [];
  };

  // Check if a measurement is enabled
  const isMeasurementEnabled = (measurementId: string) => {
    if (!exercise.enabled_measurements) {
      // If null, check if it's in the exercise's default schema
      return exercise.exercises?.metric_schema?.measurements?.some(m => m.id === measurementId) || false;
    }
    return exercise.enabled_measurements.includes(measurementId);
  };

  // Toggle a measurement on/off
  const toggleMeasurement = (measurementId: string) => {
    const current = exercise.enabled_measurements || [];

    if (current.includes(measurementId)) {
      // Remove
      const updated = current.filter(id => id !== measurementId);
      onUpdate({ enabled_measurements: updated.length > 0 ? updated : null });
    } else {
      // Add
      onUpdate({ enabled_measurements: [...current, measurementId] });
    }
  };

  // Toggle AMRAP for all sets
  const toggleAllSetsAMRAP = (value: boolean) => {
    if (value) {
      onUpdate({
        is_amrap: true,
        set_configurations: null // Clear per-set config
      });
    } else {
      onUpdate({ is_amrap: false });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">
              {exercise.is_placeholder
                ? exercise.placeholder_name || 'Placeholder Exercise'
                : exercise.exercises?.name || 'Exercise'}
            </h2>
            {exercise.is_placeholder && (
              <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-semibold bg-blue-500/20 border border-blue-500/30 text-blue-300">
                PLACEHOLDER
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
              title="Replace Exercise"
            >
              <span className="text-lg">↻</span>
            </button>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
              title="Delete Exercise"
            >
              <span className="text-lg">🗑</span>
            </button>
          </div>
        </div>
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
            <>
              {/* Measurements Selector & AMRAP */}
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
                {/* AMRAP Checkbox - First, only show if Reps is enabled */}
                {isMeasurementEnabled('reps') && (
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-white/5 rounded border border-white/10">
                    <input
                      type="checkbox"
                      checked={exercise.is_amrap || false}
                      onChange={(e) => toggleAllSetsAMRAP(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-white text-sm font-medium">AMRAP</span>
                  </label>
                )}

                {/* Measurements Dropdown - Made smaller */}
                <div className="relative" style={{ width: '200px' }}>
                  <button
                    onClick={() => setShowMeasurementsDropdown(!showMeasurementsDropdown)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                  >
                    <span className="text-gray-400">
                      {getDisplayMeasurements().length === 0
                        ? 'Measurements'
                        : `${getDisplayMeasurements().length} selected`}
                    </span>
                    <span className="text-gray-400">{showMeasurementsDropdown ? '▲' : '▼'}</span>
                  </button>

                  {showMeasurementsDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                      {getAllAvailableMeasurements().map((measurement) => (
                        <label
                          key={measurement.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isMeasurementEnabled(measurement.id)}
                            onChange={() => toggleMeasurement(measurement.id)}
                            className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                          />
                          <span className="text-white flex-1">{measurement.name}</span>
                          <span className="text-gray-400 text-xs">{measurement.unit}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {/* Sets */}
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

                {/* Dynamic Metrics */}
                {getDisplayMeasurements().map((measurement) => {
                  // Show AMRAP text for reps when is_amrap is true
                  const isRepsWithAMRAP = measurement.id === 'reps' && exercise.is_amrap;

                  return (
                    <div key={measurement.id} className="flex flex-col">
                      <label className="block text-xs text-gray-400 mb-1">
                        {measurement.name} {measurement.unit && `(${measurement.unit})`}
                      </label>
                      {isRepsWithAMRAP ? (
                        <div className="w-20 px-2 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-300 text-sm font-semibold flex items-center justify-center">
                          AMRAP
                        </div>
                      ) : (
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
                          className="w-20 px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={measurement.type === 'text' ? 'Enter value' : '0'}
                        />
                      )}
                    </div>
                  );
                })}

              {/* Intensity Dropdown */}
              {getDisplayMeasurements().length > 0 && (
                <div className="flex flex-col">
                  <label className="block text-xs text-gray-400 mb-1">Intensity</label>
                  <select
                    value={exercise.intensity_targets?.[0]?.metric || ''}
                    onChange={(e) => handleIntensityMetricChange(e.target.value)}
                    className="w-32 px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:text-gray-900 [&>option]:bg-white"
                  >
                    <option value="">None</option>
                    {getDisplayMeasurements()
                      .filter((m) => m.name.toLowerCase() !== 'reps')
                      .map((m) => (
                        <option key={m.id} value={m.id}>% {m.name}</option>
                      ))}
                  </select>
                </div>
              )}

              {/* Intensity % */}
              {exercise.intensity_targets?.[0]?.metric && (
                <div className="flex flex-col">
                  <label className="block text-xs text-gray-400 mb-1">%</label>
                  <input
                    type="number"
                    value={exercise.intensity_targets[0].percent || ''}
                    onChange={(e) => handleIntensityPercentChange(e.target.value ? parseInt(e.target.value) : 0)}
                    className="w-16 px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="75"
                    min="0"
                    max="200"
                  />
                </div>
              )}
              </div>

              {/* Rest & Tempo - Second Row */}
              <div className="flex flex-wrap gap-4 mt-4">
                {/* Rest */}
                <div className="flex flex-col">
                  <label className="block text-xs text-gray-400 mb-1">Rest (sec)</label>
                  <input
                    type="number"
                    value={exercise.rest_seconds || ''}
                    onChange={(e) => onUpdate({ rest_seconds: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-20 px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="60"
                  />
                </div>

                {/* Tempo */}
                <div className="flex flex-col">
                  <label className="block text-xs text-gray-400 mb-1">Tempo</label>
                  <input
                    type="text"
                    placeholder="3-0-1-0"
                    className="w-24 px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Per-Set Mode */
            <SetBySetEditor
              totalSets={exercise.sets || 3}
              initialSets={exercise.set_configurations || []}
              enabledMeasurements={getDisplayMeasurements()}
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
              onBlur={() => {
                // Force save on blur to ensure data is persisted
                if (exercise.notes) {
                  onUpdate({ notes: exercise.notes });
                }
              }}
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
