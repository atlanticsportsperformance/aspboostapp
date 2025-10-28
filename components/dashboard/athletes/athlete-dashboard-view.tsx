'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface AthleteDashboardViewProps {
  athleteId: string;
  fullName: string;
}

function getGreeting() {
  // Use local time for greeting
  const now = new Date();
  const hour = now.getHours(); // This automatically uses local time
  if (hour >= 4 && hour < 12) return 'Good morning';
  return 'Welcome back';
}

interface WorkoutInstance {
  id: string;
  workout_id: string;
  scheduled_date: string;
  status: string;
  completed_at: string | null;
  workouts: {
    id: string;
    name: string;
    category: 'hitting' | 'throwing' | 'strength_conditioning' | null;
    estimated_duration_minutes: number | null;
  } | null;
}

interface ForceProfileData {
  composite_score: number;
  percentile_rank: number;
  best_metric: { name: string; percentile: number } | null;
  worst_metric: { name: string; percentile: number } | null;
}

type ViewMode = 'month' | 'day';

const CATEGORY_COLORS = {
  hitting: {
    dot: 'bg-red-500',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    label: 'Hitting'
  },
  throwing: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    label: 'Throwing'
  },
  strength_conditioning: {
    dot: 'bg-green-500',
    badge: 'bg-green-500/20 text-green-300 border-green-500/30',
    label: 'Strength & Conditioning'
  }
};

export default function AthleteDashboardView({ athleteId, fullName }: AthleteDashboardViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [workoutInstances, setWorkoutInstances] = useState<WorkoutInstance[]>([]);
  const [forceProfile, setForceProfile] = useState<ForceProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [valdProfileId, setValdProfileId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [athleteId, currentDate]);

  async function fetchData() {
    setLoading(true);
    await Promise.all([
      fetchWorkoutInstances(),
      fetchForceProfile()
    ]);
    setLoading(false);
  }

  async function fetchWorkoutInstances() {
    // Get first and last day of current month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startStr = firstDay.toISOString().split('T')[0];
    const endStr = lastDay.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('workout_instances')
      .select(`
        *,
        workouts (id, name, category, estimated_duration_minutes)
      `)
      .eq('athlete_id', athleteId)
      .gte('scheduled_date', startStr)
      .lte('scheduled_date', endStr)
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Error fetching workouts:', error);
    } else {
      setWorkoutInstances(data || []);
    }
  }

  async function fetchForceProfile() {
    // Get athlete's VALD profile ID and play level
    const { data: athlete } = await supabase
      .from('athletes')
      .select('vald_profile_id, play_level')
      .eq('id', athleteId)
      .single();

    if (!athlete?.vald_profile_id) {
      setValdProfileId(null);
      return;
    }

    setValdProfileId(athlete.vald_profile_id);

    if (!athlete.play_level) {
      return;
    }

    // Fetch latest FORCE_PROFILE composite
    const { data: composite } = await supabase
      .from('athlete_percentile_history')
      .select('percentile_play_level, test_date')
      .eq('athlete_id', athleteId)
      .eq('test_type', 'FORCE_PROFILE')
      .eq('play_level', athlete.play_level)
      .order('test_date', { ascending: false })
      .limit(1)
      .single();

    if (!composite) return;

    // Fetch the 6 individual metrics to find best and worst
    const metrics = [
      { test_type: 'SJ', metric_name: 'Peak Power (W)', displayName: 'SJ Power' },
      { test_type: 'SJ', metric_name: 'Peak Power / BM (W/kg)', displayName: 'SJ Power/BM' },
      { test_type: 'HJ', metric_name: 'Reactive Strength Index', displayName: 'HJ RSI' },
      { test_type: 'PPU', metric_name: 'Peak Takeoff Force (N)', displayName: 'PPU Force' },
      { test_type: 'IMTP', metric_name: 'Net Peak Force (N)', displayName: 'IMTP Net Force' },
      { test_type: 'IMTP', metric_name: 'Relative Strength', displayName: 'IMTP Relative' },
    ];

    const percentiles: Array<{ name: string; percentile: number }> = [];

    for (const metric of metrics) {
      const { data: metricData } = await supabase
        .from('athlete_percentile_history')
        .select('percentile_play_level')
        .eq('athlete_id', athleteId)
        .eq('test_type', metric.test_type)
        .eq('metric_name', metric.metric_name)
        .eq('play_level', athlete.play_level)
        .order('test_date', { ascending: false })
        .limit(1)
        .single();

      if (metricData?.percentile_play_level) {
        percentiles.push({
          name: metric.displayName,
          percentile: Math.round(metricData.percentile_play_level)
        });
      }
    }

    // Find best and worst
    if (percentiles.length > 0) {
      const sorted = percentiles.sort((a, b) => b.percentile - a.percentile);
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];

      setForceProfile({
        composite_score: Math.round(composite.percentile_play_level || 0),
        percentile_rank: Math.round(composite.percentile_play_level || 0),
        best_metric: best,
        worst_metric: worst
      });
    }
  }

  function getDaysInMonth(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }

  function getWorkoutsForDate(date: Date): WorkoutInstance[] {
    const dateStr = date.toISOString().split('T')[0];
    return workoutInstances.filter(w => w.scheduled_date === dateStr);
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  function getWeekDates(centerDate: Date): Date[] {
    const dates: Date[] = [];
    const dayOfWeek = centerDate.getDay();
    const sunday = new Date(centerDate);
    sunday.setDate(centerDate.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      dates.push(date);
    }

    return dates;
  }

  function handleDayClick(date: Date) {
    setIsTransitioning(true);
    setSelectedDate(date);
    // Delay view mode change to allow slide animation
    setTimeout(() => {
      setViewMode('day');
      setIsTransitioning(false);
    }, 300);
  }

  function handleBackToMonth() {
    setIsTransitioning(true);
    setTimeout(() => {
      setViewMode('month');
      setSelectedDate(null);
      setIsTransitioning(false);
    }, 200);
  }

  function handlePrevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  }

  function handleNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  }

  function handlePrevWeek() {
    if (!selectedDate) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 7);
    setSelectedDate(newDate);
  }

  function handleNextWeek() {
    if (!selectedDate) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 7);
    setSelectedDate(newDate);
  }

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentDate);
  const weekDates = selectedDate ? getWeekDates(selectedDate) : [];
  const selectedDateWorkouts = selectedDate ? getWorkoutsForDate(selectedDate) : [];

  const greeting = getGreeting();
  const firstName = fullName.split(' ')[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col overflow-hidden relative">
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.4s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.5s ease-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Welcome Header - Always visible */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A] to-transparent p-4 pb-8 animate-fadeIn">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                {greeting}, {firstName}
              </h1>
              <p className="text-gray-400 text-sm">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/sign-in';
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              title="Sign out"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Force Profile Snapshot - Slides down when day view opens */}
      <div
        className={`transition-all duration-500 ease-in-out border-b overflow-hidden ${
          viewMode === 'day'
            ? 'h-0 opacity-0 pointer-events-none border-transparent'
            : 'h-[45vh] opacity-100 translate-y-0 pt-[5.25rem] border-white/10'
        }`}
      >
        <div className="h-full px-4 pb-4 pt-1 overflow-y-auto max-w-4xl mx-auto">
          {valdProfileId && forceProfile ? (
            <div className="relative bg-black rounded-3xl p-6 h-full flex flex-col" style={{
              boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)',
            }}>
              {/* Glossy shine overlay */}
              <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)',
              }} />

              <h2 className="text-2xl font-bold text-white mb-6 relative z-10">Force Profile</h2>

              {/* Main Content - Circle Left, Metrics Right */}
              <div className="flex-1 flex items-center gap-6">
                {/* LEFT: Composite Score Circle - 3D with Gradients & Depth */}
                <div className="flex-shrink-0 relative">
                  <svg className="transform -rotate-90" width="176" height="176" viewBox="0 0 176 176" style={{ display: 'block' }}>
                      {/* Background circle - clean track */}
                      <circle
                        cx="88"
                        cy="88"
                        r="75"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="12"
                        fill="none"
                      />

                      {/* Progress circle - gradient emerging from black around the circle */}
                      <defs>
                        <linearGradient id={`gradient-${forceProfile.percentile_rank >= 75 ? 'green' : forceProfile.percentile_rank >= 50 ? 'blue' : forceProfile.percentile_rank >= 25 ? 'yellow' : 'red'}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          {forceProfile.percentile_rank >= 75 ? (
                            <>
                              <stop offset="0%" stopColor="#000000" />
                              <stop offset="30%" stopColor="#10b981" />
                              <stop offset="60%" stopColor="#34d399" />
                              <stop offset="100%" stopColor="#6ee7b7" />
                            </>
                          ) : forceProfile.percentile_rank >= 50 ? (
                            <>
                              <stop offset="0%" stopColor="#000000" />
                              <stop offset="30%" stopColor="#7BC5F0" />
                              <stop offset="60%" stopColor="#9BDDFF" />
                              <stop offset="100%" stopColor="#B0E5FF" />
                            </>
                          ) : forceProfile.percentile_rank >= 25 ? (
                            <>
                              <stop offset="0%" stopColor="#000000" />
                              <stop offset="30%" stopColor="#f59e0b" />
                              <stop offset="60%" stopColor="#fbbf24" />
                              <stop offset="100%" stopColor="#fcd34d" />
                            </>
                          ) : (
                            <>
                              <stop offset="0%" stopColor="#000000" />
                              <stop offset="30%" stopColor="#dc2626" />
                              <stop offset="60%" stopColor="#ef4444" />
                              <stop offset="100%" stopColor="#f87171" />
                            </>
                          )}
                        </linearGradient>

                        {/* Glossy shine overlay */}
                        <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                          <stop offset="30%" stopColor="rgba(255,255,255,0.2)" />
                          <stop offset="60%" stopColor="rgba(255,255,255,0)" />
                          <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
                        </linearGradient>
                      </defs>

                      <circle
                        cx="88"
                        cy="88"
                        r="75"
                        stroke={`url(#gradient-${forceProfile.percentile_rank >= 75 ? 'green' : forceProfile.percentile_rank >= 50 ? 'blue' : forceProfile.percentile_rank >= 25 ? 'yellow' : 'red'})`}
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 75}`}
                        strokeDashoffset={`${2 * Math.PI * 75 * (1 - forceProfile.percentile_rank / 100)}`}
                        className="transition-all duration-1000"
                        style={{
                          filter: `drop-shadow(0 0 16px ${
                            forceProfile.percentile_rank >= 75 ? 'rgba(16,185,129,0.7)' :
                            forceProfile.percentile_rank >= 50 ? 'rgba(155,221,255,0.7)' :
                            forceProfile.percentile_rank >= 25 ? 'rgba(251,191,36,0.7)' :
                            'rgba(239,68,68,0.7)'
                          })`,
                        }}
                      />

                      {/* Glossy shine overlay on progress */}
                      <circle
                        cx="88"
                        cy="88"
                        r="75"
                        stroke="url(#shine)"
                        strokeWidth="10"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 75}`}
                        strokeDashoffset={`${2 * Math.PI * 75 * (1 - forceProfile.percentile_rank / 100)}`}
                        className="transition-all duration-1000"
                      />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className={`text-5xl font-bold ${
                      forceProfile.percentile_rank >= 75 ? 'text-green-400' :
                      forceProfile.percentile_rank >= 50 ? 'text-[#9BDDFF]' :
                      forceProfile.percentile_rank >= 25 ? 'text-yellow-400' :
                      'text-red-400'
                    }`} style={{
                      textShadow: `0 0 20px ${
                        forceProfile.percentile_rank >= 75 ? 'rgba(16,185,129,0.8)' :
                        forceProfile.percentile_rank >= 50 ? 'rgba(155,221,255,0.8)' :
                        forceProfile.percentile_rank >= 25 ? 'rgba(251,191,36,0.8)' :
                        'rgba(239,68,68,0.8)'
                      }, 0 2px 4px rgba(0,0,0,0.8)`,
                    }}>{forceProfile.percentile_rank}</div>
                    <div className="text-xs text-gray-200 uppercase tracking-widest font-bold mt-1" style={{
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    }}>
                      {forceProfile.percentile_rank >= 75 ? 'ELITE' :
                       forceProfile.percentile_rank >= 50 ? 'OPTIMIZE' :
                       forceProfile.percentile_rank >= 25 ? 'SHARPEN' :
                       'BUILD'}
                    </div>
                  </div>
                </div>

                {/* RIGHT: Best & Worst Metrics - 3D Sliders */}
                <div className="flex-1 flex flex-col justify-center gap-6">
                  {/* Best Metric */}
                  {forceProfile.best_metric && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Strongest</span>
                        <span className="text-lg font-bold bg-gradient-to-br from-green-300 to-green-500 bg-clip-text text-transparent">{forceProfile.best_metric.percentile}th</span>
                      </div>
                      <div className="relative h-4 bg-black/40 rounded-full overflow-visible shadow-inner">
                        {/* Inner shadow for depth */}
                        <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]" />

                        {/* Progress bar emerging from black */}
                        <div
                          className="h-full rounded-full relative transition-all duration-1000"
                          style={{
                            width: `${forceProfile.best_metric.percentile}%`,
                            background: 'linear-gradient(90deg, #000000 0%, #10b981 40%, #34d399 70%, #6ee7b7 100%)',
                            boxShadow: '0 0 12px rgba(16, 185, 129, 0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
                          }}
                        >
                          {/* Glossy shine overlay */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 via-transparent to-black/20" />
                        </div>
                      </div>
                      <p className="text-sm text-white mt-1.5 font-medium">{forceProfile.best_metric.name}</p>
                    </div>
                  )}

                  {/* Worst Metric */}
                  {forceProfile.worst_metric && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Focus Area</span>
                        <span className="text-lg font-bold bg-gradient-to-br from-red-300 to-red-500 bg-clip-text text-transparent">{forceProfile.worst_metric.percentile}th</span>
                      </div>
                      <div className="relative h-4 bg-black/40 rounded-full overflow-visible shadow-inner">
                        {/* Inner shadow for depth */}
                        <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]" />

                        {/* Progress bar emerging from black */}
                        <div
                          className="h-full rounded-full relative transition-all duration-1000"
                          style={{
                            width: `${forceProfile.worst_metric.percentile}%`,
                            background: 'linear-gradient(90deg, #000000 0%, #dc2626 40%, #ef4444 70%, #f87171 100%)',
                            boxShadow: '0 0 12px rgba(239, 68, 68, 0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
                          }}
                        >
                          {/* Glossy shine overlay */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 via-transparent to-black/20" />
                        </div>
                      </div>
                      <p className="text-sm text-white mt-1.5 font-medium">{forceProfile.worst_metric.name}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">⚡</div>
                <h3 className="text-xl font-bold text-white mb-2">No Force Profile Data</h3>
                <p className="text-gray-400 text-sm">Your force plate data will appear here once synced.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calendar - Expands to fullscreen in day view */}
      <div
        className={`transition-all duration-500 ease-in-out ${
          viewMode === 'day'
            ? 'absolute inset-0 pt-[5.25rem]'
            : 'flex-1'
        }`}
      >
        {viewMode === 'month' ? (
          <div className="h-full flex flex-col animate-slideIn">
            {/* Month Header */}
            <div className="px-4 py-2 border-b border-white/10">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-xl font-bold text-white">{monthName}</h2>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-2">
                  {days.map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const dayWorkouts = getWorkoutsForDate(date);
                    const today = isToday(date);

                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => handleDayClick(date)}
                        className={`aspect-square rounded-xl border transition-all ${
                          today
                            ? 'border-[#9BDDFF] bg-[#9BDDFF]/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="h-full flex flex-col items-center justify-center p-2">
                          <div className={`text-sm font-medium mb-1 ${today ? 'text-[#9BDDFF]' : 'text-white'}`}>
                            {date.getDate()}
                          </div>
                          {dayWorkouts.length > 0 && (
                            <div className="flex gap-1 flex-wrap justify-center">
                              {dayWorkouts.map((workout, i) => {
                                const category = workout.workouts?.category || 'strength_conditioning';
                                return (
                                  <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[category].dot}`}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Color Key */}
                <div className="mt-6 flex flex-wrap gap-4 justify-center">
                  {Object.entries(CATEGORY_COLORS).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${value.dot}`} />
                      <span className="text-sm text-gray-400">{value.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col animate-slideUp">
            {/* Back Button - Compact */}
            <div className="border-b border-white/10 px-4 py-2 mt-0.5 relative z-30">
              <div className="max-w-4xl mx-auto">
                <button
                  onClick={handleBackToMonth}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-all hover:gap-3 group relative z-30"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm font-medium">Back</span>
                </button>
              </div>
            </div>

            {/* Week Scroller */}
            <div className="border-b border-white/10 p-3">
              <div className="flex items-center justify-between max-w-4xl mx-auto mb-2">
                <button
                  onClick={handlePrevWeek}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-xl font-bold text-white">
                  {selectedDate?.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={handleNextWeek}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-1.5 max-w-4xl mx-auto overflow-x-auto scrollbar-hide">
                {weekDates.map(date => {
                  const isSelected = selectedDate &&
                    date.getDate() === selectedDate.getDate() &&
                    date.getMonth() === selectedDate.getMonth() &&
                    date.getFullYear() === selectedDate.getFullYear();
                  const today = isToday(date);

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`flex-1 min-w-[50px] p-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-[#9BDDFF] bg-[#9BDDFF]/10'
                          : today
                          ? 'border-[#9BDDFF]/50 bg-white/5'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-xs text-gray-400 mb-0.5">
                        {date.toLocaleString('default', { weekday: 'short' })}
                      </div>
                      <div className={`text-base font-bold ${
                        isSelected ? 'text-[#9BDDFF]' : today ? 'text-[#9BDDFF]' : 'text-white'
                      }`}>
                        {date.getDate()}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workout List */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="max-w-4xl mx-auto space-y-2">
                {selectedDateWorkouts.length === 0 ? (
                  <div className="text-center py-12 animate-fadeIn">
                    <div className="text-6xl mb-3">🏖️</div>
                    <h3 className="text-xl font-bold text-white mb-1">Rest Day</h3>
                    <p className="text-sm text-gray-400">No workouts scheduled</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-2">
                      <h2 className="text-lg font-bold text-white">
                        {selectedDateWorkouts.length} {selectedDateWorkouts.length === 1 ? 'Workout' : 'Workouts'}
                      </h2>
                      <p className="text-xs text-gray-400">
                        {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    {selectedDateWorkouts.map((instance, index) => {
                      const category = instance.workouts?.category || 'strength_conditioning';
                      const categoryInfo = CATEGORY_COLORS[category];
                      const isCompleted = instance.status === 'completed';

                      return (
                        <div
                          key={instance.id}
                          className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 hover:bg-white/10 hover:border-[#9BDDFF]/30 transition-all hover:shadow-lg hover:shadow-[#9BDDFF]/10 animate-slideIn"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${categoryInfo.badge}`}>
                                  {categoryInfo.label}
                                </span>
                                {isCompleted && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base font-bold text-white mb-1 group-hover:text-[#9BDDFF] transition-colors truncate">
                                {instance.workouts?.name || 'Workout'}
                              </h3>
                              {instance.workouts?.estimated_duration_minutes && (
                                <p className="text-xs text-gray-400">
                                  {instance.workouts.estimated_duration_minutes} min
                                </p>
                              )}
                            </div>
                            <Link
                              href={`/dashboard/athletes/${athleteId}/workouts/${instance.id}/execute`}
                              className="px-4 py-2 bg-gradient-to-r from-[#9BDDFF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#9BDDFF] text-black rounded-lg font-bold text-sm transition-all hover:shadow-lg hover:shadow-[#9BDDFF]/30 whitespace-nowrap"
                            >
                              {isCompleted ? 'View' : 'Start'}
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
