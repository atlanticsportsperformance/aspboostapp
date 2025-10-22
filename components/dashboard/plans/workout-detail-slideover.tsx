'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Workout {
  id: string;
  name: string;
  category: string | null;
  estimated_duration_minutes: number | null;
  notes: string | null;
  plan_id: string | null;
}

interface WorkoutDetailSlideoverProps {
  workout: Workout;
  weekNumber: number;
  dayNumber: number;
  onClose: () => void;
  onUpdate: () => void;
}

export default function WorkoutDetailSlideover({
  workout,
  weekNumber,
  dayNumber,
  onClose,
  onUpdate
}: WorkoutDetailSlideoverProps) {
  const supabase = createClient();
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  const dayNames = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

  function getCategoryColor(category: string | null) {
    const colors: { [key: string]: string } = {
      hitting: 'bg-red-500/20 text-red-300 border-red-500/30',
      throwing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      strength_conditioning: 'bg-green-500/20 text-green-300 border-green-500/30',
    };
    return colors[category?.toLowerCase() || ''] || 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30';
  }

  function getCategoryLabel(category: string | null) {
    if (!category) return 'Uncategorized';
    return category.replace('_', ' & ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  async function handleRemoveFromPlan() {
    if (!confirm('Remove this workout from the plan? The workout will still exist in your library.')) return;

    setRemoving(true);

    // Unlink workout from program_days (set workout_id to null)
    const { error } = await supabase
      .from('program_days')
      .update({ workout_id: null })
      .eq('plan_id', workout.plan_id)
      .eq('week_number', weekNumber)
      .eq('day_number', dayNumber)
      .eq('workout_id', workout.id);

    if (error) {
      console.error('Error removing workout:', error);
      alert('Failed to remove workout');
      setRemoving(false);
      return;
    }

    onUpdate();
  }

  function handleEditWorkout() {
    // Open workout builder in new tab
    router.push(`/dashboard/workouts/${workout.id}`);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#1a1a1a] border-l border-white/10 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white">Workout Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-sm text-neutral-400">
            Week {weekNumber} • {dayNames[dayNumber - 1]}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Workout Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase">Workout</label>
            <h3 className="text-2xl font-bold text-white">{workout.name}</h3>
          </div>

          {/* Category */}
          {workout.category && (
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase">Category</label>
              <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold border ${getCategoryColor(workout.category)}`}>
                {getCategoryLabel(workout.category)}
              </span>
            </div>
          )}

          {/* Duration */}
          {workout.estimated_duration_minutes && (
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase">Est. Duration</label>
              <div className="text-lg text-white">{workout.estimated_duration_minutes} minutes</div>
            </div>
          )}

          {/* Notes */}
          {workout.notes && (
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase">Notes</label>
              <p className="text-neutral-300 leading-relaxed">{workout.notes}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-300">
                This workout is a plan-owned copy. Changes you make won't affect the template in your library.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/10 p-6 space-y-3">
          <button
            onClick={handleEditWorkout}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Full Workout
          </button>

          <button
            onClick={handleRemoveFromPlan}
            disabled={removing}
            className="w-full px-4 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-300 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {removing ? 'Removing...' : 'Remove from Plan'}
          </button>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-neutral-800/50 hover:bg-neutral-700/50 text-neutral-300 rounded-lg font-medium transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
