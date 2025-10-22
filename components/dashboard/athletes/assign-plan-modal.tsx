'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AssignPlanModalProps {
  planId: string;
  athleteId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function AssignPlanModal({ planId, athleteId, onSuccess, onClose }: AssignPlanModalProps) {
  const [importMode, setImportMode] = useState<'as_scheduled' | 'choose_days'>('as_scheduled');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDays, setSelectedDays] = useState<string[]>(['mon', 'wed', 'fri']); // For choose_days mode
  const [firstWorkoutIndex, setFirstWorkoutIndex] = useState(0); // Which workout to start with
  const [skipRestDays, setSkipRestDays] = useState(true);
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);

  useEffect(() => {
    fetchPlanDetails();
  }, [planId]);

  async function fetchPlanDetails() {
    const supabase = createClient();

    // Get plan details
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    console.log('Plan details:', planData, planError);

    if (planData) {
      setPlan(planData);
    }

    // Get workouts for this plan
    const { data: workoutsData, error: workoutsError } = await supabase
      .from('workouts')
      .select('*')
      .eq('plan_id', planId)
      .order('week_number')
      .order('day_of_week');

    console.log('Plan workouts:', workoutsData, workoutsError);

    if (workoutsData) {
      setWorkouts(workoutsData);
    }
  }

  async function handleAssign() {
    setLoading(true);
    const supabase = createClient();

    try {
      // Get current user for assigned_by
      const { data: { user } } = await supabase.auth.getUser();

      // Step 1: Deactivate existing active plans if replaceExisting
      if (replaceExisting) {
        await supabase
          .from('plan_assignments')
          .update({ is_active: false })
          .eq('athlete_id', athleteId)
          .eq('is_active', true);
      }

      // Step 2: Create plan_assignment
      const { data: assignment, error: assignError } = await supabase
        .from('plan_assignments')
        .insert({
          plan_id: planId,
          athlete_id: athleteId,
          start_date: startDate,
          assigned_by: user?.id,
          assigned_at: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (assignError) throw assignError;

      console.log('Created plan assignment:', assignment);

      // Step 3: Calculate scheduled dates for each workout
      const instances = workouts
        .map(workout => {
          // Calculate date based on week_number and day_of_week
          const weekOffset = (workout.week_number - 1) * 7;
          const dayOffset = dayOfWeekToNumber(workout.day_of_week);
          const totalOffset = weekOffset + dayOffset;

          const scheduledDate = new Date(startDate);
          scheduledDate.setDate(scheduledDate.getDate() + totalOffset);

          // Skip weekends if option checked
          if (skipWeekends && (scheduledDate.getDay() === 0 || scheduledDate.getDay() === 6)) {
            return null; // Skip this workout
          }

          return {
            assignment_id: assignment.id,
            workout_id: workout.id,
            athlete_id: athleteId,
            scheduled_date: scheduledDate.toISOString().split('T')[0],
            status: 'not_started',
          };
        })
        .filter(Boolean); // Remove nulls

      console.log(`Creating ${instances.length} workout instances`);

      // Step 4: Bulk insert workout_instances
      const { error: instancesError } = await supabase
        .from('workout_instances')
        .insert(instances);

      if (instancesError) throw instancesError;

      console.log(`Successfully assigned ${instances.length} workouts to athlete`);

      // Show success message
      alert(`Successfully assigned ${plan.name}!\n${instances.length} workouts scheduled.`);

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error assigning plan:', error);
      alert(`Error assigning plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  // Group workouts by week for preview
  const workoutsByWeek: { [key: number]: any[] } = {};
  workouts.forEach(w => {
    if (!workoutsByWeek[w.week_number]) {
      workoutsByWeek[w.week_number] = [];
    }
    workoutsByWeek[w.week_number].push(w);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">📋 Assign Training Plan</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {plan && (
          <div className="space-y-4">
            {/* Plan Info */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
              {plan.description && (
                <p className="text-sm text-gray-400 mb-2">{plan.description}</p>
              )}
              <div className="flex gap-4 text-sm">
                <span className="text-gray-400">
                  {plan.total_weeks} {plan.total_weeks === 1 ? 'week' : 'weeks'}
                </span>
                <span className="text-gray-400">
                  {workouts.length} {workouts.length === 1 ? 'workout' : 'workouts'}
                </span>
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#C9A857]"
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipRestDays}
                  onChange={(e) => setSkipRestDays(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10"
                />
                <span className="text-sm text-white">Skip rest days (no workouts)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipWeekends}
                  onChange={(e) => setSkipWeekends(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10"
                />
                <span className="text-sm text-white">Skip weekends</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10"
                />
                <span className="text-sm text-white">Send athlete notification</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10"
                />
                <span className="text-sm text-white">Replace existing active plans</span>
              </label>
            </div>

            {/* Preview */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="text-sm font-medium text-white mb-3">Preview</p>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Duration:</span>
                  <span className="text-white font-medium">{plan.total_weeks} weeks</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Workouts:</span>
                  <span className="text-white font-medium">{workouts.length}</span>
                </div>

                {/* Show first few workouts */}
                <div className="border-t border-white/10 pt-3 mt-3">
                  <p className="text-xs text-gray-400 mb-2">Sample schedule:</p>
                  {Object.keys(workoutsByWeek).slice(0, 2).map((weekNum) => {
                    const weekWorkouts = workoutsByWeek[parseInt(weekNum)];
                    return (
                      <div key={weekNum} className="mb-2">
                        <p className="text-xs font-medium text-[#C9A857] mb-1">Week {weekNum}:</p>
                        {weekWorkouts.slice(0, 3).map((w, idx) => (
                          <p key={idx} className="text-xs text-gray-400 pl-3">
                            • {w.day_of_week}: {w.name}
                          </p>
                        ))}
                        {weekWorkouts.length > 3 && (
                          <p className="text-xs text-gray-500 pl-3">
                            ... and {weekWorkouts.length - 3} more
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-all font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={loading || !plan}
                className="flex-1 px-4 py-3 rounded-lg bg-[#C9A857] text-black font-semibold hover:bg-[#B89647] transition-all disabled:opacity-50"
              >
                {loading ? 'Assigning...' : 'Assign Plan →'}
              </button>
            </div>
          </div>
        )}

        {!plan && (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#C9A857] border-r-transparent"></div>
            <p className="mt-4 text-gray-400">Loading plan details...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function
function dayOfWeekToNumber(day: string | null): number {
  if (!day) return 0;
  const map: { [key: string]: number } = {
    mon: 0,
    monday: 0,
    tue: 1,
    tuesday: 1,
    wed: 2,
    wednesday: 2,
    thu: 3,
    thursday: 3,
    fri: 4,
    friday: 4,
    sat: 5,
    saturday: 5,
    sun: 6,
    sunday: 6,
  };
  return map[day.toLowerCase()] || 0;
}
