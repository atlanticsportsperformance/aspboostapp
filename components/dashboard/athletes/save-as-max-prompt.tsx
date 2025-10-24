'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SaveAsMaxPromptProps {
  setLogId: string;
  athleteId: string;
  exerciseName: string;
  metricId: string;
  metricValue: number;
  metricUnit?: string;
  reps?: number;
  onSaved?: () => void;
  onDismiss?: () => void;
}

/**
 * SaveAsMaxPrompt
 *
 * Shows when athlete logs a potential PR during a workout.
 * Allows them to save the performance as a personal record in athlete_maxes table.
 *
 * Usage:
 * <SaveAsMaxPrompt
 *   setLogId="uuid"
 *   athleteId="uuid"
 *   exerciseName="Back Squat"
 *   metricId="weight"
 *   metricValue={225}
 *   metricUnit="lbs"
 *   reps={5}
 *   onSaved={() => console.log('Saved!')}
 *   onDismiss={() => console.log('Dismissed')}
 * />
 */
export function SaveAsMaxPrompt({
  setLogId,
  athleteId,
  exerciseName,
  metricId,
  metricValue,
  metricUnit = '',
  reps,
  onSaved,
  onDismiss
}: SaveAsMaxPromptProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);

  function getMetricLabel() {
    if (metricId === 'weight' && reps) {
      return `${reps}RM`;
    }

    const labels: Record<string, string> = {
      weight: '1RM',
      distance: 'Max Distance',
      peak_velo: 'Peak Velocity',
      exit_velo: 'Exit Velocity',
      time: 'Best Time'
    };

    return labels[metricId] || metricId;
  }

  async function handleSave() {
    setSaving(true);

    try {
      // Call the save_set_as_max database function
      const { data, error } = await supabase.rpc('save_set_as_max', {
        p_set_log_id: setLogId,
        p_metric_id: metricId,
        p_notes: notes || null
      });

      if (error) {
        console.error('Error saving max:', error);
        alert('Failed to save max. Please try again.');
        return;
      }

      console.log('Max saved successfully:', data);
      onSaved?.();
    } catch (err) {
      console.error('Error saving max:', err);
      alert('Failed to save max. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDismiss() {
    // Mark the set log as dismissed (don't show again)
    await supabase
      .from('set_logs')
      .update({ is_potential_pr: false })
      .eq('id', setLogId);

    onDismiss?.();
  }

  return (
    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        {/* Trophy Icon */}
        <div className="flex-shrink-0 text-3xl">🏆</div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-yellow-300 mb-1">
            New Personal Record!
          </h3>
          <p className="text-sm text-gray-300 mb-3">
            You just logged <span className="font-bold text-white">{metricValue} {metricUnit}</span>
            {reps && reps > 1 && <span> for {reps} reps</span>} on{' '}
            <span className="font-semibold">{exerciseName}</span> - that's a new {getMetricLabel()}!
          </p>

          {/* Notes Input (expandable) */}
          {showNotesInput && (
            <div className="mb-3">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note (optional) - e.g., 'Felt strong today'"
                className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                autoFocus
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save as Max'}
            </button>

            {!showNotesInput && (
              <button
                onClick={() => setShowNotesInput(true)}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm"
              >
                + Add Note
              </button>
            )}

            <button
              onClick={handleDismiss}
              disabled={saving}
              className="px-3 py-2 text-gray-400 hover:text-white text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SaveAsMaxBanner
 *
 * Compact banner version for displaying at the top of workout logging screens.
 * Shows all pending PRs for the current workout.
 */
interface SaveAsMaxBannerProps {
  workoutInstanceId: string;
  athleteId: string;
  onPRsSaved?: () => void;
}

export function SaveAsMaxBanner({
  workoutInstanceId,
  athleteId,
  onPRsSaved
}: SaveAsMaxBannerProps) {
  const supabase = createClient();
  const [potentialPRs, setPotentialPRs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPotentialPRs() {
    const { data, error } = await supabase
      .from('set_logs')
      .select(`
        *,
        exercises (name)
      `)
      .eq('workout_instance_id', workoutInstanceId)
      .eq('athlete_id', athleteId)
      .eq('is_potential_pr', true)
      .eq('saved_as_max', false)
      .order('logged_at', { ascending: false });

    if (!error && data) {
      setPotentialPRs(data);
    }

    setLoading(false);
  }

  async function handlePRSaved() {
    await fetchPotentialPRs();
    onPRsSaved?.();
  }

  // Fetch PRs on mount
  useState(() => {
    fetchPotentialPRs();
  });

  if (loading || potentialPRs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {potentialPRs.map((pr) => (
        <SaveAsMaxPrompt
          key={pr.id}
          setLogId={pr.id}
          athleteId={pr.athlete_id}
          exerciseName={pr.exercises?.name || 'Unknown Exercise'}
          metricId={pr.pr_metric_id}
          metricValue={pr.measurements[pr.pr_metric_id]}
          metricUnit={pr.pr_metric_id === 'weight' ? 'lbs' : pr.pr_metric_id === 'distance' ? 'ft' : 'mph'}
          reps={pr.measurements.reps}
          onSaved={handlePRSaved}
          onDismiss={handlePRSaved}
        />
      ))}
    </div>
  );
}
