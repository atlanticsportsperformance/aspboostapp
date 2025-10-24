'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AssignPlanModalProps {
  planId: string | null;
  athleteId: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  program_length_weeks: number;
  is_template: boolean;
}

export function AssignPlanModal({ planId: initialPlanId, athleteId, onSuccess, onClose }: AssignPlanModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(initialPlanId);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      const plan = plans.find(p => p.id === selectedPlanId);
      setSelectedPlan(plan || null);
    }
  }, [selectedPlanId, plans]);

  async function fetchPlans() {
    setLoadingPlans(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('training_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching plans:', error);
      alert('Error loading plans: ' + error.message);
    } else {
      console.log('Fetched plans:', data);
      setPlans(data || []);
      // If planId was provided initially, select it
      if (initialPlanId && data) {
        const plan = data.find(p => p.id === initialPlanId);
        setSelectedPlan(plan || null);
      }
    }

    setLoadingPlans(false);
  }

  async function handleAssign() {
    if (!selectedPlanId) {
      alert('Please select a plan');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      // Get current user for assigned_by
      const { data: { user } } = await supabase.auth.getUser();

      // Get all program_days for this plan
      const { data: programDays, error: programDaysError } = await supabase
        .from('program_days')
        .select(`
          *,
          workouts (*)
        `)
        .eq('plan_id', selectedPlanId)
        .order('week_number')
        .order('day_number');

      if (programDaysError) throw programDaysError;

      console.log('Program days:', programDays);

      // Filter out empty days (no workout)
      const daysWithWorkouts = programDays?.filter(pd => pd.workout_id !== null) || [];

      if (daysWithWorkouts.length === 0) {
        alert('This plan has no workouts to assign');
        setLoading(false);
        return;
      }

      // Create deep copies of all workouts for this athlete
      const workoutCopies = [];

      for (const programDay of daysWithWorkouts) {
        const originalWorkout = programDay.workouts;
        console.log('Processing workout:', originalWorkout?.name);

        // Create athlete-owned workout copy
        const { data: newWorkout, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            name: originalWorkout.name,
            category: originalWorkout.category,
            estimated_duration_minutes: originalWorkout.estimated_duration_minutes,
            notes: originalWorkout.notes,
            is_template: false,
            athlete_id: athleteId,
            plan_id: null,
            source_workout_id: originalWorkout.id,
            placeholder_definitions: originalWorkout.placeholder_definitions || { placeholders: [] }
          })
          .select()
          .single();

        if (workoutError) {
          console.error('Error creating workout copy:', workoutError);
          throw workoutError;
        }

        // Copy routines for this workout
        const { data: routines, error: routinesError } = await supabase
          .from('routines')
          .select('*')
          .eq('workout_id', originalWorkout.id)
          .order('order_index');

        if (routinesError) {
          console.error('Error fetching routines:', routinesError);
          throw routinesError;
        }

        console.log(`Found ${routines?.length || 0} routines for workout ${originalWorkout.name}`);

        for (const routine of routines || []) {
          console.log('Copying routine:', routine.name);
          const { data: newRoutine, error: routineError } = await supabase
            .from('routines')
            .insert({
              workout_id: newWorkout.id,
              name: routine.name,
              scheme: routine.scheme,
              order_index: routine.order_index,
              rest_between_rounds_seconds: routine.rest_between_rounds_seconds,
              notes: routine.notes,
              superset_block_name: routine.superset_block_name,
              text_info: routine.text_info,
              is_standalone: false,
              athlete_id: athleteId,
              plan_id: null,
              source_routine_id: routine.id
            })
            .select()
            .single();

          if (routineError) {
            console.error('Error creating routine copy:', routineError);
            throw routineError;
          }

          // Copy exercises for this routine
          const { data: exercises, error: exercisesError } = await supabase
            .from('routine_exercises')
            .select('*')
            .eq('routine_id', routine.id)
            .order('order_index');

          if (exercisesError) {
            console.error('Error fetching exercises:', exercisesError);
            throw exercisesError;
          }

          console.log(`Found ${exercises?.length || 0} exercises for routine ${routine.name}`);

          const exerciseCopies = (exercises || []).map(ex => ({
            routine_id: newRoutine.id,
            exercise_id: ex.exercise_id,
            order_index: ex.order_index,
            sets: ex.sets,
            reps_min: ex.reps_min,
            reps_max: ex.reps_max,
            time_seconds: ex.time_seconds,
            percent_1rm: ex.percent_1rm,
            rpe_target: ex.rpe_target,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes,
            is_placeholder: ex.is_placeholder,
            placeholder_id: ex.placeholder_id,
            placeholder_name: ex.placeholder_name,
            metric_targets: ex.metric_targets,
            intensity_targets: ex.intensity_targets,
            set_configurations: ex.set_configurations
          }));

          if (exerciseCopies.length > 0) {
            console.log('Inserting exercise copies:', exerciseCopies);
            const { error: exerciseInsertError } = await supabase
              .from('routine_exercises')
              .insert(exerciseCopies);

            if (exerciseInsertError) {
              console.error('Error inserting exercises:', {
                error: exerciseInsertError,
                message: exerciseInsertError.message,
                details: exerciseInsertError.details,
                hint: exerciseInsertError.hint,
                code: exerciseInsertError.code,
                exerciseCopies: exerciseCopies
              });
              throw new Error(`Failed to insert exercises: ${exerciseInsertError.message || JSON.stringify(exerciseInsertError)}`);
            }
          }
        }

        // Calculate scheduled date based on week/day from program_days
        const weekOffset = (programDay.week_number - 1) * 7;
        const dayOffset = programDay.day_number - 1; // day_number is 1-7
        const totalOffset = weekOffset + dayOffset;

        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(scheduledDate.getDate() + totalOffset);

        workoutCopies.push({
          workout_id: newWorkout.id,
          athlete_id: athleteId,
          scheduled_date: scheduledDate.toISOString().split('T')[0],
          status: 'not_started'
        });
      }

      // Create workout instances
      console.log('Creating workout instances:', workoutCopies);
      const { error: instancesError } = await supabase
        .from('workout_instances')
        .insert(workoutCopies);

      if (instancesError) {
        console.error('Error creating workout instances:', instancesError);
        throw instancesError;
      }

      console.log(`Successfully assigned ${workoutCopies.length} workouts to athlete`);

      alert(`Successfully assigned ${selectedPlan?.name}!\n${workoutCopies.length} workouts scheduled.`);

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error assigning plan:', error);
      alert(`Error assigning plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  const filteredPlans = plans.filter(plan =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
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

        {loadingPlans ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            <p className="mt-4 text-gray-400">Loading plans...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Plan Selection */}
            {!selectedPlanId && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Select a Training Plan
                </label>

                {/* Search */}
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full mb-4 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Plan List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className="w-full text-left p-4 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-lg transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold mb-1">{plan.name}</h3>
                          {plan.description && (
                            <p className="text-sm text-gray-400 mb-2 line-clamp-2">{plan.description}</p>
                          )}
                          <div className="text-xs text-gray-500">
                            {plan.program_length_weeks} {plan.program_length_weeks === 1 ? 'week' : 'weeks'}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}

                  {filteredPlans.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No plans found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Selected Plan Details */}
            {selectedPlanId && selectedPlan && (
              <div className="space-y-4">
                {/* Plan Info */}
                <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{selectedPlan.name}</h3>
                      {selectedPlan.description && (
                        <p className="text-sm text-gray-400 mb-2">{selectedPlan.description}</p>
                      )}
                      <div className="text-sm text-gray-400">
                        {selectedPlan.program_length_weeks} {selectedPlan.program_length_weeks === 1 ? 'week' : 'weeks'}
                      </div>
                    </div>
                    {!initialPlanId && (
                      <button
                        onClick={() => {
                          setSelectedPlanId(null);
                          setSelectedPlan(null);
                        }}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Change
                      </button>
                    )}
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
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Workouts will be scheduled starting from this date based on the plan's weekly structure
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition-all font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssign}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                        Assigning...
                      </>
                    ) : (
                      <>Assign Plan →</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
