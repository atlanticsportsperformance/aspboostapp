'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Search, Calendar, ClipboardList } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  workouts_count?: number;
}

interface AssignPlanToGroupModalProps {
  groupId: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AssignPlanToGroupModal({
  groupId,
  onClose,
  onAdded
}: AssignPlanToGroupModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoAssign, setAutoAssign] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    // Filter plans based on search term
    if (searchTerm.trim() === '') {
      setFilteredPlans(plans);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredPlans(
        plans.filter(
          p =>
            p.name.toLowerCase().includes(term) ||
            p.description?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, plans]);

  async function fetchPlans() {
    // Fetch all plans with workout counts
    const { data: plansData, error } = await supabase
      .from('plans')
      .select(`
        *,
        program_days(id)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching plans:', error);
    } else {
      // Add workouts count
      const enriched = (plansData || []).map(p => ({
        ...p,
        workouts_count: p.program_days?.length || 0,
        program_days: undefined // Remove nested data
      }));
      setPlans(enriched);
      setFilteredPlans(enriched);
    }

    setLoading(false);
  }

  async function handleAssignPlan() {
    if (!selectedPlanId || !startDate) {
      alert('Please select a plan and start date');
      return;
    }

    setSaving(true);

    try {
      // Step 1: Fetch the plan with all program days and workouts
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select(`
          *,
          program_days (
            *,
            workouts (
              *,
              routines (
                *,
                routine_exercises (*)
              )
            )
          )
        `)
        .eq('id', selectedPlanId)
        .single();

      if (planError || !plan) {
        throw new Error('Failed to fetch plan');
      }

      // Step 2: For each program day, create a group workout
      const programDays = plan.program_days || [];
      const { data: { user } } = await supabase.auth.getUser();

      for (const programDay of programDays) {
        if (!programDay.workouts) continue;

        const originalWorkout = programDay.workouts;

        // Calculate the scheduled date based on week and day
        const weekOffset = (programDay.week_number - 1) * 7;
        const dayOffset = programDay.day_number - 1;
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(scheduledDate.getDate() + weekOffset + dayOffset);
        const scheduledDateStr = scheduledDate.toISOString().split('T')[0];

        // Step 2a: Create group-owned workout copy
        const { data: newWorkout, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            name: originalWorkout.name,
            category: originalWorkout.category,
            is_template: false,
            group_id: groupId,
            source_workout_id: originalWorkout.id,
            estimated_duration_minutes: originalWorkout.estimated_duration_minutes,
            notes: originalWorkout.notes,
            tags: originalWorkout.tags,
            is_active: true
          })
          .select()
          .single();

        if (workoutError || !newWorkout) {
          console.error('Failed to create workout for day', programDay.day_number);
          continue;
        }

        // Step 2b: Copy all routines
        if (originalWorkout.routines && originalWorkout.routines.length > 0) {
          for (const routine of originalWorkout.routines) {
            const { data: newRoutine, error: routineError } = await supabase
              .from('routines')
              .insert({
                workout_id: newWorkout.id,
                name: routine.name,
                scheme: routine.scheme,
                order_index: routine.order_index,
                is_standalone: false,
                group_id: groupId,
                source_routine_id: routine.id
              })
              .select()
              .single();

            if (routineError || !newRoutine) {
              console.error('Failed to copy routine');
              continue;
            }

            // Copy exercises
            if (routine.routine_exercises && routine.routine_exercises.length > 0) {
              const exerciseCopies = routine.routine_exercises.map((ex: any) => ({
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
                metric_targets: ex.metric_targets,
                intensity_targets: ex.intensity_targets,
                set_configurations: ex.set_configurations,
                notes: ex.notes,
                is_amrap: ex.is_amrap,
                is_placeholder: ex.is_placeholder,
                placeholder_id: ex.placeholder_id,
                placeholder_name: ex.placeholder_name
              }));

              await supabase.from('routine_exercises').insert(exerciseCopies);
            }
          }
        }

        // Step 2c: Create group workout schedule
        await supabase.from('group_workout_schedules').insert({
          group_id: groupId,
          workout_id: newWorkout.id,
          scheduled_date: scheduledDateStr,
          scheduled_time: null,
          notes: `Week ${programDay.week_number}, Day ${programDay.day_number}`,
          auto_assign: autoAssign,
          created_by: user?.id
        });
      }

      console.log('✅ Plan assigned to group successfully');
      onAdded();
    } catch (err: any) {
      console.error('Error assigning plan to group:', err);
      alert(`Failed to assign plan: ${err.message}`);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#9BDDFF]/10 rounded-lg">
              <ClipboardList className="text-[#9BDDFF]" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white">Assign Plan to Group</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search training plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
            />
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Training Plan *
            </label>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading plans...</div>
            ) : filteredPlans.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {searchTerm ? 'No plans found' : 'No training plans available.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedPlanId === plan.id
                        ? 'bg-[#9BDDFF]/10 border-[#9BDDFF] ring-2 ring-[#9BDDFF]/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{plan.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-400">
                            {plan.duration_weeks} weeks
                          </span>
                          {plan.workouts_count! > 0 && (
                            <>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-400">
                                {plan.workouts_count} workouts
                              </span>
                            </>
                          )}
                        </div>
                        {plan.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{plan.description}</p>
                        )}
                      </div>
                      {selectedPlanId === plan.id && (
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#9BDDFF] flex items-center justify-center">
                          <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                Start Date *
              </div>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              All workouts in the plan will be scheduled relative to this date
            </p>
          </div>

          {/* Auto-assign toggle */}
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
            <input
              type="checkbox"
              id="auto-assign-plan"
              checked={autoAssign}
              onChange={(e) => setAutoAssign(e.target.checked)}
              className="w-4 h-4 text-[#9BDDFF] bg-white/5 border-white/20 rounded focus:ring-2 focus:ring-[#9BDDFF]"
            />
            <label htmlFor="auto-assign-plan" className="flex-1 cursor-pointer">
              <div className="text-sm font-medium text-white">Auto-assign to all members</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Automatically create workout instances for all group members and sync updates
              </div>
            </label>
          </div>

          {/* Info box */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-400">
              ℹ️ All workouts from this plan will be copied to the group calendar and scheduled automatically.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssignPlan}
            disabled={saving || !selectedPlanId || !startDate}
            className="flex-1 px-4 py-2 bg-[#9BDDFF] text-black rounded-lg hover:bg-[#7BC5F0] disabled:opacity-50 transition-colors font-medium"
          >
            {saving ? 'Assigning Plan...' : 'Assign to Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
