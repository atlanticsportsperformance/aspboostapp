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

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/sign-in');
        return;
      }

      // Get user profile and staff info
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, app_role')
        .eq('id', user.id)
        .single();

      // 🚨 REDIRECT ATHLETES TO THEIR OWN DASHBOARD - Keep loading TRUE so they never see coach dashboard
      if (userProfile?.app_role === 'athlete') {
        // Don't set loading to false - keep black screen during redirect
        router.push('/athlete-dashboard');
        return;
      }

      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Date calculations
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const weekFromNow = new Date(today);
      weekFromNow.setDate(today.getDate() + 7);
      const weekFromNowStr = weekFromNow.toISOString().split('T')[0];
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

      // Get athletes assigned to this coach
      let myAthleteIds: string[] = [];
      if (staffData) {
        const { data: coachAthletes } = await supabase
          .from('coach_athletes')
          .select('athlete_id')
          .eq('coach_id', user.id);
        myAthleteIds = coachAthletes?.map(ca => ca.athlete_id) || [];
      }

      // If super_admin, get ALL athletes
      if (userProfile?.app_role === 'super_admin') {
        const { data: allAthletes } = await supabase
          .from('athletes')
          .select('id')
          .eq('is_active', true);
        myAthleteIds = allAthletes?.map(a => a.id) || [];
      }

      // 🚨 Athletes with NO workouts in next 7 days
      const { data: athletesWithWorkouts } = await supabase
        .from('workout_instances')
        .select('athlete_id')
        .in('athlete_id', myAthleteIds)
        .gte('scheduled_date', todayStr)
        .lte('scheduled_date', weekFromNowStr);

      const athleteIdsWithWorkouts = [...new Set(athletesWithWorkouts?.map(w => w.athlete_id) || [])];
      const athleteIdsWithoutWorkouts = myAthleteIds.filter(id => !athleteIdsWithWorkouts.includes(id));

      const { data: athletesNeedingWorkouts } = await supabase
        .from('athletes')
        .select('id, user_id')
        .in('id', athleteIdsWithoutWorkouts);

      const userIdsForProfiles = athletesNeedingWorkouts?.filter(a => a.user_id).map(a => a.user_id!) || [];
      const { data: profilesNeedingWorkouts } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIdsForProfiles);

      const athletesNeedingWorkoutsEnriched = athletesNeedingWorkouts?.map(athlete => {
        const profile = profilesNeedingWorkouts?.find(p => p.id === athlete.user_id);
        return {
          id: athlete.id,
          name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Athlete'
        };
      }) || [];

      // 📅 TODAY'S WORKOUTS
      const { data: todayWorkoutsRaw } = await supabase
        .from('workout_instances')
        .select('*')
        .in('athlete_id', myAthleteIds)
        .eq('scheduled_date', todayStr)
        .order('created_at', { ascending: true });

      const todayWorkouts = await enrichWorkoutInstances(supabase, todayWorkoutsRaw || []);

      // TODAY'S WORKOUTS BY CATEGORY
      const todayByCategory = {
        'strength-conditioning': todayWorkouts.filter((w: any) => w.category === 'strength-conditioning').length,
        'throwing': todayWorkouts.filter((w: any) => w.category === 'throwing').length,
        'hitting': todayWorkouts.filter((w: any) => w.category === 'hitting').length,
      };

      // COMPLETED TODAY (not 7 days)
      const completedTodayWorkouts = todayWorkouts.filter((w: any) => w.status === 'completed');
      const completedTodayByCategory = {
        'strength-conditioning': completedTodayWorkouts.filter((w: any) => w.category === 'strength-conditioning').length,
        'throwing': completedTodayWorkouts.filter((w: any) => w.category === 'throwing').length,
        'hitting': completedTodayWorkouts.filter((w: any) => w.category === 'hitting').length,
      };

      // ⚠️ INCOMPLETE WORKOUTS THIS WEEK
      const { data: incompleteWorkouts } = await supabase
        .from('workout_instances')
        .select('*')
        .in('athlete_id', myAthleteIds)
        .gte('scheduled_date', startOfWeekStr)
        .lt('scheduled_date', todayStr)
        .neq('status', 'completed')
        .order('scheduled_date', { ascending: false });

      const incompleteEnriched = await enrichWorkoutInstances(supabase, incompleteWorkouts || []);

      // 🏆 RECENT PRS (last 30 days for count, last 7 days for list)
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      // Count all PRs in last 30 days from exercise_logs
      const { data: allPRsLast30Days } = await supabase
        .from('exercise_logs')
        .select(`
          *,
          workout_instance:workout_instances(athlete_id, workout:workouts(category))
        `)
        .eq('is_pr', true)
        .gte('logged_at', thirtyDaysAgoStr)
        .order('logged_at', { ascending: false });

      const myPRsLast30 = allPRsLast30Days?.filter(pr =>
        myAthleteIds.includes(pr.workout_instance?.athlete_id)
      ) || [];

      const myPRsCount = myPRsLast30.length;

      // Get recent PRs for display (last 7 days)
      const { data: recentPRs } = await supabase
        .from('exercise_logs')
        .select(`
          *,
          workout_instance:workout_instances(athlete_id, scheduled_date),
          exercise:exercises(name)
        `)
        .eq('is_pr', true)
        .gte('logged_at', sevenDaysAgoStr)
        .order('logged_at', { ascending: false })
        .limit(10);

      const myPRs = recentPRs?.filter(pr =>
        myAthleteIds.includes(pr.workout_instance?.athlete_id)
      ) || [];

      const prAthleteIds = [...new Set(myPRs.map(pr => pr.workout_instance?.athlete_id).filter(Boolean))];
      const { data: prAthletes } = await supabase
        .from('athletes')
        .select('id, user_id')
        .in('id', prAthleteIds);

      const prUserIds = prAthletes?.filter(a => a.user_id).map(a => a.user_id!) || [];
      const { data: prProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', prUserIds);

      const enrichedPRs = myPRs.map(pr => {
        const athlete = prAthletes?.find(a => a.id === pr.workout_instance?.athlete_id);
        const profile = prProfiles?.find(p => p.id === athlete?.user_id);
        return {
          ...pr,
          athleteName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
          athleteId: pr.workout_instance?.athlete_id
        };
      }).slice(0, 5);

      // 👥 ATHLETE PROGRESS GRID
      const { data: weekWorkouts } = await supabase
        .from('workout_instances')
        .select('athlete_id, status, workout_id')
        .in('athlete_id', myAthleteIds)
        .gte('scheduled_date', startOfWeekStr);

      const athleteStats = calculateAthleteStats(weekWorkouts || [], myAthleteIds);

      const { data: progressAthletes } = await supabase
        .from('athletes')
        .select('id, first_name, last_name, position, grad_year')
        .in('id', myAthleteIds);

      const athleteProgressGrid = Object.entries(athleteStats).map(([athleteId, stats]: [string, any]) => {
        const athlete = progressAthletes?.find(a => a.id === athleteId);

        let status: 'excellent' | 'on-track' | 'attention' | 'at-risk' = 'excellent';
        if (stats.completionRate >= 85) status = 'excellent';
        else if (stats.completionRate >= 70) status = 'on-track';
        else if (stats.completionRate >= 50) status = 'attention';
        else status = 'at-risk';

        return {
          id: athleteId,
          first_name: athlete?.first_name || 'Unknown',
          last_name: athlete?.last_name || '',
          position: athlete?.position,
          grad_year: athlete?.grad_year,
          status,
          ...stats
        };
      }).sort((a, b) => b.completionRate - a.completionRate);

      // 📊 WEEKLY STATS
      const totalWorkoutsThisWeek = weekWorkouts?.length || 0;
      const completedThisWeek = weekWorkouts?.filter(w => w.status === 'completed').length || 0;
      const completionRate = totalWorkoutsThisWeek > 0
        ? Math.round((completedThisWeek / totalWorkoutsThisWeek) * 100)
        : 0;

      // 📈 RECENT ACTIVITY (from set_logs)
      const { data: recentActivity } = await supabase
        .from('set_logs')
        .select('*')
        .order('logged_at', { ascending: false })
        .limit(15);

      // 🏋️ FORCE PLATE IMPROVEMENTS (last 60 days) - All test types
      const sixtyDaysAgo = new Date(today);
      sixtyDaysAgo.setDate(today.getDate() - 60);
      const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

      const { data: cmjTests } = await supabase
        .from('cmj_tests')
        .select('*')
        .in('athlete_id', myAthleteIds)
        .gte('test_date', sixtyDaysAgoStr)
        .order('test_date', { ascending: true });

      // Calculate biggest improvements (comparing most recent test to previous test for each athlete)
      const athleteImprovements: any[] = [];
      if (cmjTests && cmjTests.length > 0) {
        const athleteTestMap = new Map();
        cmjTests.forEach(test => {
          const key = `${test.athlete_id}-${test.test_type || 'cmj'}`;
          if (!athleteTestMap.has(key)) {
            athleteTestMap.set(key, []);
          }
          athleteTestMap.get(key).push(test);
        });

        for (const [key, tests] of athleteTestMap.entries()) {
          if (tests.length >= 2) {
            const sortedTests = tests.sort((a: any, b: any) =>
              new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
            );
            const latest = sortedTests[0];
            const previous = sortedTests[1];

            if (latest.jump_height_cm && previous.jump_height_cm) {
              const improvement = latest.jump_height_cm - previous.jump_height_cm;
              if (improvement > 0) {
                athleteImprovements.push({
                  athlete_id: latest.athlete_id,
                  test_type: latest.test_type || 'CMJ',
                  improvement: improvement,
                  latest_height: latest.jump_height_cm,
                  previous_height: previous.jump_height_cm,
                  latest_date: latest.test_date,
                  previous_date: previous.test_date,
                });
              }
            }
          }
        }
      }

      // Sort by improvement and get top 1 for display
      const topImprovements = athleteImprovements
        .sort((a, b) => b.improvement - a.improvement)
        .slice(0, 1);

      // Enrich with athlete names
      if (topImprovements.length > 0) {
        const improvementAthleteIds = topImprovements.map(i => i.athlete_id);
        const { data: improvementAthletes } = await supabase
          .from('athletes')
          .select('id, first_name, last_name')
          .in('id', improvementAthleteIds);

        topImprovements.forEach(imp => {
          const athlete = improvementAthletes?.find(a => a.id === imp.athlete_id);
          imp.athleteName = athlete ? `${athlete.first_name} ${athlete.last_name}` : 'Unknown';
        });
      }

      // Categorize PRs by workout category (after athleteImprovements is calculated)
      const prsByCategory = {
        'strength-conditioning': myPRsLast30.filter(pr => pr.workout_instance?.workout?.category === 'strength-conditioning').length,
        'throwing': myPRsLast30.filter(pr => pr.workout_instance?.workout?.category === 'throwing').length,
        'hitting': myPRsLast30.filter(pr => pr.workout_instance?.workout?.category === 'hitting').length,
        'force-plate': athleteImprovements.length,
      };

      // 🔥 ACTIVE STREAKS - Athletes with consecutive days of completed workouts
      const { data: allCompletedWorkouts } = await supabase
        .from('workout_instances')
        .select('athlete_id, scheduled_date, status')
        .in('athlete_id', myAthleteIds)
        .eq('status', 'completed')
        .gte('scheduled_date', startOfWeekStr)
        .order('scheduled_date', { ascending: false });

      // Calculate streaks
      const athleteStreaks: any[] = [];
      const athleteWorkoutMap = new Map();

      allCompletedWorkouts?.forEach(w => {
        if (!athleteWorkoutMap.has(w.athlete_id)) {
          athleteWorkoutMap.set(w.athlete_id, []);
        }
        athleteWorkoutMap.get(w.athlete_id).push(w.scheduled_date);
      });

      for (const [athleteId, dates] of athleteWorkoutMap.entries()) {
        const uniqueDates = [...new Set(dates)].sort((a, b) =>
          new Date(b).getTime() - new Date(a).getTime()
        );

        let streak = 0;
        let currentDate = new Date(todayStr);

        for (const dateStr of uniqueDates) {
          const workoutDate = new Date(dateStr);
          const daysDiff = Math.floor((currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff === streak) {
            streak++;
            currentDate = workoutDate;
          } else {
            break;
          }
        }

        if (streak >= 2) {
          athleteStreaks.push({ athlete_id: athleteId, streak });
        }
      }

      // Sort by streak and get top 5
      const topStreaks = athleteStreaks
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 5);

      // Enrich with athlete names
      if (topStreaks.length > 0) {
        const streakAthleteIds = topStreaks.map(s => s.athlete_id);
        const { data: streakAthletes } = await supabase
          .from('athletes')
          .select('id, first_name, last_name')
          .in('id', streakAthleteIds);

        topStreaks.forEach(s => {
          const athlete = streakAthletes?.find(a => a.id === s.athlete_id);
          s.athleteName = athlete ? `${athlete.first_name} ${athlete.last_name}` : 'Unknown';
        });
      }

      setData({
        userProfile,
        athletesNeedingWorkouts: athletesNeedingWorkoutsEnriched,
        todayWorkouts,
        todayByCategory,
        completedTodayByCategory,
        completedTodayCount: completedTodayWorkouts.length,
        incompleteWorkouts: incompleteEnriched,
        recentPRs: enrichedPRs,
        myPRsCount,
        prsByCategory,
        topImprovements,
        topStreaks,
        athleteProgressGrid,
        totalWorkoutsThisWeek,
        completedThisWeek,
        completionRate,
        totalAthletes: myAthleteIds.length,
        athletesTrainingToday: todayWorkouts.length > 0 ? new Set(todayWorkouts.map((w: any) => w.athlete_id)).size : 0,
        recentActivity: recentActivity || [],
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

  if (!data) return null;

  const {
    userProfile,
    athletesNeedingWorkouts,
    todayWorkouts,
    todayByCategory,
    completedTodayByCategory,
    completedTodayCount,
    incompleteWorkouts,
    recentPRs,
    myPRsCount,
    prsByCategory,
    topImprovements,
    topStreaks,
    athleteProgressGrid,
    completionRate,
    totalAthletes,
    completedThisWeek,
    totalWorkoutsThisWeek,
    athletesTrainingToday,
    recentActivity,
  } = data;

  const firstName = userProfile?.first_name || 'Coach';
  const urgentCount = athletesNeedingWorkouts.length + incompleteWorkouts.length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-20 md:pb-8">
      <div className="fixed inset-0 bg-gradient-to-br from-[#9BDDFF]/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        <main className="mx-auto max-w-[1800px] px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm sm:text-base text-white/60">
              {urgentCount > 0
                ? `${urgentCount} item${urgentCount > 1 ? 's' : ''} need your attention`
                : "Here's what's happening with your athletes"}
            </p>
          </div>

          {/* Key Metrics - 5 Column Grid */}
          <div className="mb-4 sm:mb-6 lg:mb-8 grid gap-2 sm:gap-3 lg:gap-6 grid-cols-2 lg:grid-cols-5">
            {/* Total Athletes */}
            <div className="glass-card-hover shadow-premium rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 border-l-2 border-l-[#9BDDFF]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-white/60">Total Athletes</p>
                  <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-white">{totalAthletes}</p>
                  <p className="mt-1 sm:mt-2 text-xs text-emerald-400">Active members</p>
                </div>
                <div className="hidden sm:flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-[#9BDDFF]/10">
                  <svg className="h-5 w-5 lg:h-6 lg:w-6 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Training Today - Dynamic by Category */}
            <div className="glass-card-hover shadow-premium rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-white/60">Training Today</p>
                  <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-white">{athletesTrainingToday}</p>
                  <div className="mt-1 sm:mt-2 flex flex-wrap items-center gap-1.5">
                    {todayByCategory['strength-conditioning'] > 0 && (
                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-medium rounded">
                        S&C: {todayByCategory['strength-conditioning']}
                      </span>
                    )}
                    {todayByCategory['throwing'] > 0 && (
                      <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 text-[10px] font-medium rounded">
                        Throwing: {todayByCategory['throwing']}
                      </span>
                    )}
                    {todayByCategory['hitting'] > 0 && (
                      <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-medium rounded">
                        Hitting: {todayByCategory['hitting']}
                      </span>
                    )}
                    {todayWorkouts.length === 0 && (
                      <span className="text-xs text-gray-400">No workouts</span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-blue-500/10">
                  <svg className="h-5 w-5 lg:h-6 lg:w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Completed Today - Dynamic by Category */}
            <div className="glass-card-hover shadow-premium rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-white/60">Completed Today</p>
                  <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-white">{completedTodayCount}</p>
                  <div className="mt-1 sm:mt-2 flex flex-wrap items-center gap-1.5">
                    {completedTodayByCategory['strength-conditioning'] > 0 && (
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium rounded">
                        S&C: {completedTodayByCategory['strength-conditioning']}
                      </span>
                    )}
                    {completedTodayByCategory['throwing'] > 0 && (
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium rounded">
                        Throw: {completedTodayByCategory['throwing']}
                      </span>
                    )}
                    {completedTodayByCategory['hitting'] > 0 && (
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium rounded">
                        Hit: {completedTodayByCategory['hitting']}
                      </span>
                    )}
                    {completedTodayCount === 0 && (
                      <span className="text-xs text-gray-400">None yet</span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                  <svg className="h-5 w-5 lg:h-6 lg:w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* This Week Total Scheduled */}
            <div className="glass-card-hover shadow-premium rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-white/60">This Week</p>
                  <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-white">{totalWorkoutsThisWeek}</p>
                  <p className="mt-1 sm:mt-2 text-xs text-purple-400">Total scheduled</p>
                </div>
                <div className="hidden sm:flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-purple-500/10">
                  <svg className="h-5 w-5 lg:h-6 lg:w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Completion Percent */}
            <div className="glass-card-hover shadow-premium rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 border-r-2 border-r-emerald-400">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-white/60">Completion Rate</p>
                  <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-white">{completionRate}%</p>
                  <p className="mt-1 sm:mt-2 text-xs text-emerald-400">This week</p>
                </div>
                <div className="hidden sm:flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                  <svg className="h-5 w-5 lg:h-6 lg:w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Highlights - Second Row */}
          <div className="mb-4 sm:mb-6 lg:mb-8 grid gap-2 sm:gap-3 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* PRs Last 30 Days */}
            <div className="glass-card-hover shadow-premium rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6 border-l-4 border-l-yellow-400">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-500/20 rounded-xl">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-white/60">PRs Last 30 Days</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{myPRsCount + prsByCategory['force-plate']}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {prsByCategory['strength-conditioning'] > 0 && (
                  <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 text-[10px] font-medium rounded">
                    S&C: {prsByCategory['strength-conditioning']}
                  </span>
                )}
                {prsByCategory['throwing'] > 0 && (
                  <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 text-[10px] font-medium rounded">
                    Throw: {prsByCategory['throwing']}
                  </span>
                )}
                {prsByCategory['hitting'] > 0 && (
                  <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 text-[10px] font-medium rounded">
                    Hit: {prsByCategory['hitting']}
                  </span>
                )}
                {prsByCategory['force-plate'] > 0 && (
                  <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 text-[10px] font-medium rounded">
                    Jump: {prsByCategory['force-plate']}
                  </span>
                )}
                {myPRsCount === 0 && prsByCategory['force-plate'] === 0 && (
                  <span className="text-xs text-gray-400">No PRs yet</span>
                )}
              </div>
            </div>

            {/* Force Plate Improvements */}
            <div className="glass-card-hover shadow-premium rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6 border-l-4 border-l-cyan-400">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-cyan-500/20 rounded-xl">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-white/60">Top Jump Gain (60d)</p>
                  {topImprovements.length > 0 ? (
                    <>
                      <p className="text-xl sm:text-2xl font-bold text-white">+{topImprovements[0].improvement.toFixed(1)}cm</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-cyan-400 truncate">{topImprovements[0].athleteName}</p>
                        <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] font-medium rounded uppercase">
                          {topImprovements[0].test_type}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 mt-1">No data yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="glass-card-hover shadow-premium rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6 border-l-4 border-l-blue-400">
              <div className="mb-3">
                <p className="text-xs sm:text-sm font-medium text-white/60 mb-2">Top Performers</p>
                {athleteProgressGrid.slice(0, 3).length > 0 ? (
                  <div className="space-y-1.5">
                    {athleteProgressGrid.slice(0, 3).map((athlete: any, idx: number) => (
                      <Link
                        key={athlete.id}
                        href={`/dashboard/athletes/${athlete.id}`}
                        className="flex items-center gap-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span className="text-xs font-bold text-blue-400 w-4">{idx + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {athlete.first_name} {athlete.last_name}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-400">{athlete.completionRate}%</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No data yet</p>
                )}
              </div>
            </div>

            {/* Active Streaks */}
            <div className="glass-card-hover shadow-premium rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6 border-l-4 border-l-orange-400">
              <div className="mb-3">
                <p className="text-xs sm:text-sm font-medium text-white/60 mb-2">Active Streaks</p>
                {topStreaks.length > 0 ? (
                  <div className="space-y-1.5">
                    {topStreaks.slice(0, 3).map((streak: any) => (
                      <Link
                        key={streak.athlete_id}
                        href={`/dashboard/athletes/${streak.athlete_id}`}
                        className="flex items-center gap-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span className="text-base">🔥</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {streak.athleteName}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-orange-400">{streak.streak} days</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No streaks yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Main Grid - 2/3 + 1/3 Layout */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            {/* Left Column - 2/3 */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* 🚨 NEEDS ATTENTION */}
              {urgentCount > 0 && (
                <div className="glass-card shadow-premium rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6 border-l-4 border-l-red-500">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
                        <svg className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h2 className="text-base sm:text-lg font-semibold text-white">Needs Attention</h2>
                    </div>
                    <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                      {urgentCount} items
                    </span>
                  </div>

                  <div className="space-y-2">
                    {athletesNeedingWorkouts.length > 0 && (
                      <div className="bg-black/20 rounded-xl p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-red-300">No Workouts Scheduled</span>
                          <span className="px-2 py-0.5 bg-red-500/30 text-red-200 rounded-full text-xs font-bold">
                            {athletesNeedingWorkouts.length}
                          </span>
                        </div>
                        <p className="text-xs text-white/60 mb-3">These athletes have nothing scheduled in the next 7 days</p>
                        <div className="space-y-1.5">
                          {athletesNeedingWorkouts.slice(0, 5).map((athlete: any) => (
                            <Link
                              key={athlete.id}
                              href={`/dashboard/athletes/${athlete.id}`}
                              className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-red-300">
                                    {athlete.name.split(' ').map((n: string) => n[0]).join('')}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-white truncate">{athlete.name}</span>
                              </div>
                              <svg className="w-4 h-4 text-white/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {incompleteWorkouts.length > 0 && (
                      <div className="bg-black/20 rounded-xl p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-amber-300">Missed Workouts</span>
                          <span className="px-2 py-0.5 bg-amber-500/30 text-amber-200 rounded-full text-xs font-bold">
                            {incompleteWorkouts.length}
                          </span>
                        </div>
                        <p className="text-xs text-white/60 mb-3">Workouts that weren't completed this week</p>
                        <div className="space-y-1.5">
                          {incompleteWorkouts.slice(0, 5).map((workout: any) => (
                            <div key={workout.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-white truncate">{workout.athleteName}</p>
                                <p className="text-xs text-white/50 truncate">{workout.workoutName} • {workout.scheduled_date}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 🏆 RECENT PRS */}
              {recentPRs.length > 0 && (
                <div className="glass-card shadow-premium rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6 border-l-4 border-l-emerald-400">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-emerald-500/20 rounded-xl">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white">Recent PRs</h2>
                      <p className="text-xs text-emerald-300/70">Last 7 days - Shoutout these athletes!</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {recentPRs.map((pr: any) => (
                      <Link
                        key={pr.id}
                        href={`/dashboard/athletes/${pr.athleteId}`}
                        className="flex items-start gap-3 p-3 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl transition-all border border-emerald-500/10"
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-emerald-300">
                            {pr.athleteName.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white">{pr.athleteName}</p>
                          <p className="text-xs text-emerald-300 truncate">{pr.exercise?.name}</p>
                          <p className="text-xs text-white/50 mt-0.5">{pr.weight_lbs}lbs • {pr.reps} reps</p>
                        </div>
                        <div className="flex items-center justify-center px-2 py-1 bg-emerald-500/20 rounded-lg flex-shrink-0">
                          <span className="text-xs font-bold text-emerald-300">PR</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* ATHLETE OVERVIEW TABLE */}
              <div className="glass-card shadow-premium rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6">
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-base sm:text-lg font-semibold text-white mb-1">Athletes</h2>
                  <p className="text-xs sm:text-sm text-white/60">Weekly completion rates</p>
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.08]">
                        <th className="pb-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Athlete</th>
                        <th className="pb-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Position</th>
                        <th className="pb-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Completion</th>
                        <th className="pb-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Status</th>
                        <th className="pb-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {athleteProgressGrid.slice(0, 10).map((athlete: any) => (
                        <tr key={athlete.id} className="group hover:bg-white/[0.02] transition-smooth">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05] font-semibold text-white text-sm">
                                {athlete.first_name[0]}{athlete.last_name[0]}
                              </div>
                              <div>
                                <p className="font-medium text-white text-sm">{athlete.first_name} {athlete.last_name}</p>
                                <p className="text-xs text-white/50">Class of {athlete.grad_year || 'N/A'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                              {athlete.position || 'N/A'}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 rounded-full bg-white/[0.08] overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    athlete.completionRate >= 85 ? 'bg-emerald-400' :
                                    athlete.completionRate >= 70 ? 'bg-blue-400' :
                                    athlete.completionRate >= 50 ? 'bg-yellow-400' :
                                    'bg-red-400'
                                  }`}
                                  style={{ width: `${athlete.completionRate}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-white">{athlete.completionRate}%</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              athlete.status === 'excellent' ? 'bg-emerald-500/10 text-emerald-400' :
                              athlete.status === 'on-track' ? 'bg-blue-500/10 text-blue-400' :
                              athlete.status === 'attention' ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {athlete.status === 'excellent' ? 'Excellent' :
                               athlete.status === 'on-track' ? 'On Track' :
                               athlete.status === 'attention' ? 'Needs Attention' :
                               'At Risk'}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <Link
                              href={`/dashboard/athletes/${athlete.id}`}
                              className="opacity-0 group-hover:opacity-100 rounded-lg bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.08] transition-all inline-block"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-2">
                  {athleteProgressGrid.slice(0, 10).map((athlete: any) => (
                    <Link
                      key={athlete.id}
                      href={`/dashboard/athletes/${athlete.id}`}
                      className="block glass-card-hover rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] font-semibold text-white text-sm">
                          {athlete.first_name[0]}{athlete.last_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm">{athlete.first_name} {athlete.last_name}</p>
                          <p className="text-xs text-white/50">Class of {athlete.grad_year || 'N/A'}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                              {athlete.position || 'N/A'}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              athlete.status === 'excellent' ? 'bg-emerald-500/10 text-emerald-400' :
                              athlete.status === 'on-track' ? 'bg-blue-500/10 text-blue-400' :
                              athlete.status === 'attention' ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {athlete.status === 'excellent' ? 'Excellent' :
                               athlete.status === 'on-track' ? 'On Track' :
                               athlete.status === 'attention' ? 'Attention' :
                               'At Risk'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-white/50">Completion Rate</p>
                          <p className="text-sm font-medium text-white">{athlete.completionRate}%</p>
                        </div>
                        <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              athlete.completionRate >= 85 ? 'bg-emerald-400' :
                              athlete.completionRate >= 70 ? 'bg-blue-400' :
                              athlete.completionRate >= 50 ? 'bg-yellow-400' :
                              'bg-red-400'
                            }`}
                            style={{ width: `${athlete.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - 1/3 */}
            <div className="space-y-4 sm:space-y-6">
              {/* TODAY'S SCHEDULE */}
              <div className="glass-card shadow-premium rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-semibold text-white">Today's Schedule</h2>
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                    {todayWorkouts.length} workouts
                  </span>
                </div>

                {todayWorkouts.length > 0 ? (
                  <div className="space-y-2">
                    {todayWorkouts.slice(0, 8).map((workout: any) => (
                      <Link
                        key={workout.id}
                        href={`/dashboard/athletes/${workout.athlete_id}?tab=calendar`}
                        className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3 border border-white/[0.05] hover:border-white/[0.08] transition-smooth"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`h-2 w-2 rounded-full ${
                            workout.status === 'completed' ? 'bg-emerald-400' :
                            workout.status === 'in_progress' ? 'bg-blue-400' :
                            'bg-white/30'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{workout.athleteName}</p>
                            <p className="text-xs text-white/50 truncate">{workout.workoutName}</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium flex-shrink-0 ${
                          workout.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                          workout.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-white/[0.05] text-white/60'
                        }`}>
                          {workout.status || 'pending'}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="rounded-full bg-white/[0.03] p-4">
                      <svg className="h-8 w-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="mt-4 text-sm font-medium text-white/60">No workouts scheduled</p>
                  </div>
                )}
              </div>

              {/* RECENT ACTIVITY */}
              <div className="glass-card shadow-premium rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-semibold text-white">Recent Activity</h2>
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>

                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 10).map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3 pb-3 border-b border-white/[0.05] last:border-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#9BDDFF]/10">
                          <svg className="h-4 w-4 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">Set logged</p>
                          <p className="text-xs text-white/50 truncate">{log.weight}lb × {log.reps}</p>
                          <p className="mt-1 text-xs text-white/30">
                            {new Date(log.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-white/50">No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Bottom Nav */}
          <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/10 p-3 md:hidden z-40">
            <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
              <Link
                href="/dashboard/athletes"
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 active:bg-white/10 transition-all active:scale-95"
              >
                <svg className="w-5 h-5 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[10px] font-medium text-white/70">Add Athlete</span>
              </Link>
              <Link
                href="/dashboard/plans"
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 active:bg-white/10 transition-all active:scale-95"
              >
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-[10px] font-medium text-white/70">Assign Plan</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Helper function to enrich workout instances
async function enrichWorkoutInstances(supabase: any, instances: any[]) {
  if (!instances || instances.length === 0) return [];

  const athleteIds = [...new Set(instances.map(w => w.athlete_id))];
  const workoutIds = [...new Set(instances.map(w => w.workout_id).filter(Boolean))];

  const { data: athletes } = await supabase
    .from('athletes')
    .select('id, user_id')
    .in('id', athleteIds);

  const userIds = athletes?.filter((a: any) => a.user_id).map((a: any) => a.user_id) || [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', userIds);

  let workouts: any[] = [];
  if (workoutIds.length > 0) {
    const workoutPromises = workoutIds.map(async (id) => {
      const { data } = await supabase
        .from('workouts')
        .select('id, name, category')
        .eq('id', id)
        .maybeSingle();
      return data;
    });
    const results = await Promise.all(workoutPromises);
    workouts = results.filter(Boolean);
  }

  return instances.map(instance => {
    const athlete = athletes?.find((a: any) => a.id === instance.athlete_id);
    const profile = profiles?.find((p: any) => p.id === athlete?.user_id);
    const workout = workouts.find((w: any) => w?.id === instance.workout_id);

    return {
      ...instance,
      athlete_id: instance.athlete_id,
      athleteName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
      workoutName: workout?.name || 'Untitled Workout',
      category: workout?.category || 'general',
    };
  });
}

// Helper function to calculate athlete stats
function calculateAthleteStats(weekWorkouts: any[], athleteIds: string[]) {
  const stats: any = {};

  athleteIds.forEach(id => {
    const athleteWorkouts = weekWorkouts.filter(w => w.athlete_id === id);
    const total = athleteWorkouts.length;
    const completed = athleteWorkouts.filter(w => w.status === 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    stats[id] = {
      total,
      completed,
      completionRate,
    };
  });

  return stats;
}
