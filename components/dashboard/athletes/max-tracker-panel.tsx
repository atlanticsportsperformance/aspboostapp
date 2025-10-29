'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MaxTrackerPanelProps {
  athleteId: string;
}

interface AthleteMax {
  id: string;
  exercise_id: string;
  metric_id: string;
  max_value: number;
  reps_at_max: number | null;
  achieved_on: string;
  source: string;
  verified_by_coach: boolean;
  notes: string | null;
  exercises?: {
    name: string;
  };
}

export function MaxTrackerPanel({ athleteId }: MaxTrackerPanelProps) {
  const supabase = createClient();
  const [maxes, setMaxes] = useState<AthleteMax[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [availableMetrics, setAvailableMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  // Filter state - exercise search only
  const [exerciseSearch, setExerciseSearch] = useState<string>('');

  // Add form state
  const [newMax, setNewMax] = useState({
    exercise_id: '',
    metric_id: '',
    max_value: '',
    reps_at_max: '1',
    achieved_on: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Get available metrics from selected exercise
  const selectedExercise = exercises.find(ex => ex.id === newMax.exercise_id);

  useEffect(() => {
    fetchMaxes();
    fetchExercises();
    fetchAvailableMetrics();
  }, [athleteId]);

  async function fetchAvailableMetrics() {
    const { data, error } = await supabase
      .from('custom_measurements')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching measurements:', error);
      return;
    }

    console.log('Available metrics loaded:', data);
    setAvailableMetrics(data || []);
  }

  async function fetchMaxes() {
    const { data, error } = await supabase
      .from('athlete_maxes')
      .select(`
        *,
        exercises (name)
      `)
      .eq('athlete_id', athleteId)
      .order('achieved_on', { ascending: false });

    if (error) {
      console.error('Error fetching maxes:', error);
      return;
    }

    console.log('Maxes loaded:', data);
    setMaxes(data || []);
    setLoading(false);
  }

  async function fetchExercises() {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('is_active', true)
      .order('name');

    console.log('Exercises loaded:', data);
    console.log('Sample exercise metric_schema:', data?.[0]?.metric_schema);
    setExercises(data || []);
  }

  async function handleAddMax() {
    if (!newMax.exercise_id || !newMax.max_value) {
      alert('Exercise and value are required');
      return;
    }

    const { error } = await supabase
      .from('athlete_maxes')
      .insert({
        athlete_id: athleteId,
        exercise_id: newMax.exercise_id,
        metric_id: newMax.metric_id,
        max_value: parseFloat(newMax.max_value),
        reps_at_max: selectedMetric?.id === 'reps' ? parseInt(newMax.reps_at_max) : null,
        achieved_on: newMax.achieved_on,
        source: 'manual',
        notes: newMax.notes || null
      });

    if (error) {
      console.error('Error adding max:', error);
      alert('Failed to add max');
      return;
    }

    // Reset form
    setNewMax({
      exercise_id: '',
      metric_id: '',
      max_value: '',
      reps_at_max: '1',
      achieved_on: new Date().toISOString().split('T')[0],
      notes: ''
    });

    setShowAddDialog(false);
    fetchMaxes();
  }

  async function handleUpdateMax(id: string, updates: Partial<AthleteMax>) {
    const { error } = await supabase
      .from('athlete_maxes')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating max:', error);
      return;
    }

    fetchMaxes();
  }

  async function handleDeleteMax(id: string) {
    if (!confirm('Delete this max? This cannot be undone.')) return;

    const { error } = await supabase
      .from('athlete_maxes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting max:', error);
      return;
    }

    fetchMaxes();
  }

  function getMetricLabel(metricId: string, repsAtMax: number | null) {
    const labels: Record<string, string> = {
      weight: repsAtMax ? `${repsAtMax}RM` : '1RM',
      distance: 'Max Distance',
      peak_velo: 'Peak Velo',
      exit_velo: 'Exit Velo',
      time: 'Best Time'
    };
    return labels[metricId] || metricId;
  }

  function getMetricUnit(metricId: string) {
    // Try to find the unit from the selected exercise's metric schema
    if (selectedExercise?.metric_schema?.measurements) {
      const metric = selectedExercise.metric_schema.measurements.find((m: any) => m.id === metricId);
      if (metric?.unit) return metric.unit;
    }

    // Fallback to common units
    const units: Record<string, string> = {
      weight: 'lbs',
      distance: 'ft',
      peak_velo: 'mph',
      exit_velo: 'mph',
      time: 'sec'
    };
    return units[metricId] || '';
  }

  // When exercise changes, auto-select first metric
  useEffect(() => {
    if (newMax.exercise_id && availableMetrics.length > 0 && !newMax.metric_id) {
      setNewMax(prev => ({ ...prev, metric_id: availableMetrics[0].id }));
    }
  }, [newMax.exercise_id]);

  const selectedMetric = availableMetrics.find((m: any) => m.id === newMax.metric_id);

  if (loading) {
    return <div className="p-6">Loading maxes...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Personal Records</h2>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Add Max
        </button>
      </div>

      {/* Filters */}
      {maxes.length > 0 && (
        <div className="mb-4">
          {/* Exercise Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search exercises..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              className="pl-10 pr-10 py-2 bg-[#1a1a1a] text-white border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] w-full"
            />
            {exerciseSearch && (
              <button
                onClick={() => setExerciseSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Maxes List - Compact */}
      {maxes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-6xl mb-4">🏆</div>
          <p>No personal records yet</p>
          <p className="text-sm mt-2">Add maxes to track progress and calculate intensity</p>
        </div>
      ) : (() => {
        // Filter maxes with exercise search only
        const filteredMaxes = maxes.filter(max => {
          const exerciseName = max.exercises?.name || '';
          const exerciseMatch = exerciseSearch === '' ||
            exerciseName.toLowerCase().includes(exerciseSearch.toLowerCase());

          return exerciseMatch;
        });

        if (filteredMaxes.length === 0) {
          return (
            <div className="text-center py-8 text-gray-400">
              <p>No maxes match the selected filters</p>
            </div>
          );
        }

        return (
          <div className="space-y-1.5">
            {filteredMaxes.map((max) => (
              <div
                key={max.id}
                className="flex items-center justify-between p-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-sm truncate">
                      {max.exercises?.name || 'Unknown Exercise'}
                    </h3>
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] rounded whitespace-nowrap">
                      {getMetricLabel(max.metric_id, max.reps_at_max)}
                    </span>
                    {max.source === 'logged' && (
                      <span className="px-1.5 py-0.5 bg-green-500/20 text-green-300 text-[10px] rounded whitespace-nowrap">
                        Auto
                      </span>
                    )}
                    {max.verified_by_coach && (
                      <span className="text-green-400 text-sm" title="Verified by coach">
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="text-lg font-bold text-white">
                      {max.max_value} {getMetricUnit(max.metric_id)}
                    </span>
                    <span>•</span>
                    <span className="text-[11px]">{new Date(max.achieved_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {max.notes && (
                      <>
                        <span>•</span>
                        <span className="text-[11px] truncate max-w-[150px]">{max.notes}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  {!max.verified_by_coach && (
                    <button
                      onClick={() => handleUpdateMax(max.id, { verified_by_coach: true })}
                      className="px-2 py-1 text-[11px] bg-green-500/20 text-green-300 rounded hover:bg-green-500/30"
                      title="Verify this PR"
                    >
                      Verify
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setEditing(max.id);
                      setEditForm({
                        max_value: max.max_value.toString(),
                        reps_at_max: max.reps_at_max?.toString() || '',
                        achieved_on: max.achieved_on,
                        notes: max.notes || ''
                      });
                    }}
                    className="px-2 py-1 text-[11px] bg-white/10 text-white rounded hover:bg-white/20"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDeleteMax(max.id)}
                    className="px-2 py-1 text-[11px] bg-red-500/20 text-red-300 rounded hover:bg-red-500/30"
                  >
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Edit Max Dialog */}
      {editing && editForm && (() => {
        const editMax = maxes.find(m => m.id === editing);
        if (!editMax) return null;

        const editExercise = exercises.find(ex => ex.id === editMax.exercise_id);
        const editMetrics = editExercise?.metric_schema?.measurements || [];
        const editMetric = editMetrics.find((m: any) => m.id === editMax.metric_id);

        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-[#1a1a1a] border border-white/20 rounded-lg w-full max-w-lg p-6">
              <h3 className="text-xl font-bold mb-4">Edit Personal Record</h3>

              <div className="space-y-4">
                {/* Exercise (read-only) */}
                <div>
                  <label className="block text-sm font-medium mb-2">Exercise</label>
                  <input
                    type="text"
                    value={editMax.exercises?.name || 'Unknown'}
                    disabled
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-gray-400"
                  />
                </div>

                {/* Metric (read-only) */}
                <div>
                  <label className="block text-sm font-medium mb-2">Metric Type</label>
                  <input
                    type="text"
                    value={editMetric?.name || editMax.metric_id}
                    disabled
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-gray-400"
                  />
                </div>

                {/* Value & Reps */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">
                      Max Value ({getMetricUnit(editMax.metric_id)})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editForm.max_value}
                      onChange={(e) => setEditForm({ ...editForm, max_value: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                    />
                  </div>

                  {editMax.reps_at_max !== null && (
                    <div className="w-24">
                      <label className="block text-sm font-medium mb-2">Reps</label>
                      <input
                        type="number"
                        value={editForm.reps_at_max}
                        onChange={(e) => setEditForm({ ...editForm, reps_at_max: e.target.value })}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium mb-2">Date Achieved</label>
                  <input
                    type="date"
                    value={editForm.achieved_on}
                    onChange={(e) => setEditForm({ ...editForm, achieved_on: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                  <input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setEditing(null);
                    setEditForm(null);
                  }}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleUpdateMax(editMax.id, {
                      max_value: parseFloat(editForm.max_value),
                      reps_at_max: editForm.reps_at_max ? parseInt(editForm.reps_at_max) : null,
                      achieved_on: editForm.achieved_on,
                      notes: editForm.notes || null
                    });
                    setEditing(null);
                    setEditForm(null);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Max Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-white/20 rounded-lg w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">Add Personal Record</h3>

            <div className="space-y-4">
              {/* Exercise */}
              <div>
                <label className="block text-sm font-medium mb-2">Exercise</label>
                <select
                  value={newMax.exercise_id}
                  onChange={(e) => {
                    const exerciseId = e.target.value;
                    const exercise = exercises.find(ex => ex.id === exerciseId);
                    console.log('Selected exercise:', exercise);
                    console.log('Exercise metric_schema:', exercise?.metric_schema);
                    console.log('Available metrics:', exercise?.metric_schema?.measurements);
                    setNewMax({ ...newMax, exercise_id: exerciseId });
                  }}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white [&>option]:bg-gray-900"
                >
                  <option value="">Select exercise...</option>
                  {exercises.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>

              {/* Metric Type */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Metric Type <span className="text-gray-400 text-xs font-normal">(all metrics available)</span>
                </label>
                <select
                  value={newMax.metric_id}
                  onChange={(e) => setNewMax({ ...newMax, metric_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white [&>option]:bg-gray-900"
                  disabled={!newMax.exercise_id}
                >
                  <option value="">
                    {!newMax.exercise_id ? 'Select exercise first...' : 'Select any metric...'}
                  </option>
                  {availableMetrics.map((metric: any) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.name || metric.id} {metric.unit ? `(${metric.unit})` : ''}
                    </option>
                  ))}
                </select>
                {newMax.exercise_id && availableMetrics.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Showing all {availableMetrics.length} metric types from your system
                  </p>
                )}
              </div>

              {/* Value & Reps (if weight) */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">
                    Max Value ({getMetricUnit(newMax.metric_id)})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMax.max_value}
                    onChange={(e) => setNewMax({ ...newMax, max_value: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                    placeholder="0"
                  />
                </div>

                {selectedMetric?.id === 'reps' && (
                  <div className="w-24">
                    <label className="block text-sm font-medium mb-2">Reps</label>
                    <input
                      type="number"
                      value={newMax.reps_at_max}
                      onChange={(e) => setNewMax({ ...newMax, reps_at_max: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                      placeholder="1"
                    />
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-2">Date Achieved</label>
                <input
                  type="date"
                  value={newMax.achieved_on}
                  onChange={(e) => setNewMax({ ...newMax, achieved_on: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                <input
                  type="text"
                  value={newMax.notes}
                  onChange={(e) => setNewMax({ ...newMax, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  placeholder="e.g., Max test day, felt strong"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddDialog(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMax}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Add Max
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
