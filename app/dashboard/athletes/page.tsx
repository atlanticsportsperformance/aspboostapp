'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
}

interface Team {
  id: string;
  name: string;
  level: string;
}

interface Plan {
  id: string;
  name: string;
}

interface Athlete {
  id: string;
  user_id: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  grad_year: number | null;
  is_active: boolean;
  created_at: string;
  profile?: Profile | null;
  teams?: Team[];
  currentPlan?: Plan | null;
  lastWorkoutDate?: string | null;
  completionRate?: number;
  upcomingWorkoutsCount?: number;
}

export default function AthletesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [filteredAthletes, setFilteredAthletes] = useState<Athlete[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active_plans' | 'no_plan' | 'at_risk'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    activeThisWeek: 0,
    avgCompletionRate: 0,
    atRisk: 0
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchAthletes() {
      const supabase = createClient();

      console.log('=== ATHLETES PAGE LOADING ===');

      // Step 1: Get all active athletes
      const { data: athletesData, error: athletesError } = await supabase
        .from('athletes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('1. Athletes query:', { count: athletesData?.length, data: athletesData, error: athletesError });

      if (!athletesData || athletesData.length === 0) {
        console.warn('No athletes found');
        setLoading(false);
        return;
      }

      // Step 2: Get profiles for athletes with user_id
      const userIds = athletesData.filter(a => a.user_id).map(a => a.user_id);
      let profilesData: Profile[] = [];

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone')
          .in('id', userIds);

        console.log('2. Profiles query:', { count: profiles?.length, data: profiles, error: profilesError });
        profilesData = profiles || [];
      }

      // Step 3: Get team memberships
      const athleteIds = athletesData.map(a => a.id);
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select('athlete_id, team_id, teams(id, name, level)')
        .in('athlete_id', athleteIds)
        .eq('status', 'active');

      console.log('3. Team members query:', { count: teamMembersData?.length, data: teamMembersData, error: teamMembersError });

      // Step 4: Get active plan assignments
      const { data: planAssignmentsData, error: planAssignmentsError } = await supabase
        .from('plan_assignments')
        .select('athlete_id, plan_id, plans(id, name)')
        .in('athlete_id', athleteIds)
        .eq('is_active', true);

      console.log('4. Plan assignments query:', { count: planAssignmentsData?.length, data: planAssignmentsData, error: planAssignmentsError });

      // Step 5: Get last 30 days workout instances for completion rates
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workout_instances')
        .select('athlete_id, scheduled_date, status, completed_at')
        .in('athlete_id', athleteIds)
        .gte('scheduled_date', thirtyDaysAgoStr);

      console.log('5. Workouts (last 30 days) query:', { count: workoutsData?.length, data: workoutsData, error: workoutsError });

      // Step 5b: Get next 7 days workout instances for upcoming workouts count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(today.getDate() + 7);
      const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0];

      const { data: upcomingWorkoutsData } = await supabase
        .from('workout_instances')
        .select('athlete_id, scheduled_date')
        .in('athlete_id', athleteIds)
        .gte('scheduled_date', todayStr)
        .lte('scheduled_date', sevenDaysLaterStr);

      console.log('5b. Upcoming workouts (next 7 days):', { count: upcomingWorkoutsData?.length, data: upcomingWorkoutsData });

      // Step 6: Get this week's workouts for "active this week" stat
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startDateStr = startOfWeek.toISOString().split('T')[0];

      const { data: thisWeekWorkoutsData } = await supabase
        .from('workout_instances')
        .select('athlete_id')
        .in('athlete_id', athleteIds)
        .gte('scheduled_date', startDateStr);

      console.log('6. This week workouts:', { count: thisWeekWorkoutsData?.length, data: thisWeekWorkoutsData });

      // Step 7: Merge all data
      const enrichedAthletes: Athlete[] = athletesData.map(athlete => {
        const profile = profilesData.find(p => p.id === athlete.user_id);

        // Get teams for this athlete
        const athleteTeams = (teamMembersData || [])
          .filter((tm: any) => tm.athlete_id === athlete.id)
          .map((tm: any) => tm.teams)
          .filter(Boolean);

        // Get current plan
        const planAssignment = (planAssignmentsData || []).find((pa: any) => pa.athlete_id === athlete.id);
        const currentPlan = planAssignment?.plans || null;

        // Calculate completion rate
        const athleteWorkouts = (workoutsData || []).filter((w: any) => w.athlete_id === athlete.id);
        const completedWorkouts = athleteWorkouts.filter((w: any) => w.status === 'completed').length;
        const totalWorkouts = athleteWorkouts.length;
        const completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

        // Get last workout date
        const completedDates = athleteWorkouts
          .filter((w: any) => w.completed_at)
          .map((w: any) => w.completed_at)
          .sort()
          .reverse();
        const lastWorkoutDate = completedDates[0] || null;

        // Count upcoming workouts (next 7 days)
        const upcomingWorkoutsCount = (upcomingWorkoutsData || []).filter((w: any) => w.athlete_id === athlete.id).length;

        return {
          ...athlete,
          profile,
          teams: athleteTeams,
          currentPlan,
          completionRate,
          lastWorkoutDate,
          upcomingWorkoutsCount
        };
      });

      console.log('7. Final enriched athletes:', enrichedAthletes);

      setAthletes(enrichedAthletes);
      setFilteredAthletes(enrichedAthletes);

      // Calculate stats
      const activeThisWeekIds = new Set((thisWeekWorkoutsData || []).map((w: any) => w.athlete_id));
      const totalCompletionRates = enrichedAthletes.map(a => a.completionRate || 0);
      const avgRate = totalCompletionRates.length > 0
        ? Math.round(totalCompletionRates.reduce((sum, rate) => sum + rate, 0) / totalCompletionRates.length)
        : 0;

      setStats({
        total: enrichedAthletes.length,
        activeThisWeek: activeThisWeekIds.size,
        avgCompletionRate: avgRate,
        atRisk: enrichedAthletes.filter(a => (a.completionRate || 0) < 70).length
      });

      setLoading(false);
    }

    fetchAthletes();
  }, []);

  // Filter athletes when filter changes
  useEffect(() => {
    let filtered = [...athletes];

    // Apply active filter
    if (activeFilter === 'active_plans') {
      filtered = filtered.filter(a => a.currentPlan);
    } else if (activeFilter === 'no_plan') {
      filtered = filtered.filter(a => !a.currentPlan);
    } else if (activeFilter === 'at_risk') {
      filtered = filtered.filter(a => (a.completionRate || 0) < 70);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => {
        const name = a.profile
          ? `${a.profile.first_name || ''} ${a.profile.last_name || ''}`.toLowerCase()
          : '';
        const position = (a.primary_position || '').toLowerCase();
        const teamNames = (a.teams || []).map(t => t.name.toLowerCase()).join(' ');

        return name.includes(query) || position.includes(query) || teamNames.includes(query);
      });
    }

    setFilteredAthletes(filtered);
  }, [activeFilter, searchQuery, athletes]);

  const getStatusColor = (rate: number = 0) => {
    if (rate >= 85) return 'text-emerald-400 bg-emerald-500/10';
    if (rate >= 70) return 'text-yellow-400 bg-yellow-500/10';
    return 'text-red-400 bg-red-500/10';
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#C9A857] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading athletes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Athletes</h1>
          <p className="text-gray-400 mt-1">Manage athlete profiles and training programs</p>
        </div>
        <button
          onClick={() => alert('Add Athlete modal - Coming soon')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#C9A857] text-black font-semibold rounded-lg hover:bg-[#B89647] transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Athlete
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search athletes by name, position, or team..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A857] focus:border-transparent"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Athletes', count: athletes.length },
          { id: 'active_plans', label: 'Active Plans', count: athletes.filter(a => a.currentPlan).length },
          { id: 'no_plan', label: 'No Active Plan', count: athletes.filter(a => !a.currentPlan).length },
          { id: 'at_risk', label: 'At Risk (<70%)', count: athletes.filter(a => (a.completionRate || 0) < 70).length }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeFilter === filter.id
                ? 'bg-[#C9A857] text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            style={mounted && activeFilter === filter.id ? {} : undefined}
          >
            {filter.label} <span className="ml-1.5 text-sm opacity-75">({filter.count})</span>
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-6">
          <div className="flex items-center justify-between mb-1 lg:mb-2">
            <p className="text-gray-400 text-xs lg:text-sm font-medium">Total Athletes</p>
            <div className="h-6 w-6 lg:h-10 lg:w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="h-3 w-3 lg:h-5 lg:w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xl lg:text-3xl font-bold text-white">{stats.total}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-6">
          <div className="flex items-center justify-between mb-1 lg:mb-2">
            <p className="text-gray-400 text-xs lg:text-sm font-medium">Active This Week</p>
            <div className="h-6 w-6 lg:h-10 lg:w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="h-3 w-3 lg:h-5 lg:w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p className="text-xl lg:text-3xl font-bold text-white">{stats.activeThisWeek}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-6">
          <div className="flex items-center justify-between mb-1 lg:mb-2">
            <p className="text-gray-400 text-xs lg:text-sm font-medium">Avg Completion</p>
            <div className="h-6 w-6 lg:h-10 lg:w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <svg className="h-3 w-3 lg:h-5 lg:w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-xl lg:text-3xl font-bold text-white">{stats.avgCompletionRate}%</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-6">
          <div className="flex items-center justify-between mb-1 lg:mb-2">
            <p className="text-gray-400 text-xs lg:text-sm font-medium">Athletes At Risk</p>
            <div className="h-6 w-6 lg:h-10 lg:w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <svg className="h-3 w-3 lg:h-5 lg:w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="text-xl lg:text-3xl font-bold text-white">{stats.atRisk}</p>
        </div>
      </div>

      {/* Athletes Table (Desktop) */}
      <div className="hidden lg:block bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Position</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Team</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Plan</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Last Workout</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Completion %</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAthletes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <p className="text-gray-400">No athletes found matching your filters</p>
                  </td>
                </tr>
              ) : (
                filteredAthletes.map((athlete) => (
                  <tr
                    key={athlete.id}
                    onClick={() => router.push(`/dashboard/athletes/${athlete.id}`)}
                    className="border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#C9A857] to-[#A08845] flex items-center justify-center text-black font-bold">
                          {athlete.profile?.first_name?.[0] || 'A'}
                          {athlete.profile?.last_name?.[0] || ''}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {athlete.profile
                              ? `${athlete.profile.first_name || ''} ${athlete.profile.last_name || ''}`.trim()
                              : `Athlete #${athlete.id.slice(0, 8)}`
                            }
                          </p>
                          {athlete.grad_year && (
                            <p className="text-sm text-gray-400">Class of {athlete.grad_year}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {athlete.primary_position ? (
                        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-md text-sm font-medium">
                          {athlete.primary_position}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {athlete.teams && athlete.teams.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {athlete.teams.map((team) => (
                            <span key={team.id} className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-medium">
                              {team.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No team</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {athlete.currentPlan ? (
                        <p className="text-white text-sm">{athlete.currentPlan.name}</p>
                      ) : (
                        <span className="text-gray-500 text-sm">No active plan</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-400 text-sm">{formatDate(athlete.lastWorkoutDate)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-sm font-medium ${getStatusColor(athlete.completionRate)}`}>
                          {athlete.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/athletes/${athlete.id}`);
                          }}
                          className="px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Athletes Cards (Mobile) */}
      <div className="lg:hidden space-y-3">
        {filteredAthletes.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400">No athletes found matching your filters</p>
          </div>
        ) : (
          filteredAthletes.map((athlete) => (
            <div
              key={athlete.id}
              onClick={() => router.push(`/dashboard/athletes/${athlete.id}`)}
              className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#C9A857] to-[#A08845] flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                  {athlete.profile?.first_name?.[0] || 'A'}
                  {athlete.profile?.last_name?.[0] || ''}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-white font-semibold text-base">
                      {athlete.profile
                        ? `${athlete.profile.first_name || ''} ${athlete.profile.last_name || ''}`.trim()
                        : `Athlete #${athlete.id.slice(0, 8)}`
                      }
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(athlete.completionRate)}`}>
                      {athlete.completionRate}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {athlete.grad_year && (
                      <p className="text-xs text-gray-400">Class of {athlete.grad_year}</p>
                    )}
                    {athlete.teams && athlete.teams.length > 0 && (
                      <>
                        {athlete.grad_year && <span className="text-gray-600">•</span>}
                        <span className="text-xs text-gray-400">{athlete.teams[0].name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-400 mb-0.5">Next 7 Days</p>
                  <span className="text-white font-medium">
                    {athlete.upcomingWorkoutsCount || 0} workout{athlete.upcomingWorkoutsCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <div>
                  <p className="text-gray-400 mb-0.5">Last Workout</p>
                  <p className="text-white">{formatDate(athlete.lastWorkoutDate)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
