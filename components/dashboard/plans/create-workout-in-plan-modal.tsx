'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CreateWorkoutInPlanModalProps {
  planId: string;
  weekNumber: number;
  dayNumber: number;
  onClose: () => void;
  onSuccess: (workoutId: string) => void; // Now returns the workout ID
}

export function CreateWorkoutInPlanModal({
  planId,
  weekNumber,
  dayNumber,
  onClose,
  onSuccess
}: CreateWorkoutInPlanModalProps) {
  const supabase = createClient();
  const [workoutName, setWorkoutName] = useState('');
  const [category, setCategory] = useState<'hitting' | 'throwing' | 'strength_conditioning'>('strength_conditioning');
  const [estimatedDuration, setEstimatedDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  async function handleCreate() {
    if (!workoutName.trim()) {
      alert('Please enter a workout name');
      return;
    }

    setCreating(true);

    try {
      console.log('Creating workout with planId:', planId);
      console.log('Week:', weekNumber, 'Day:', dayNumber);

      // Verify the plan exists
      console.log('Checking if plan exists with ID:', planId);
      const { data: planExists, error: planCheckError } = await supabase
        .from('training_plans')
        .select('id, name, program_length_weeks')
        .eq('id', planId)
        .single();

      if (planCheckError || !planExists) {
        console.error('❌ Plan does not exist!');
        console.error('❌ Plan ID we tried:', planId);
        console.error('❌ Error:', planCheckError);
        alert(`The plan does not exist in the database. Plan ID: ${planId}. Check console for details.`);
        setCreating(false);
        return;
      }

      console.log('✅ Plan verified exists:', planExists.id);
      console.log('✅ Plan name:', planExists.name);
      console.log('✅ Plan length:', planExists.program_length_weeks, 'weeks');

      // Step 1: Create the workout WITHOUT plan_id first (to avoid FK constraint issues)
      const workoutData: any = {
        name: workoutName.trim(),
        estimated_duration_minutes: parseInt(estimatedDuration) || null,
        is_template: false,              // ✅ NOT a template
        athlete_id: null,                // ✅ NOT for athlete yet
        source_workout_id: null,
        placeholder_definitions: { placeholders: [] }
      };

      // Add optional fields if they have values
      if (category) workoutData.category = category;
      if (notes.trim()) workoutData.notes = notes.trim();

      console.log('=== CREATING PLAN WORKOUT ===');
      console.log('is_template:', workoutData.is_template, '(should be false)');
      console.log('athlete_id:', workoutData.athlete_id, '(should be null)');

      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert(workoutData)
        .select()
        .single();

      if (workoutError || !newWorkout) {
        console.error('❌ Error creating workout:', workoutError);
        alert(`Failed to create workout: ${workoutError?.message || 'Unknown error'}`);
        setCreating(false);
        return;
      }

      console.log('✅ Workout created:', newWorkout.id);
      console.log('✅ is_template:', newWorkout.is_template, '(should be false)');

      // Step 1.5: Update the workout to set plan_id (doing this separately to avoid FK issues)
      if (planId) {
        console.log('Attempting to set plan_id:', planId);
        console.log('Workout ID:', newWorkout.id);

        const { error: updateError } = await supabase
          .from('workouts')
          .update({ plan_id: planId })
          .eq('id', newWorkout.id);

        if (updateError) {
          console.error('❌ Error setting plan_id:', updateError);
          console.error('❌ Full error:', JSON.stringify(updateError, null, 2));
          console.error('❌ Plan ID that failed:', planId);
          console.error('❌ Workout ID:', newWorkout.id);

          // Check if the plan actually exists
          const { data: planCheck, error: planCheckError } = await supabase
            .from('training_plans')
            .select('id, name')
            .eq('id', planId)
            .single();

          console.error('❌ Plan exists check:', planCheck ? 'YES' : 'NO');
          if (planCheck) {
            console.error('❌ Plan details:', planCheck);
          }
          if (planCheckError) {
            console.error('❌ Plan check error:', planCheckError);
          }

          alert(`Warning: Workout created but couldn't link to plan. The plan ID might be invalid. Check console for details.`);
          setCreating(false);
          return;
        } else {
          console.log('✅ plan_id set successfully:', planId);
        }
      }

      // Verify the workout won't show in library
      if (newWorkout.is_template || !planId) {
        console.error('🚨 BUG: Workout was created incorrectly!');
        console.error('is_template:', newWorkout.is_template, '(should be false)');
        console.error('plan_id will be:', planId, '(should have value)');
      }

      // Step 2: Assign workout to the specific program day
      // First check if a program_day already exists for this week/day
      const { data: existingDay } = await supabase
        .from('program_days')
        .select('id')
        .eq('plan_id', planId)
        .eq('week_number', weekNumber)
        .eq('day_number', dayNumber)
        .is('workout_id', null)
        .single();

      if (existingDay) {
        // Update existing empty slot
        const { error: updateError } = await supabase
          .from('program_days')
          .update({ workout_id: newWorkout.id })
          .eq('id', existingDay.id);

        if (updateError) {
          console.error('Error updating program day:', updateError);
          alert('Failed to add workout to schedule');
          setCreating(false);
          return;
        }
      } else {
        // Insert new program_day entry
        const { error: insertError } = await supabase
          .from('program_days')
          .insert({
            plan_id: planId,
            week_number: weekNumber,
            day_number: dayNumber,
            workout_id: newWorkout.id,
            order_index: 0
          });

        if (insertError) {
          console.error('Error inserting program day:', insertError);
          alert('Failed to add workout to schedule');
          setCreating(false);
          return;
        }
      }

      // Step 3: Return workout ID to open builder modal
      console.log('✅ Workout created and assigned to plan!');

      onSuccess(newWorkout.id); // Pass the workout ID
      onClose();
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Create New Workout</h2>
            <p className="text-sm text-gray-400 mt-1">
              Week {weekNumber}, {dayNames[dayNumber - 1]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
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
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>Next Steps:</strong><br />
              After creating this workout, it will open in a new tab where you can add exercises,
              routines, and placeholders. The workout will be automatically assigned to this day in your plan.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create & Open Workout'}
          </button>
        </div>
      </div>
    </div>
  );
}
