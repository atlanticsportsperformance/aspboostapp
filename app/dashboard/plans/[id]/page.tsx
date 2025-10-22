'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Workout {
  id: string;
  name: string;
  category: string | null;
  estimated_duration_minutes: number | null;
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
  const [currentWeek, setCurrentWeek] = useState(1);
  const [programDays, setProgramDays] = useState<ProgramDay[]>([]);
  const [showWorkoutLibrary, setShowWorkoutLibrary] = useState(false);

  const dayNames = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  useEffect(() => {
    if (plan) {
      fetchProgramDays();
    }
  }, [plan, currentWeek]);

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
    const { data, error } = await supabase
      .from('program_days')
      .select(`
        *,
        workouts (id, name, category, estimated_duration_minutes, plan_id)
      `)
      .eq('plan_id', planId)
      .eq('week_number', currentWeek)
      .order('day_number');

    if (error) {
      console.error('Error fetching program days:', error);
    } else {
      setProgramDays(data || []);
    }
  }

  function previousWeek() {
    if (currentWeek > 1) {
      setCurrentWeek(currentWeek - 1);
    }
  }

  function nextWeek() {
    if (plan && currentWeek < plan.program_length_weeks) {
      setCurrentWeek(currentWeek + 1);
    }
  }

  function getWorkoutsForDay(dayNumber: number): ProgramDay[] {
    return programDays.filter(pd => pd.day_number === dayNumber);
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

      {/* Week Navigation */}
      <div className="border-b border-neutral-800 bg-black/20 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={previousWeek}
            disabled={currentWeek === 1}
            className="p-2 hover:bg-neutral-800/50 rounded text-neutral-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <div className="text-xl font-semibold text-white">
              Week {currentWeek} of {plan.program_length_weeks}
            </div>
            <div className="text-sm text-neutral-400">
              {programDays.filter(pd => pd.workout_id).length} workouts this week
            </div>
          </div>

          <button
            onClick={nextWeek}
            disabled={currentWeek === plan.program_length_weeks}
            className="p-2 hover:bg-neutral-800/50 rounded text-neutral-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekly Program Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 gap-px bg-neutral-800 p-px min-h-full">
          {[1, 2, 3, 4, 5, 6, 7].map((dayNumber) => {
            const dayWorkouts = getWorkoutsForDay(dayNumber);

            return (
              <div
                key={dayNumber}
                className="bg-neutral-950 p-4 min-h-[200px]"
              >
                {/* Day Header */}
                <div className="mb-3 pb-2 border-b border-neutral-800">
                  <div className="text-sm font-semibold text-neutral-400">
                    {dayNames[dayNumber - 1]}
                  </div>
                </div>

                {/* Workouts for this day */}
                <div className="space-y-2">
                  {dayWorkouts.map((pd) => (
                    pd.workouts && (
                      <button
                        key={pd.id}
                        className="w-full text-left p-3 bg-neutral-900/50 hover:bg-neutral-800/50 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-all group"
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-1 h-full ${getCategoryColor(pd.workouts.category)} rounded-full shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                              {pd.workouts.name}
                            </div>
                            {pd.workouts.estimated_duration_minutes && (
                              <div className="text-xs text-neutral-500">
                                {pd.workouts.estimated_duration_minutes} min
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  ))}

                  {/* Add workout button */}
                  <button
                    onClick={() => setShowWorkoutLibrary(true)}
                    className="w-full p-3 border-2 border-dashed border-neutral-800 hover:border-neutral-600 rounded-lg text-neutral-600 hover:text-neutral-400 transition-all text-sm"
                  >
                    + Add Workout
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workout Library Modal - Placeholder for now */}
      {showWorkoutLibrary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Add Workout to Program</h2>
              <button
                onClick={() => setShowWorkoutLibrary(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-neutral-400">Workout library integration coming soon...</p>
              <p className="text-neutral-500 text-sm mt-2">You'll be able to:</p>
              <ul className="list-disc list-inside text-neutral-500 text-sm mt-2 space-y-1">
                <li>Browse template workouts</li>
                <li>Copy workout to this plan (Week {currentWeek})</li>
                <li>Assign to specific day</li>
                <li>Maintain full independence from template</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
