'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CreateWorkoutForAthleteModalProps {
  athleteId: string;
  date: string;
  onClose: () => void;
  onSuccess: (workoutId: string) => void;
}

export function CreateWorkoutForAthleteModal({
  athleteId,
  date,
  onClose,
  onSuccess
}: CreateWorkoutForAthleteModalProps) {
  const supabase = createClient();
  const [workoutName, setWorkoutName] = useState('');
  const [category, setCategory] = useState<'hitting' | 'throwing' | 'strength_conditioning'>('strength_conditioning');
  const [estimatedDuration, setEstimatedDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!workoutName.trim()) {
      alert('Please enter a workout name');
      return;
    }

    setCreating(true);

    try {
      // Step 1: Create athlete-owned workout
      const workoutData: any = {
        name: workoutName.trim(),
        estimated_duration_minutes: parseInt(estimatedDuration) || null,
        is_template: false,
        athlete_id: athleteId,
        plan_id: null,
        source_workout_id: null,
        placeholder_definitions: { placeholders: [] }
      };

      if (category) workoutData.category = category;
      if (notes.trim()) workoutData.notes = notes.trim();

      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert(workoutData)
        .select()
        .single();

      if (workoutError || !newWorkout) {
        console.error('Error creating workout:', workoutError);
        alert(`Failed to create workout: ${workoutError?.message || 'Unknown error'}`);
        setCreating(false);
        return;
      }

      // Step 2: Create workout instance for the selected date
      const { error: instanceError } = await supabase
        .from('workout_instances')
        .insert({
          workout_id: newWorkout.id,
          athlete_id: athleteId,
          scheduled_date: date,
          status: 'not_started'
        });

      if (instanceError) {
        console.error('Error creating workout instance:', instanceError);
        alert('Failed to schedule workout');
        setCreating(false);
        return;
      }

      console.log('✅ Workout created and scheduled!');
      onSuccess(newWorkout.id);
      onClose();
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
      setCreating(false);
    }
  }

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h2 className="text-xl font-bold text-white">Create New Workout</h2>
            <p className="text-sm text-gray-400 mt-1">{formattedDate}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Workout Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Workout Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Upper Body Strength, Hitting Mechanics"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="strength_conditioning">Strength + Conditioning</option>
              <option value="hitting">Hitting</option>
              <option value="throwing">Throwing</option>
            </select>
          </div>

          {/* Estimated Duration */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Estimated Duration (minutes)
            </label>
            <input
              type="number"
              placeholder="60"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Notes (optional)
            </label>
            <textarea
              placeholder="Additional workout instructions or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>Next Step:</strong> After creating this workout, you can add exercises and routines using the workout builder.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-800">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create & Open Workout'}
          </button>
        </div>
      </div>
    </div>
  );
}
