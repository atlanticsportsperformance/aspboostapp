'use client';

import { useState } from 'react';

interface Measurement {
  id: string;
  name: string;
  type: string;
  unit: string;
  enabled: boolean;
}

interface SetConfiguration {
  set_number: number;
  metric_values?: Record<string, any>; // Flexible storage for any metric
  intensity_type?: string; // Which metric to base intensity on
  intensity_percent?: number;
  rest_seconds?: number;
  notes?: string;
  is_amrap?: boolean; // Individual set AMRAP
}

interface SetBySetEditorProps {
  totalSets: number;
  onUpdateSets: (sets: SetConfiguration[]) => void;
  initialSets?: SetConfiguration[];
  enabledMeasurements?: Measurement[]; // Pass metrics from parent
}

export default function SetBySetEditor({ totalSets, onUpdateSets, initialSets = [], enabledMeasurements = [] }: SetBySetEditorProps) {
  const [sets, setSets] = useState<SetConfiguration[]>(() => {
    // Initialize with default values if not provided
    const defaultSets: SetConfiguration[] = [];
    for (let i = 0; i < totalSets; i++) {
      defaultSets.push(initialSets[i] || {
        set_number: i + 1,
        metric_values: {},
        intensity_type: undefined,
        intensity_percent: undefined,
        rest_seconds: 60
      });
    }
    return defaultSets;
  });

  function updateSet(setIndex: number, updates: Partial<SetConfiguration>) {
    const newSets = [...sets];
    newSets[setIndex] = { ...newSets[setIndex], ...updates };
    setSets(newSets);
    onUpdateSets(newSets);
  }

  function updateMetricValue(setIndex: number, metricId: string, value: any) {
    const newSets = [...sets];
    newSets[setIndex] = {
      ...newSets[setIndex],
      metric_values: { ...newSets[setIndex].metric_values, [metricId]: value }
    };
    setSets(newSets);
    onUpdateSets(newSets);
  }

  function copyToAll(setIndex: number) {
    const template = sets[setIndex];
    const newSets = sets.map((set) => ({
      ...set,
      metric_values: { ...template.metric_values },
      intensity_type: template.intensity_type,
      intensity_percent: template.intensity_percent,
      rest_seconds: template.rest_seconds,
      is_amrap: template.is_amrap
    }));
    setSets(newSets);
    onUpdateSets(newSets);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white">Set-by-Set Configuration</h4>
        <div className="text-xs text-gray-400">Configure each set individually</div>
      </div>

      {sets.map((set, index) => (
        <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{set.set_number}</span>
            </div>
            <div className="flex-1 flex flex-wrap gap-2">
              {/* Dynamic metric fields */}
              {enabledMeasurements.map((measurement) => {
                // Show AMRAP text for reps when is_amrap is true for this set
                const isRepsWithAMRAP = measurement.id === 'reps' && set.is_amrap;

                return (
                  <div key={measurement.id} className="flex flex-col">
                    <label className="block text-xs text-gray-400 mb-1">
                      {measurement.name} {measurement.unit && `(${measurement.unit})`}
                    </label>
                    {isRepsWithAMRAP ? (
                      <div className="w-20 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-blue-300 text-sm font-semibold flex items-center justify-center">
                        AMRAP
                      </div>
                    ) : (
                      <input
                        type={measurement.type === 'integer' || measurement.type === 'decimal' ? 'number' : 'text'}
                        step={measurement.type === 'decimal' ? '0.01' : '1'}
                        value={set.metric_values?.[measurement.id] || ''}
                        onChange={(e) => {
                          const value = measurement.type === 'integer' ? (e.target.value ? parseInt(e.target.value) : null) :
                                       measurement.type === 'decimal' ? (e.target.value ? parseFloat(e.target.value) : null) :
                                       e.target.value || null;
                          updateMetricValue(index, measurement.id, value);
                        }}
                        className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0"
                      />
                    )}
                  </div>
                );
              })}

              {/* Intensity % */}
              {enabledMeasurements.length > 0 && (
                <>
                  <div className="flex flex-col">
                    <label className="block text-xs text-gray-400 mb-1">Intensity</label>
                    <select
                      value={set.intensity_type || ''}
                      onChange={(e) => updateSet(index, { intensity_type: e.target.value || undefined })}
                      className="w-32 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 [&>option]:text-gray-900 [&>option]:bg-white"
                    >
                      <option value="">None</option>
                      {enabledMeasurements
                        .filter((m) => m.name.toLowerCase() !== 'reps')
                        .map((m) => (
                          <option key={m.id} value={m.id}>% {m.name}</option>
                        ))}
                    </select>
                  </div>

                  {set.intensity_type && (
                    <div className="flex flex-col">
                      <label className="block text-xs text-gray-400 mb-1">%</label>
                      <input
                        type="number"
                        value={set.intensity_percent || ''}
                        onChange={(e) => updateSet(index, { intensity_percent: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="75"
                        min="0"
                        max="200"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Rest */}
              <div className="flex flex-col">
                <label className="block text-xs text-gray-400 mb-1">Rest (s)</label>
                <input
                  type="number"
                  value={set.rest_seconds || ''}
                  onChange={(e) => updateSet(index, { rest_seconds: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="60"
                />
              </div>
            </div>

            {/* AMRAP Checkbox - Only show if reps is enabled */}
            {enabledMeasurements.some(m => m.id === 'reps') && (
              <label className="flex items-center gap-2 cursor-pointer px-2 py-1 bg-white/5 rounded border border-white/10">
                <input
                  type="checkbox"
                  checked={set.is_amrap || false}
                  onChange={(e) => updateSet(index, { is_amrap: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
                <span className="text-white text-xs font-medium">AMRAP</span>
              </label>
            )}

            {/* Copy to All Button */}
            <button
              type="button"
              onClick={() => copyToAll(index)}
              className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs rounded transition-colors whitespace-nowrap"
              title="Copy this set's values to all sets"
            >
              Copy ↓
            </button>
          </div>

          {/* Set Notes */}
          <div className="mt-2">
            <input
              type="text"
              value={set.notes || ''}
              onChange={(e) => updateSet(index, { notes: e.target.value })}
              className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Notes for this set..."
            />
          </div>

          {/* Display Summary */}
          <div className="mt-2 text-xs text-gray-400">
            {Object.entries(set.metric_values || {}).map(([metricId, value]) => {
              const measurement = enabledMeasurements.find(m => m.id === metricId);
              if (!value || !measurement) return null;
              return (
                <span key={metricId} className="mr-3">
                  {measurement.name}: {value}{measurement.unit ? ` ${measurement.unit}` : ''}
                </span>
              );
            })}
            {set.intensity_type && set.intensity_percent && (
              <span className="text-blue-300">@ {set.intensity_percent}%</span>
            )}
            {set.rest_seconds && <span className="ml-2">| Rest: {set.rest_seconds}s</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
