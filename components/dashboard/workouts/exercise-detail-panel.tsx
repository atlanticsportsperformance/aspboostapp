'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import SetBySetEditor from './set-by-set-editor';
import { SwapExerciseDialog } from './swap-exercise-dialog';
import { getActualIntensity, shouldUsePerceivedIntensity, getIntensityLabel } from '@/lib/perceived-intensity';

interface Measurement {
  id: string;
  name: string;
  category: 'single' | 'paired';
  primary_metric_id: string;
  primary_metric_name: string;
  primary_metric_type: 'integer' | 'decimal' | 'time';
  secondary_metric_id: string | null;
  secondary_metric_name: string | null;
  secondary_metric_type: 'integer' | 'decimal' | 'time' | null;
  is_locked: boolean;
  enabled?: boolean; // For backwards compatibility

  // Legacy fields for backwards compatibility during transition
  type?: string;
  unit?: string;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  tags: string[];
  description?: string | null;
  video_url?: string | null;
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
  tracked_max_metrics?: string[] | null;
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
  onSwap: (exerciseId: string, exercise: Exercise, replaceMode: 'single' | 'future' | 'all') => void;
  planId?: string; // Optional - only passed when in plan context
  workoutId?: string; // Workout being edited
  athleteId?: string; // Optional - only passed when in athlete context
}

export default function ExerciseDetailPanel({
  routine,
  exercise,
  onUpdate,
  onDelete,
  onSwap,
  planId,
  workoutId,
  athleteId
}: ExerciseDetailPanelProps) {
  const [enablePerSet, setEnablePerSet] = useState(false);
  const [showMeasurementsDropdown, setShowMeasurementsDropdown] = useState(false);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [allAvailableMeasurements, setAllAvailableMeasurements] = useState<Measurement[]>([]);
  const [localNotes, setLocalNotes] = useState(exercise?.notes || '');

  // Fetch ALL available measurements from custom_measurements table
  useEffect(() => {
    async function fetchAllMeasurements() {
      const supabase = createClient();

      console.log('[Exercise Detail Panel] Fetching measurements from custom_measurements table...');

      const { data: measurements, error } = await supabase
        .from('custom_measurements')
        .select('*')
        .order('name');

      if (error) {
        console.error('[Exercise Detail Panel] Error fetching measurements:', error);
        return;
      }

      if (!measurements) {
        console.log('[Exercise Detail Panel] No measurements found');
        return;
      }

      console.log('[Exercise Detail Panel] Loaded', measurements.length, 'available measurements');

      // Add legacy fields for backwards compatibility
      const measurementsWithLegacy = measurements.map(m => ({
        ...m,
        type: m.primary_metric_type,
        unit: m.primary_metric_name,
        enabled: true
      }));

      setAllAvailableMeasurements(measurementsWithLegacy);
    }

    fetchAllMeasurements();
  }, []);

  // Sync localNotes when exercise changes
  useEffect(() => {
    setLocalNotes(exercise?.notes || '');
  }, [exercise?.id, exercise?.notes]);

  if (!exercise || !routine) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white/5 backdrop-blur-sm">
        <div className="text-center">
          <div className="text-6xl mb-4 hidden md:block">👈</div>
          <h3 className="text-xl font-semibold text-white mb-2">Select an exercise</h3>
          <p className="text-gray-400 md:hidden">Tap the button below to add an exercise</p>
          <p className="text-gray-400 hidden md:block">Choose an exercise from the sidebar to configure it</p>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('📊 [Exercise Detail Panel] Exercise data:', {
    name: exercise.exercises?.name,
    isPlaceholder: exercise.exercises?.tags?.includes('placeholder'),
    enabled_measurements: exercise.enabled_measurements,
    enabled_measurements_length: exercise.enabled_measurements?.length,
    metric_targets: exercise.metric_targets,
    intensity_targets: exercise.intensity_targets,
    set_configurations: exercise.set_configurations,
    set_configurations_length: exercise.set_configurations?.length
  });

  // Generate initial sets from simple mode values (metric_targets) when opening per-set editor
  const getInitialSetsFromSimpleMode = () => {
    if (exercise.set_configurations && exercise.set_configurations.length > 0) {
      // Already has per-set config, use it
      return exercise.set_configurations;
    }

    // Create initial sets from simple mode values
    const totalSets = exercise.sets || 3;
    const initialSets = [];

    for (let i = 0; i < totalSets; i++) {
      initialSets.push({
        set_number: i + 1,
        metric_values: { ...exercise.metric_targets } || {},
        intensity_targets: exercise.intensity_targets ? [...exercise.intensity_targets.map(t => ({ metric: t.metric, percent: t.percent }))] : [],
        rest_seconds: exercise.rest_seconds || 60,
        is_amrap: exercise.is_amrap || false
      });
    }

    return initialSets;
  };

  const getMetricValue = (metricId: string) => {
    return exercise.metric_targets?.[metricId] ?? null;
  };

  const updateMetricValue = (metricId: string, value: any) => {
    const currentTargets = exercise.metric_targets || {};
    const newTargets = { ...currentTargets, [metricId]: value };
    onUpdate({ metric_targets: newTargets });
  };

  const toggleIntensityMetric = (metricId: string) => {
    const currentTargets = exercise.intensity_targets || [];
    const existingIndex = currentTargets.findIndex(t => t.metric === metricId);

    if (existingIndex >= 0) {
      // Remove this metric from intensity targets
      const newTargets = currentTargets.filter((_, idx) => idx !== existingIndex);
      onUpdate({ intensity_targets: newTargets.length > 0 ? newTargets : null });
    } else {
      // Add this metric to intensity targets
      const measurement = getDisplayMeasurements().find(m => m.id === metricId);
      const newTarget = {
        id: Date.now().toString(),
        metric: metricId,
        metric_label: measurement ? `Max ${measurement.name}` : metricId,
        percent: 75
      };
      onUpdate({ intensity_targets: [...currentTargets, newTarget] });
    }
  };

  const handleIntensityPercentChange = (metricId: string, percent: number) => {
    const currentTargets = exercise.intensity_targets || [];
    const updatedTargets = currentTargets.map(target =>
      target.metric === metricId ? { ...target, percent } : target
    );
    onUpdate({ intensity_targets: updatedTargets });
  };

  const isIntensityMetricSelected = (metricId: string) => {
    return exercise.intensity_targets?.some(t => t.metric === metricId) || false;
  };

  const getIntensityPercent = (metricId: string) => {
    return exercise.intensity_targets?.find(t => t.metric === metricId)?.percent || 75;
  };

  // Get all available measurements (from database - ALL measurements system-wide)
  const getAllAvailableMeasurements = () => {
    // Return ALL measurements from the database, not just exercise-specific ones
    // This allows users to add any measurement to any exercise
    return allAvailableMeasurements;
  };

  // Get measurements that should be displayed (based on enabled_measurements)
  const getDisplayMeasurements = () => {
    const allMeasurements = getAllAvailableMeasurements();
    let filteredMeasurements: typeof allMeasurements = [];

    if (exercise.enabled_measurements && exercise.enabled_measurements.length > 0) {
      // Filter to only enabled ones
      filteredMeasurements = allMeasurements.filter(m => exercise.enabled_measurements!.includes(m.id));
    } else {
      // If null/empty, check if placeholder
      const isPlaceholder = exercise.exercises?.tags?.includes('placeholder') || false;
      if (isPlaceholder) {
        // Placeholders with no selections show NOTHING
        return [];
      }

      // Regular exercises default to their schema measurements
      filteredMeasurements = exercise.exercises?.metric_schema?.measurements || [];
    }

    // Sort measurements: locked first (reps, weight, time, distance), then custom
    const lockedOrder = ['reps', 'weight', 'time', 'distance'];
    const lockedMeasurements = lockedOrder
      .map(id => filteredMeasurements.find(m => m.id === id))
      .filter(Boolean) as typeof filteredMeasurements;

    // Get custom measurements, excluding the ones already in lockedMeasurements
    const lockedIds = lockedMeasurements.map(m => m.id);
    const customMeasurements = filteredMeasurements.filter(m => !lockedIds.includes(m.id));

    return [...lockedMeasurements, ...customMeasurements];
  };

  // Check if a measurement is enabled
  const isMeasurementEnabled = (measurementId: string) => {
    if (!exercise.enabled_measurements || exercise.enabled_measurements.length === 0) {
      // If null or empty, check if it's in the exercise's default schema
      // BUT only for regular exercises, NOT placeholders
      const isPlaceholder = exercise.exercises?.tags?.includes('placeholder') || false;
      if (isPlaceholder) {
        // Placeholders start with NOTHING selected
        return false;
      }
      // Regular exercises default to their schema measurements
      return exercise.exercises?.metric_schema?.measurements?.some(m => m.id === measurementId) || false;
    }
    return exercise.enabled_measurements.includes(measurementId);
  };

  // Toggle a measurement on/off
  const toggleMeasurement = (measurementId: string) => {
    console.log('🔘 [Exercise Detail Panel] toggleMeasurement called for:', measurementId);

    // Initialize enabled_measurements based on exercise defaults if null
    let current: string[];
    if (!exercise.enabled_measurements) {
      const isPlaceholder = exercise.exercises?.tags?.includes('placeholder') || false;
      if (isPlaceholder) {
        // Placeholders start with NOTHING selected
        current = [];
      } else {
        // Regular exercises start with their schema measurements
        current = exercise.exercises?.metric_schema?.measurements?.map(m => m.id) || [];
      }
    } else {
      current = exercise.enabled_measurements;
    }

    console.log('🔘 Current enabled_measurements:', current);

    if (current.includes(measurementId)) {
      // Remove measurement from enabled list
      const updated = current.filter(id => id !== measurementId);

      // Find the measurement to check if it's paired
      const measurement = getAllAvailableMeasurements().find(m => m.id === measurementId);
      const metricsToDelete = [measurementId];

      // For paired measurements, also delete primary and secondary metric IDs
      if (measurement?.category === 'paired') {
        if (measurement.primary_metric_id) metricsToDelete.push(measurement.primary_metric_id);
        if (measurement.secondary_metric_id) metricsToDelete.push(measurement.secondary_metric_id);
      }

      console.log('🔘 Deleting metrics:', metricsToDelete);

      // ALSO remove the values from metric_targets
      const updatedTargets = { ...exercise.metric_targets };
      metricsToDelete.forEach(id => delete updatedTargets[id]);

      // Remove from intensity targets if this was the intensity metric
      let updatedIntensityTargets = exercise.intensity_targets;
      if (exercise.intensity_targets?.[0]?.metric && metricsToDelete.includes(exercise.intensity_targets[0].metric)) {
        updatedIntensityTargets = null;
      }

      // CRITICAL FIX: Clear measurement values from per-set configurations
      let updatedSetConfigurations = exercise.set_configurations;
      if (updatedSetConfigurations && Array.isArray(updatedSetConfigurations)) {
        updatedSetConfigurations = updatedSetConfigurations.map((setConfig: any) => {
          const updatedSet = { ...setConfig };
          // Remove ALL related metric values
          metricsToDelete.forEach(id => {
            delete updatedSet[id];
            // Also check metric_values object
            if (updatedSet.metric_values) {
              delete updatedSet.metric_values[id];
            }
          });
          return updatedSet;
        });
      }

      const updateObj = {
        enabled_measurements: updated, // Keep as empty array, don't set to null
        metric_targets: Object.keys(updatedTargets).length > 0 ? updatedTargets : null,
        intensity_targets: updatedIntensityTargets,
        set_configurations: updatedSetConfigurations // Update per-set configs
      };
      console.log('🔘 REMOVING - Calling onUpdate with:', updateObj);
      onUpdate(updateObj);
    } else {
      // Add measurement to enabled list
      const updated = [...current, measurementId];

      // Find the measurement to check if it's paired
      const measurement = getAllAvailableMeasurements().find(m => m.id === measurementId);

      // Initialize metric values in metric_targets for paired measurements
      let updatedTargets = { ...exercise.metric_targets };
      if (measurement?.category === 'paired') {
        // For paired measurements, initialize BOTH primary and secondary metrics
        if (measurement.primary_metric_id && !(measurement.primary_metric_id in updatedTargets)) {
          updatedTargets[measurement.primary_metric_id] = null;
        }
        if (measurement.secondary_metric_id && !(measurement.secondary_metric_id in updatedTargets)) {
          updatedTargets[measurement.secondary_metric_id] = null;
        }
      } else {
        // For single measurements, initialize the metric if not already present
        if (!(measurementId in updatedTargets)) {
          updatedTargets[measurementId] = null;
        }
      }

      const updateObj = {
        enabled_measurements: updated,
        metric_targets: Object.keys(updatedTargets).length > 0 ? updatedTargets : null
      };
      console.log('🔘 ADDING - Calling onUpdate with:', updateObj);
      onUpdate(updateObj);
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

  // Check if a metric is tracked as max
  const isMetricTrackedAsMax = (metricId: string): boolean => {
    return exercise.tracked_max_metrics?.includes(metricId) || false;
  };

  // Toggle tracking a metric as max
  const toggleTrackAsMax = (metricId: string) => {
    const current = exercise.tracked_max_metrics || [];
    if (current.includes(metricId)) {
      // Remove from tracked
      const updated = current.filter(id => id !== metricId);
      onUpdate({ tracked_max_metrics: updated.length > 0 ? updated : null });
    } else {
      // Add to tracked
      onUpdate({ tracked_max_metrics: [...current, metricId] });
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
              onClick={() => setShowSwapDialog(true)}
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
                onClick={() => {
                  const newPerSetMode = !enablePerSet;
                  setEnablePerSet(newPerSetMode);

                  // Clear opposite configuration when toggling
                  if (newPerSetMode) {
                    // Switching TO per-set mode: clear metric_targets
                    onUpdate({ metric_targets: null });
                  } else {
                    // Switching TO simple mode: clear set_configurations
                    onUpdate({ set_configurations: null });
                  }
                }}
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

          {/* Measurements Selector - Always visible */}
              {/* Measurements Selector & AMRAP */}
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
                {/* AMRAP Checkbox - First, only show if Reps is enabled */}
                {!enablePerSet && isMeasurementEnabled('reps') && !exercise.set_configurations && (
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
                    <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto w-[400px]">
                      {(() => {
                        const measurements = getAllAvailableMeasurements();
                        console.log('📋 [Dropdown] Rendering', measurements.length, 'measurements in dropdown');

                        // Separate locked and custom measurements
                        const lockedOrder = ['reps', 'weight', 'time', 'distance'];
                        const lockedMeasurements = lockedOrder
                          .map(id => measurements.find(m => m.id === id))
                          .filter(Boolean) as typeof measurements;

                        const customMeasurements = measurements.filter(m => !m.is_locked);

                        const renderMeasurement = (measurement: typeof measurements[0]) => {
                          // Show trophy for performance metrics (decimal or time types)
                          const isMaxTracked = measurement.primary_metric_type !== 'integer' && (
                            ['weight', 'distance', 'time'].includes(measurement.id) ||
                            measurement.name.toLowerCase().includes('velo') ||
                            measurement.name.toLowerCase().includes('max') ||
                            measurement.name.toLowerCase().includes('time') ||
                            measurement.primary_metric_type === 'decimal' ||
                            measurement.primary_metric_type === 'time'
                          );

                          const isEnabled = isMeasurementEnabled(measurement.id);

                          // Display units on the right (no redundant labels in the name)
                          const displayUnit = measurement.category === 'paired'
                            ? `${measurement.primary_metric_name} + ${measurement.secondary_metric_name}`
                            : measurement.primary_metric_name;

                          return (
                            <label
                              key={measurement.id}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleMeasurement(measurement.id);
                                }}
                                className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                              />
                              <span className="text-white flex-1 flex items-center gap-1.5">
                                {measurement.name}
                                {isMaxTracked && (
                                  <span
                                    className="text-xs opacity-60"
                                    title="This metric can be tracked as a personal record"
                                  >
                                    🏆
                                  </span>
                                )}
                              </span>
                              <span className="text-gray-400 text-xs">{displayUnit}</span>
                            </label>
                          );
                        };

                        return (
                          <>
                            {/* Locked measurements */}
                            {lockedMeasurements.map(renderMeasurement)}

                            {/* Divider if there are custom measurements */}
                            {customMeasurements.length > 0 && (
                              <div className="border-t border-white/10 my-1 mx-3" />
                            )}

                            {/* Custom measurements */}
                            {customMeasurements.map(renderMeasurement)}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Intensity % Checkbox - Inline with dropdown */}
                {!enablePerSet && getDisplayMeasurements().some((m) => m.primary_metric_type !== 'integer') && (
                  <div className="flex flex-col gap-1">
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-white/5 rounded border border-white/10">
                      <input
                        type="checkbox"
                        checked={!!(exercise.intensity_targets && exercise.intensity_targets.length > 0)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Enable intensity for all performance measurements (decimal or time)
                            const performanceMeasurements = getDisplayMeasurements().filter(m => m.primary_metric_type !== 'integer');
                            const targets: any[] = [];

                            performanceMeasurements.forEach(m => {
                              // For paired measurements, create targets for BOTH metrics if they're performance types
                              if (m.category === 'paired') {
                                if (m.primary_metric_type !== 'integer' && m.primary_metric_id) {
                                  targets.push({
                                    id: Date.now().toString() + m.primary_metric_id,
                                    metric: m.primary_metric_id,
                                    metric_label: `Max ${m.name} (${m.primary_metric_name})`,
                                    percent: 75
                                  });
                                }
                                if (m.secondary_metric_type !== 'integer' && m.secondary_metric_id) {
                                  targets.push({
                                    id: Date.now().toString() + m.secondary_metric_id,
                                    metric: m.secondary_metric_id,
                                    metric_label: `Max ${m.name} (${m.secondary_metric_name})`,
                                    percent: 75
                                  });
                                }
                              } else {
                                // Single measurement
                                targets.push({
                                  id: Date.now().toString() + m.id,
                                  metric: m.id,
                                  metric_label: `Max ${m.name}`,
                                  percent: 75
                                });
                              }
                            });

                            onUpdate({ intensity_targets: targets });
                          } else {
                            // Disable intensity
                            onUpdate({ intensity_targets: null });
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                      />
                      <span className="text-white text-sm font-medium">Intensity %</span>
                      {exercise.intensity_targets && exercise.intensity_targets.length > 0 && (
                        <input
                          type="number"
                          value={exercise.intensity_targets[0]?.percent || 75}
                          onChange={(e) => {
                            const newPercent = e.target.value ? parseInt(e.target.value) : 75;
                            // Update all intensity targets to same percent
                            const updatedTargets = exercise.intensity_targets!.map(t => ({ ...t, percent: newPercent }));
                            onUpdate({ intensity_targets: updatedTargets });
                          }}
                          className="w-14 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="75"
                          min="0"
                          max="200"
                        />
                      )}
                    </label>
                    {/* Perceived Intensity Indicator for Throwing Exercises */}
                    {exercise.intensity_targets && exercise.intensity_targets.length > 0 && shouldUsePerceivedIntensity(exercise.exercises?.category) && (
                      <div className="ml-9 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs">
                        <span className="text-blue-300">
                          🎯 Throwing: {exercise.intensity_targets[0]?.percent}% effort → {getActualIntensity(exercise.intensity_targets[0]?.percent)}% actual
                          {' '}({getIntensityLabel(exercise.intensity_targets[0]?.percent)})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

          {!enablePerSet ? (
            exercise.set_configurations && exercise.set_configurations.length > 0 ? (
              /* Per-Set Summary - Read Only */
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-blue-300 font-medium">Per-Set Configuration Active</p>
                  <span className="text-xs text-gray-400">Click ☰ to edit details</span>
                </div>
                <div className="space-y-2">
                  {exercise.set_configurations.map((setConfig: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-4 text-sm p-2 bg-white/5 rounded">
                      <span className="text-gray-400 w-16">Set {idx + 1}:</span>
                      <div className="flex gap-3 flex-wrap">
                        {setConfig.metric_values && Object.entries(setConfig.metric_values).map(([key, value]: [string, any]) => {
                          const measurement = getAllAvailableMeasurements().find(m => m.id === key);
                          if (!value) return null;

                          // Format the key as a readable name if measurement not found
                          const displayName = measurement?.name || key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                          return (
                            <span key={key} className="text-white">
                              {value} {displayName}
                            </span>
                          );
                        })}
                        {setConfig.intensity_targets && setConfig.intensity_targets.length > 0 && (
                          <span className="text-blue-300">
                            @ {setConfig.intensity_targets[0]?.percent}%
                          </span>
                        )}
                        {setConfig.is_amrap && (
                          <span className="text-blue-400 text-xs px-1.5 py-0.5 bg-blue-500/20 rounded">AMRAP</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
            <>
              {/* Sets and Common Measurements */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {/* Sets */}
                <div className="flex flex-col">
                  <label className="block text-xs text-gray-400 mb-1">Sets</label>
                  <input
                    type="number"
                    value={exercise.sets || ''}
                    onChange={(e) => onUpdate({ sets: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="3"
                  />
                </div>

                {/* Dynamic Metrics in a clean grid */}
                {getDisplayMeasurements().map((measurement) => {
                  // For paired measurements, wrap both fields in a container to keep them together on mobile
                  if (measurement.category === 'paired' && measurement.primary_metric_id && measurement.secondary_metric_id) {
                    return (
                      <div key={measurement.id} className="col-span-2 grid grid-cols-2 gap-3">
                        {/* Primary metric field */}
                        <div className="flex flex-col">
                          <label className="block text-xs text-gray-400 mb-1 truncate" title={`${measurement.name} - ${measurement.primary_metric_name}`}>
                            {measurement.name} ({measurement.primary_metric_name})
                          </label>
                          <input
                            type={measurement.primary_metric_type === 'integer' || measurement.primary_metric_type === 'decimal' ? 'number' : 'text'}
                            step={measurement.primary_metric_type === 'decimal' ? '0.01' : '1'}
                            value={getMetricValue(measurement.primary_metric_id) || ''}
                            onChange={(e) => {
                              if (measurement.primary_metric_type === 'integer') {
                                updateMetricValue(measurement.primary_metric_id, e.target.value ? parseInt(e.target.value) : null);
                              } else if (measurement.primary_metric_type === 'decimal') {
                                updateMetricValue(measurement.primary_metric_id, e.target.value ? parseFloat(e.target.value) : null);
                              } else {
                                updateMetricValue(measurement.primary_metric_id, e.target.value || null);
                              }
                            }}
                            className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-white/[0.15] transition-colors"
                            placeholder="0"
                          />
                        </div>

                        {/* Secondary metric field */}
                        <div className="flex flex-col">
                          <label className="block text-xs text-gray-400 mb-1 truncate" title={`${measurement.name} - ${measurement.secondary_metric_name}`}>
                            {measurement.name} ({measurement.secondary_metric_name})
                          </label>
                          <input
                            type={measurement.secondary_metric_type === 'integer' || measurement.secondary_metric_type === 'decimal' ? 'number' : 'text'}
                            step={measurement.secondary_metric_type === 'decimal' ? '0.01' : '1'}
                            value={getMetricValue(measurement.secondary_metric_id!) || ''}
                            onChange={(e) => {
                              if (measurement.secondary_metric_type === 'integer') {
                                updateMetricValue(measurement.secondary_metric_id!, e.target.value ? parseInt(e.target.value) : null);
                              } else if (measurement.secondary_metric_type === 'decimal') {
                                updateMetricValue(measurement.secondary_metric_id!, e.target.value ? parseFloat(e.target.value) : null);
                              } else {
                                updateMetricValue(measurement.secondary_metric_id!, e.target.value || null);
                              }
                            }}
                            className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-white/[0.15] transition-colors"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    );
                  } else {
                    // Single measurement - show one field
                    const isRepsWithAMRAP = measurement.id === 'reps' && exercise.is_amrap;

                    return (
                      <div key={measurement.id} className="flex flex-col">
                        <label className="block text-xs text-gray-400 mb-1 truncate" title={measurement.name}>
                          {measurement.name}
                        </label>
                        {isRepsWithAMRAP ? (
                          <div className="w-full px-2 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-300 text-xs font-semibold flex items-center justify-center">
                            AMRAP
                          </div>
                        ) : (
                          <input
                            type={measurement.primary_metric_type === 'integer' || measurement.primary_metric_type === 'decimal' ? 'number' : 'text'}
                            step={measurement.primary_metric_type === 'decimal' ? '0.01' : '1'}
                            value={getMetricValue(measurement.id) || ''}
                            onChange={(e) => {
                              if (measurement.primary_metric_type === 'integer') {
                                updateMetricValue(measurement.id, e.target.value ? parseInt(e.target.value) : null);
                              } else if (measurement.primary_metric_type === 'decimal') {
                                updateMetricValue(measurement.id, e.target.value ? parseFloat(e.target.value) : null);
                              } else {
                                updateMetricValue(measurement.id, e.target.value || null);
                              }
                            }}
                            className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-white/[0.15] transition-colors"
                            placeholder="0"
                          />
                        )}
                      </div>
                    );
                  }
                })}
              </div>

              {/* Divider Line */}
              <div className="border-t border-white/10 my-4"></div>

              {/* Rest & Tempo - Second Row */}
              <div className="flex flex-wrap gap-4">
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
            )
          ) : (
            /* Per-Set Mode */
            <SetBySetEditor
              totalSets={exercise.sets || 3}
              initialSets={getInitialSetsFromSimpleMode()}
              enabledMeasurements={getDisplayMeasurements()}
              onUpdateSets={(sets) => onUpdate({ set_configurations: sets })}
            />
          )}
        </div>

        {/* Track as Max Section & Video Preview */}
        <div className="flex gap-4">
          {/* Track as Max Section */}
          {getDisplayMeasurements().length > 0 && (
            <div className="flex-1 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🏆</span>
                <h3 className="text-sm font-semibold text-yellow-200">Track as Personal Records</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                When athletes log this exercise, automatically save their best performance for these metrics as personal records
              </p>
              <div className="flex flex-wrap gap-2">
                {getDisplayMeasurements()
                  .flatMap((measurement) => {
                    const buttons = [];

                    // For paired measurements, show BOTH metrics if they're decimal/time
                    if (measurement.category === 'paired' && measurement.primary_metric_id && measurement.secondary_metric_id) {
                      // Primary metric button (if decimal or time)
                      if (measurement.primary_metric_type !== 'integer') {
                        const isPrimaryTracked = isMetricTrackedAsMax(measurement.primary_metric_id);
                        buttons.push(
                          <button
                            key={measurement.primary_metric_id}
                            onClick={() => toggleTrackAsMax(measurement.primary_metric_id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              isPrimaryTracked
                                ? 'bg-yellow-500/30 border-2 border-yellow-500 text-yellow-200'
                                : 'bg-white/5 border border-white/20 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {isPrimaryTracked && <span className="mr-1">✓</span>}
                            {measurement.name} ({measurement.primary_metric_name})
                          </button>
                        );
                      }

                      // Secondary metric button (if decimal or time)
                      if (measurement.secondary_metric_type !== 'integer') {
                        const isSecondaryTracked = isMetricTrackedAsMax(measurement.secondary_metric_id);
                        buttons.push(
                          <button
                            key={measurement.secondary_metric_id}
                            onClick={() => toggleTrackAsMax(measurement.secondary_metric_id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              isSecondaryTracked
                                ? 'bg-yellow-500/30 border-2 border-yellow-500 text-yellow-200'
                                : 'bg-white/5 border border-white/20 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {isSecondaryTracked && <span className="mr-1">✓</span>}
                            {measurement.name} ({measurement.secondary_metric_name})
                          </button>
                        );
                      }
                    } else {
                      // Single measurement - only show if decimal or time
                      if (measurement.primary_metric_type !== 'integer') {
                        const isTracked = isMetricTrackedAsMax(measurement.id);
                        buttons.push(
                          <button
                            key={measurement.id}
                            onClick={() => toggleTrackAsMax(measurement.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              isTracked
                                ? 'bg-yellow-500/30 border-2 border-yellow-500 text-yellow-200'
                                : 'bg-white/5 border border-white/20 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {isTracked && <span className="mr-1">✓</span>}
                            {measurement.name}
                          </button>
                        );
                      }
                    }

                    return buttons;
                  })}
              </div>
              {exercise.tracked_max_metrics && exercise.tracked_max_metrics.length > 0 && (
                <div className="mt-3 text-xs text-yellow-300/80">
                  <span className="font-medium">{exercise.tracked_max_metrics.length}</span> metric{exercise.tracked_max_metrics.length > 1 ? 's' : ''} will auto-save as max
                </div>
              )}
            </div>
          )}

          {/* Video Preview */}
          {exercise.exercises?.video_url && (() => {
            // Convert YouTube URL to embed format
            let embedUrl = exercise.exercises.video_url;

            try {
              // Handle various YouTube URL formats
              if (embedUrl.includes('youtube.com/watch')) {
                const videoId = new URL(embedUrl).searchParams.get('v');
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
              } else if (embedUrl.includes('youtu.be/')) {
                const videoId = embedUrl.split('youtu.be/')[1].split('?')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
              } else if (!embedUrl.includes('youtube.com/embed/')) {
                // If not already in embed format and not a recognized YouTube URL, keep original
                embedUrl = embedUrl;
              }
            } catch (e) {
              console.error('Error parsing video URL:', e);
            }

            return (
              <div className="w-80 bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🎥</span>
                  <h3 className="text-sm font-semibold text-white">Exercise Demo</h3>
                </div>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
            );
          })()}
        </div>

        {/* Exercise Notes */}
        <div className="space-y-4">
          {/* Default Exercise Notes (from exercise builder) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <span>Default Exercise Notes</span>
              <span className="text-xs text-gray-500">🔒 Locked</span>
            </label>
            <div className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-sm relative">
              <div className="flex items-start gap-2">
                <span className="text-gray-400 shrink-0">🔒</span>
                <div className="flex-1 text-white">
                  {exercise.exercises?.description || <span className="text-gray-400 italic">No default description set for this exercise</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Workout-Specific Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Workout-Specific Notes</label>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={(e) => onUpdate({ notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add workout-specific notes or instructions for this exercise..."
            />
          </div>
        </div>
      </div>

      {/* Swap Exercise Dialog */}
      {showSwapDialog && (
        <SwapExerciseDialog
          currentExercise={{
            id: exercise.id,
            exercise_id: exercise.exercise_id,
            is_placeholder: exercise.is_placeholder,
            placeholder_id: exercise.placeholder_id,
            exercises: exercise.exercises
          }}
          planId={planId}
          workoutId={workoutId}
          athleteId={athleteId}
          onSwap={(exerciseId, newExercise, replaceMode) => {
            onSwap(exerciseId, newExercise, replaceMode);
            setShowSwapDialog(false);
          }}
          onClose={() => setShowSwapDialog(false)}
        />
      )}
    </div>
  );
}
