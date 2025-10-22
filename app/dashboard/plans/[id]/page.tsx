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

interface CalendarWorkout {
  workout_id: string;
  date: string;
  workouts: Workout;
}

interface TrainingPlan {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
}

export default function PlanCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const planId = params.id as string;

  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [calendarWorkouts, setCalendarWorkouts] = useState<CalendarWorkout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [showWorkoutLibrary, setShowWorkoutLibrary] = useState(false);

  useEffect(() => {
    fetchPlan();
    fetchCalendarWorkouts();
  }, [planId, currentWeekStart]);

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  function getWeekDays(weekStart: Date): Date[] {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

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

  async function fetchCalendarWorkouts() {
    const weekDays = getWeekDays(currentWeekStart);
    const startDate = formatDate(weekDays[0]);
    const endDate = formatDate(weekDays[6]);

    const { data, error } = await supabase
      .from('plan_calendar')
      .select(`
        *,
        workouts (id, name, category, estimated_duration_minutes, plan_id)
      `)
      .eq('plan_id', planId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error fetching calendar workouts:', error);
    } else {
      setCalendarWorkouts(data || []);
    }
  }

  function previousWeek() {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  }

  function nextWeek() {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  }

  function goToToday() {
    setCurrentWeekStart(getWeekStart(new Date()));
  }

  function getWorkoutsForDate(date: Date): CalendarWorkout[] {
    const dateStr = formatDate(date);
    return calendarWorkouts.filter(cw => cw.date === dateStr);
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

  const weekDays = getWeekDays(currentWeekStart);
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
                onClick={goToToday}
                className="px-4 py-2 bg-neutral-800/50 border border-neutral-600 hover:bg-neutral-700/50 text-white rounded-md text-sm font-medium transition-all"
              >
                Today
              </button>
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

      {/* Calendar Navigation */}
      <div className="border-b border-neutral-800 bg-black/20 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={previousWeek}
            className="p-2 hover:bg-neutral-800/50 rounded text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <div className="text-xl font-semibold text-white">
              {weekDays[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              {weekDays[0].getMonth() !== weekDays[6].getMonth() &&
                ` - ${weekDays[6].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
            </div>
            <div className="text-sm text-neutral-400">
              {weekDays[0].toLocaleDateString()} - {weekDays[6].toLocaleDateString()}
            </div>
          </div>

          <button
            onClick={nextWeek}
            className="p-2 hover:bg-neutral-800/50 rounded text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 gap-px bg-neutral-800 p-px min-h-full">
          {weekDays.map((day, index) => {
            const workouts = getWorkoutsForDate(day);
            const isToday = formatDate(day) === formatDate(new Date());

            return (
              <div
                key={index}
                className={`bg-neutral-950 p-4 min-h-[200px] ${
                  isToday ? 'ring-2 ring-blue-500 ring-inset' : ''
                }`}
              >
                {/* Day Header */}
                <div className="mb-3 pb-2 border-b border-neutral-800">
                  <div className={`text-sm font-semibold ${isToday ? 'text-blue-400' : 'text-neutral-400'}`}>
                    {dayNames[index]}
                  </div>
                  <div className={`text-2xl font-bold ${isToday ? 'text-white' : 'text-neutral-500'}`}>
                    {day.getDate()}
                  </div>
                </div>

                {/* Workouts for this day */}
                <div className="space-y-2">
                  {workouts.map((cw) => (
                    <button
                      key={cw.workout_id}
                      onClick={() => setSelectedWorkout(cw.workouts)}
                      className="w-full text-left p-3 bg-neutral-900/50 hover:bg-neutral-800/50 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-all group"
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-1 h-full ${getCategoryColor(cw.workouts.category)} rounded-full shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                            {cw.workouts.name}
                          </div>
                          {cw.workouts.estimated_duration_minutes && (
                            <div className="text-xs text-neutral-500">
                              {cw.workouts.estimated_duration_minutes} min
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
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
              <h2 className="text-xl font-bold text-white">Add Workout to Plan</h2>
              <button
                onClick={() => setShowWorkoutLibrary(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-neutral-400">Workout library integration coming soon...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
