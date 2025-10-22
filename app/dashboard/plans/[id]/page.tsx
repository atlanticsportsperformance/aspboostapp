'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AddWorkoutToPlanDialog from '@/components/dashboard/plans/add-workout-to-plan-dialog';
import WorkoutDetailSlideover from '@/components/dashboard/plans/workout-detail-slideover';

interface Workout {
  id: string;
  name: string;
  category: string | null;
  estimated_duration_minutes: number | null;
  notes: string | null;
  plan_id: string | null;
}

interface ProgramDay {
  id: string;
  plan_id: string;
  week_number: number;
  day_number: number;
  workout_id: string | null;
  order_index: number;
  workouts: Workout | null;
}

interface TrainingPlan {
  id: string;
  name: string;
  description: string | null;
  program_length_weeks: number;
}

export default function PlanCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const planId = params.id as string;

  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [programDays, setProgramDays] = useState<ProgramDay[]>([]);
  const [showWorkoutLibrary, setShowWorkoutLibrary] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<{ workout: Workout; week: number; day: number } | null>(null);

  const dayNames = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  useEffect(() => {
    if (plan) {
      fetchProgramDays();
    }
  }, [plan]);

  async function fetchPlan() {
    const { data, error } = await supabase
      .from('training_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error) {
      console.error('Error fetching plan:', error);
      alert('Failed to load plan');
      router.push('/dashboard/plans');
    } else {
      setPlan(data);
    }
    setLoading(false);
  }

  async function fetchProgramDays() {
    // Fetch ALL program days for the entire plan
    const { data, error } = await supabase
      .from('program_days')
      .select(`
        *,
        workouts (id, name, category, estimated_duration_minutes, notes, plan_id)
      `)
      .eq('plan_id', planId)
      .order('week_number')
      .order('day_number');

    if (error) {
      console.error('Error fetching program days:', error);
    } else {
      setProgramDays(data || []);
    }
  }

  function getWorkoutsForDay(weekNumber: number, dayNumber: number): ProgramDay[] {
    return programDays.filter(pd => pd.week_number === weekNumber && pd.day_number === dayNumber);
  }

  function getTotalWorkouts(): number {
    return programDays.filter(pd => pd.workout_id !== null).length;
  }

  async function handleAddWeek() {
    if (!plan) return;

    const newWeekCount = plan.program_length_weeks + 1;

    // Update plan length
    const { error: planError } = await supabase
      .from('training_plans')
      .update({ program_length_weeks: newWeekCount })
      .eq('id', planId);

    if (planError) {
      console.error('Error updating plan length:', planError);
      alert('Failed to add week');
      return;
    }

    // Initialize the new week's structure
    const { error: initError } = await supabase.rpc('initialize_program_structure', {
      p_plan_id: planId,
      p_weeks: newWeekCount
    });

    if (initError) {
      console.error('Error initializing new week:', initError);
    }

    // Refresh data
    await fetchPlan();
    await fetchProgramDays();
  }

  function getCategoryColor(category: string | null) {
    const colors: { [key: string]: string } = {
      hitting: 'bg-red-500',
      throwing: 'bg-blue-500',
      strength_conditioning: 'bg-green-500',
    };
    return colors[category?.toLowerCase() || ''] || 'bg-neutral-500';
  }

  if (loading || !plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading plan...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-black/30 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/dashboard/plans"
              className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <span>←</span> Back to Plans
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowWorkoutLibrary(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-all"
              >
                + Add Workout
              </button>
            </div>
          </div>

          {/* Plan Name */}
          <h1 className="text-2xl font-bold text-white mb-2">{plan.name}</h1>
          {plan.description && (
            <p className="text-neutral-400 text-sm">{plan.description}</p>
          )}
        </div>
      </div>

      {/* Program Stats */}
      <div className="border-b border-neutral-800 bg-black/20 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-400">
            {plan.program_length_weeks} week program • {getTotalWorkouts()} total workouts
          </div>
        </div>
      </div>

      {/* Full Program Grid - All Weeks */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {Array.from({ length: plan.program_length_weeks }, (_, weekIndex) => {
            const weekNumber = weekIndex + 1;
            const weekWorkoutCount = programDays.filter(
              pd => pd.week_number === weekNumber && pd.workout_id !== null
            ).length;

            return (
              <div key={weekNumber} className="space-y-1.5">
                {/* Week Header */}
                <div className="flex items-center gap-3 px-2 py-1">
                  <h2 className="text-sm font-bold text-white">
                    Week {weekNumber}
                  </h2>
                  <span className="text-xs text-neutral-500">
                    {weekWorkoutCount} {weekWorkoutCount === 1 ? 'workout' : 'workouts'}
                  </span>
                </div>

                {/* Week Grid */}
                <div className="grid grid-cols-7 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((dayNumber) => {
                    const dayWorkouts = getWorkoutsForDay(weekNumber, dayNumber);

                    return (
                      <div
                        key={dayNumber}
                        className="bg-neutral-900/30 border border-neutral-800 rounded p-2 min-h-[100px]"
                      >
                        {/* Day Header */}
                        <div className="mb-1.5 pb-1 border-b border-neutral-800">
                          <div className="text-[10px] font-semibold text-neutral-500 uppercase">
                            {dayNames[dayNumber - 1]}
                          </div>
                        </div>

                        {/* Workouts for this day */}
                        <div className="space-y-1">
                          {dayWorkouts.map((pd) => (
                            pd.workouts && (
                              <button
                                key={pd.id}
                                onClick={() => setSelectedWorkout({ workout: pd.workouts!, week: weekNumber, day: dayNumber })}
                                className="w-full text-left p-1.5 bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700 hover:border-neutral-600 rounded transition-all group"
                              >
                                <div className="flex items-start gap-1">
                                  <div className={`w-0.5 h-full ${getCategoryColor(pd.workouts.category)} rounded-full shrink-0`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-medium text-white truncate group-hover:text-blue-400 transition-colors leading-tight">
                                      {pd.workouts.name}
                                    </div>
                                    {pd.workouts.estimated_duration_minutes && (
                                      <div className="text-[9px] text-neutral-500 mt-0.5">
                                        {pd.workouts.estimated_duration_minutes}min
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            )
                          ))}

                          {/* Add workout button */}
                          {dayWorkouts.filter(pd => pd.workout_id).length === 0 && (
                            <button
                              onClick={() => setShowWorkoutLibrary(true)}
                              className="w-full p-1.5 border border-dashed border-neutral-800 hover:border-neutral-600 rounded text-neutral-600 hover:text-neutral-400 transition-all text-xs"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Add Week Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleAddWeek}
              className="px-6 py-3 bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700 hover:border-neutral-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Week
            </button>
          </div>
        </div>
      </div>

      {/* Workout Library Modal */}
      {showWorkoutLibrary && plan && (
        <AddWorkoutToPlanDialog
          planId={planId}
          programLengthWeeks={plan.program_length_weeks}
          onClose={() => setShowWorkoutLibrary(false)}
          onSuccess={() => {
            setShowWorkoutLibrary(false);
            fetchProgramDays();
          }}
        />
      )}

      {/* Workout Detail Slide-over */}
      {selectedWorkout && (
        <WorkoutDetailSlideover
          workout={selectedWorkout.workout}
          weekNumber={selectedWorkout.week}
          dayNumber={selectedWorkout.day}
          onClose={() => setSelectedWorkout(null)}
          onUpdate={() => {
            setSelectedWorkout(null);
            fetchProgramDays();
          }}
        />
      )}
    </div>
  );
}
