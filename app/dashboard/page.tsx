'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadDashboardData() {
      const supabase = createClient();

      console.log('=== DASHBOARD DATA LOADING ===');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('User error:', userError);
        router.push('/sign-in');
        return;
      }

      console.log('Authenticated user:', user.id, user.email);

      // Get user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('first_name, app_role')
        .eq('id', user.id)
        .single();

      // Get today's date for queries
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startDateStr = startOfWeek.toISOString().split('T')[0];

      console.log('Date filters - Today:', today, 'Week start:', startDateStr);

      // Query 1: Total active athletes
      const { data: athletesData, error: athletesError, count: totalAthletes } = await supabase
        .from('athletes')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      console.log('1. ATHLETES:', { count: totalAthletes, data: athletesData, error: athletesError });

      // Query 2: Today's workouts (simple query first)
      const { data: todayWorkoutsRaw, error: todayError, count: todayCount } = await supabase
        .from('workout_instances')
        .select('*', { count: 'exact' })
        .eq('scheduled_date', today);

      console.log('2. TODAY WORKOUTS (raw):', { count: todayCount, data: todayWorkoutsRaw, error: todayError });

      // Query 2b: Get athlete profiles and workout details for today's workouts
      let todayWorkoutsWithDetails: any[] = [];

      if (todayWorkoutsRaw && todayWorkoutsRaw.length > 0) {
        const athleteIds = [...new Set(todayWorkoutsRaw.map((w: any) => w.athlete_id))];
        const workoutIds = [...new Set(todayWorkoutsRaw.map((w: any) => w.workout_id).filter(Boolean))];

        // Fetch athletes (with user_id)
        const { data: athletesForWorkouts } = await supabase
          .from('athletes')
          .select('id, user_id')
          .in('id', athleteIds);

        console.log('2b. Athletes fetched:', athletesForWorkouts);

        // Get user_ids from athletes to fetch profiles
        const userIds = athletesForWorkouts?.filter(a => a.user_id).map(a => a.user_id) || [];
        let profilesData: any[] = [];

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', userIds);

          profilesData = profiles || [];
          console.log('2c. Profiles fetched:', profilesData);
        }

        // Try to fetch workouts - use .single() or direct fetch to avoid RLS issues
        let workoutsData: any[] = [];
        if (workoutIds.length > 0) {
          console.log('2d. Fetching workouts with IDs:', workoutIds);

          // Fetch each workout individually to avoid RLS bulk query issues
          const workoutPromises = workoutIds.map(async (id) => {
            const { data, error } = await supabase
              .from('workouts')
              .select('id, name')
              .eq('id', id)
              .maybeSingle();

            if (error) {
              console.warn('Error fetching workout:', id, error);
              return null;
            }
            return data;
          });

          const results = await Promise.all(workoutPromises);
          workoutsData = results.filter(Boolean);
          console.log('2e. Workouts fetched:', workoutsData);
        }

        // Merge data: workout_instance → athlete → profile
        todayWorkoutsWithDetails = todayWorkoutsRaw.map((instance: any) => {
          const athlete = athletesForWorkouts?.find((a: any) => a.id === instance.athlete_id);
          const profile = athlete?.user_id ? profilesData.find((p: any) => p.id === athlete.user_id) : null;
          const workout = workoutsData.find((w: any) => w?.id === instance.workout_id);

          return {
            ...instance,
            athlete: profile ? {
              first_name: profile.first_name,
              last_name: profile.last_name,
            } : null,
            workout: workout || null,
          };
        });

        console.log('2f. TODAY WORKOUTS WITH DETAILS:', todayWorkoutsWithDetails);
      }

      // Query 3: Completed this week
      const { data: completedData, error: completedError, count: completedCount } = await supabase
        .from('workout_instances')
        .select('*', { count: 'exact' })
        .eq('status', 'completed')
        .gte('scheduled_date', startDateStr);

      console.log('3. COMPLETED THIS WEEK:', { count: completedCount, data: completedData, error: completedError });

      // Query 4: Total workouts this week (for completion rate)
      const { data: weekWorkoutsData, error: weekError, count: weekCount } = await supabase
        .from('workout_instances')
        .select('*', { count: 'exact' })
        .gte('scheduled_date', startDateStr);

      console.log('4. TOTAL WEEK WORKOUTS:', { count: weekCount, data: weekWorkoutsData, error: weekError });

      // Query 5: Active plan assignments
      const { data: planAssignmentsData, error: planAssignmentsError } = await supabase
        .from('plan_assignments')
        .select('plan_id, athlete_id')
        .eq('is_active', true);

      console.log('5. PLAN ASSIGNMENTS:', { count: planAssignmentsData?.length, data: planAssignmentsData, error: planAssignmentsError });

      // Query 6: All plans
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*');

      console.log('6. PLANS:', { count: plansData?.length, data: plansData, error: plansError });

      // Query 7: Teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('is_active', true);

      console.log('7. TEAMS:', { count: teamsData?.length, data: teamsData, error: teamsError });

      // Calculate metrics
      const totalActiveAthletes = totalAthletes || 0;
      const athletesTrainingToday = todayCount || 0;
      const workoutsCompletedWeek = completedCount || 0;
      const uniqueActivePlans = planAssignmentsData ? new Set(planAssignmentsData.map(pa => pa.plan_id)).size : 0;
      const totalAssignments = planAssignmentsData?.length || 0;
      const completionRate = weekCount && weekCount > 0
        ? Math.round((workoutsCompletedWeek / weekCount) * 100)
        : 0;

      console.log('=== CALCULATED METRICS ===');
      console.log('Total athletes:', totalActiveAthletes);
      console.log('Training today:', athletesTrainingToday);
      console.log('Completed this week:', workoutsCompletedWeek);
      console.log('Unique active plans:', uniqueActivePlans);
      console.log('Completion rate:', completionRate + '%');

      setData({
        userProfile,
        totalActiveAthletes,
        athletesTrainingToday,
        workoutsCompletedWeek,
        uniqueActivePlans,
        totalAssignments,
        completionRate,
        weekCount: weekCount || 0,
        athletes: athletesData || [],
        todayWorkouts: todayWorkoutsWithDetails,
        plans: plansData || [],
        teams: teamsData || [],
        user
      });

      setLoading(false);
    }

    loadDashboardData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white/20 border-r-white"></div>
          <p className="mt-4 text-sm text-white/50">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const {
    userProfile,
    totalActiveAthletes,
    athletesTrainingToday,
    workoutsCompletedWeek,
    uniqueActivePlans,
    totalAssignments,
    completionRate,
    weekCount,
    todayWorkouts,
    teams,
  } = data;

  const firstName = userProfile?.first_name || 'there';

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#C9A857]/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        {/* Main Content */}
        <main className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Welcome Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Welcome back, {firstName}
            </h1>
            <p className="text-white/60">Here's what's happening with your athletes today</p>
          </div>

          {/* Key Metrics */}
          <div className="mb-6 sm:mb-8 grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-5">
            {/* Total Athletes */}
            <div className="glass-card-hover shadow-premium rounded-lg p-4 sm:p-6 border-l-2 border-l-[#C9A857]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/60">Total Athletes</p>
                  <p className="mt-2 text-3xl font-bold text-white">{totalActiveAthletes}</p>
                  <p className="mt-2 text-xs text-emerald-400">Active members</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A857]/10">
                  <svg className="h-6 w-6 text-[#C9A857]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Training Today */}
            <div className="glass-card-hover shadow-premium rounded-lg p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/60">Training Today</p>
                  <p className="mt-2 text-3xl font-bold text-white">{athletesTrainingToday}</p>
                  <p className="mt-2 text-xs text-blue-400">Scheduled workouts</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Weekly Completed */}
            <div className="glass-card-hover shadow-premium rounded-lg p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/60">This Week</p>
                  <p className="mt-2 text-3xl font-bold text-white">{workoutsCompletedWeek}</p>
                  <p className="mt-2 text-xs text-emerald-400">Completed</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                  <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Plans */}
            <div className="glass-card-hover shadow-premium rounded-lg p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/60">Active Plans</p>
                  <p className="mt-2 text-3xl font-bold text-white">{totalAssignments}</p>
                  <p className="mt-2 text-xs text-purple-400">Assignments</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
                  <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Completion Rate */}
            <div className="glass-card-hover shadow-premium rounded-lg p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/60">Completion</p>
                  <p className="mt-2 text-3xl font-bold text-white">{completionRate}%</p>
                  <p className="mt-2 text-xs text-amber-400">This week</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                  <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Actions */}
              <div className="glass-card rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Link
                    href="/dashboard/athletes"
                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
                  >
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-white">Add Athlete</span>
                  </Link>

                  <button
                    onClick={() => alert('Schedule Workout - Coming in Phase 3.2')}
                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
                  >
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-white">Schedule</span>
                  </button>

                  <Link
                    href="/dashboard/plans"
                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
                  >
                    <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-white">Assign Plan</span>
                  </Link>

                  <button
                    onClick={() => alert('Log Workout - Coming in Phase 3.3')}
                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
                  >
                    <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-white">Quick Log</span>
                  </button>
                </div>
              </div>

              {/* Today's Schedule */}
              <div className="glass-card rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Today's Schedule</h2>
                  <Link
                    href="/dashboard/calendar"
                    className="text-sm text-[#C9A857] hover:text-[#D4B76A] transition-colors"
                  >
                    View Calendar →
                  </Link>
                </div>

                {todayWorkouts && todayWorkouts.length > 0 ? (
                  <div className="space-y-3">
                    {todayWorkouts.slice(0, 5).map((workout: any) => {
                      const athleteName = workout.athlete
                        ? `${workout.athlete.first_name} ${workout.athlete.last_name}`
                        : 'Unknown Athlete';
                      const workoutName = workout.workout?.name || 'Untitled Workout';
                      const category = workout.workout?.category || 'general';

                      // Category icon mapping
                      const categoryIcons: { [key: string]: string } = {
                        strength: '💪',
                        hitting: '⚾',
                        throwing: '🎯',
                        mobility: '🧘',
                        conditioning: '🏃',
                      };
                      const icon = categoryIcons[category] || '📋';

                      return (
                        <Link
                          key={workout.id}
                          href={`/dashboard/athletes/${workout.athlete_id}?tab=calendar`}
                          className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                              <span className="text-xl">{icon}</span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{workoutName}</p>
                              <p className="text-gray-400 text-sm">{athleteName}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            workout.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : workout.status === 'in_progress'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {workout.status.replace('_', ' ')}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-white/60 mb-2">No workouts scheduled for today</p>
                    <p className="text-white/40 text-sm">Schedule workouts to see them here</p>
                  </div>
                )}
              </div>

              {/* Performance Insights */}
              <div className="glass-card rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Performance Insights</h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Weekly Progress</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {workoutsCompletedWeek} of {weekCount} workouts completed this week ({completionRate}% completion rate)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Active Roster</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {totalActiveAthletes} athletes across {teams?.length || 0} teams with {totalAssignments} active program assignments
                      </p>
                    </div>
                  </div>

                  {athletesTrainingToday > 0 && (
                    <div className="flex items-start space-x-3">
                      <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">Training Focus</p>
                        <p className="text-gray-400 text-sm mt-1">
                          {athletesTrainingToday} athletes have training scheduled for today
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - 1/3 width */}
            <div className="space-y-6">
              {/* Program Overview */}
              <div className="glass-card rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Programs</h2>
                  <Link
                    href="/dashboard/plans"
                    className="text-sm text-[#C9A857] hover:text-[#D4B76A] transition-colors"
                  >
                    View All →
                  </Link>
                </div>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-purple-400 font-medium text-sm">Active Plans</span>
                      <span className="text-purple-400 text-2xl font-bold">{uniqueActivePlans}</span>
                    </div>
                    <p className="text-white/60 text-xs">{totalAssignments} total assignments</p>
                  </div>
                </div>
              </div>

              {/* Teams Overview */}
              <div className="glass-card rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Teams</h2>
                  <Link
                    href="/dashboard/teams"
                    className="text-sm text-[#C9A857] hover:text-[#D4B76A] transition-colors"
                  >
                    View All →
                  </Link>
                </div>
                {teams && teams.length > 0 ? (
                  <div className="space-y-2">
                    {teams.map((team: any) => (
                      <div
                        key={team.id}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                      >
                        <p className="text-white font-medium text-sm">{team.name}</p>
                        <p className="text-gray-400 text-xs mt-1">{team.level?.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-white/60 text-sm">No teams yet</p>
                  </div>
                )}
              </div>

              {/* Need Attention */}
              <div className="glass-card rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Need Attention</h2>
                {weekCount > 0 && completionRate < 70 ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-start space-x-3">
                        <svg className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-white font-medium text-sm">Low Completion Rate</p>
                          <p className="text-white/60 text-xs mt-1">Only {completionRate}% of workouts completed this week</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-3">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-white/60 text-sm">Everything looks good!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
