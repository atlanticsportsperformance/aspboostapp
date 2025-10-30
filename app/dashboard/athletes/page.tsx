'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AddAthleteModal from '@/components/dashboard/athletes/add-athlete-modal';
import { getAthleteFilter } from '@/lib/auth/permissions';

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
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  date_of_birth: string | null;
  play_level: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  grad_year: number | null;
  is_active: boolean;
  created_at: string;
  vald_profile_id?: string | null;
  blast_player_id?: number | null;
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
  const [showAddModal, setShowAddModal] = useState(false);

  // Permissions state
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'coach' | 'athlete'>('coach');

  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    activeThisWeek: 0,
    noUpcoming: 0
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load user on mount
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('app_role')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserRole(profile.app_role);
        }
      }
    }
    loadUser();
  }, []);

  // Function to fetch athletes (can be called to refresh)
  async function fetchAthletes() {
      if (!userId) return;

      const supabase = createClient();

      console.log('=== ATHLETES PAGE LOADING ===');

      // Apply athlete visibility filtering
      const filter = await getAthleteFilter(userId, userRole);

      // Step 1: Get all athletes (include VALD and Blast Motion profile status, is_active, date_of_birth, and play_level)
      let query = supabase
        .from('athletes')
        .select('*, vald_profile_id, blast_player_id, is_active, date_of_birth, play_level');

      // Apply visibility filter
      if (filter.filter === 'ids' && filter.athleteIds) {
        if (filter.athleteIds.length === 0) {
          // No athletes assigned - show empty
          setAthletes([]);
          setFilteredAthletes([]);
          setLoading(false);
          return;
        }
        query = query.in('id', filter.athleteIds);
      }

      query = query.order('created_at', { ascending: false });

      const { data: athletesData, error: athletesError } = await query;

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
      const noUpcoming = enrichedAthletes.filter(a => (a.upcomingWorkoutsCount || 0) === 0).length;

      setStats({
        total: enrichedAthletes.length,
        activeThisWeek: activeThisWeekIds.size,
        noUpcoming
      });

      setLoading(false);
    }

  useEffect(() => {
    if (userId) {
      fetchAthletes();
    }
  }, [userId, userRole]);

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

  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const response = await fetch('/api/athletes/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteIds: Array.from(selectedAthletes) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete athletes');
      }

      alert(`✅ Successfully deleted ${data.deleted} athlete(s)`);
      setSelectedAthletes(new Set());
      setBulkMode(false);
      setShowBulkDeleteModal(false);
      await fetchAthletes(); // Refresh list
    } catch (error) {
      console.error('Error deleting athletes:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to delete athletes'}`);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
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
        {/* Desktop Action Buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => {
              setBulkMode(!bulkMode);
              setSelectedAthletes(new Set());
            }}
            className={`px-4 py-2 font-semibold rounded-lg transition-all duration-200 ${
              bulkMode
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : 'bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            {bulkMode ? 'Cancel Selection' : 'Bulk Manage'}
          </button>

          {bulkMode && selectedAthletes.size > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-lg border border-red-500/20 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete ({selectedAthletes.size})
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black font-semibold rounded-lg transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Athlete
          </button>
        </div>
      </div>

      {/* Search Bar and Filter Dropdown */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search athletes by name, position, or team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative sm:w-56">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as any)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent pr-10"
          >
            <option value="all" className="bg-[#0A0A0A] text-white">
              All Athletes ({athletes.length})
            </option>
            <option value="active_plans" className="bg-[#0A0A0A] text-white">
              Active Plans ({athletes.filter(a => a.currentPlan).length})
            </option>
            <option value="no_plan" className="bg-[#0A0A0A] text-white">
              No Active Plan ({athletes.filter(a => !a.currentPlan).length})
            </option>
            <option value="at_risk" className="bg-[#0A0A0A] text-white">
              At Risk &lt;70% ({athletes.filter(a => (a.completionRate || 0) < 70).length})
            </option>
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg lg:rounded-xl p-2 sm:p-3 lg:p-6">
          <p className="text-gray-400 text-xs lg:text-sm font-medium mb-2 lg:mb-3">Total</p>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="h-6 w-6 lg:h-10 lg:w-10 rounded bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="h-3.5 w-3.5 lg:h-5 lg:w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-xl lg:text-3xl font-bold text-white">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg lg:rounded-xl p-2 sm:p-3 lg:p-6">
          <p className="text-gray-400 text-xs lg:text-sm font-medium mb-2 lg:mb-3">Active</p>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="h-6 w-6 lg:h-10 lg:w-10 rounded bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="h-3.5 w-3.5 lg:h-5 lg:w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-xl lg:text-3xl font-bold text-white">{stats.activeThisWeek}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg lg:rounded-xl p-2 sm:p-3 lg:p-6">
          <p className="text-gray-400 text-xs lg:text-sm font-medium mb-2 lg:mb-3">No Workout</p>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="h-6 w-6 lg:h-10 lg:w-10 rounded bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="h-3.5 w-3.5 lg:h-5 lg:w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xl lg:text-3xl font-bold text-white">{stats.noUpcoming}</p>
          </div>
        </div>
      </div>

      {/* Athletes Table (Desktop) */}
      <div className="hidden lg:block bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {bulkMode && (
                  <th className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedAthletes.size === filteredAthletes.length && filteredAthletes.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAthletes(new Set(filteredAthletes.map(a => a.id)));
                        } else {
                          setSelectedAthletes(new Set());
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-600 text-[#9BDDFF] focus:ring-[#9BDDFF] focus:ring-offset-gray-900"
                    />
                  </th>
                )}
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Playing Level</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Birthday</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Email</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Last Workout</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAthletes.length === 0 ? (
                <tr>
                  <td colSpan={bulkMode ? 8 : 7} className="text-center py-12">
                    <p className="text-gray-400">No athletes found matching your filters</p>
                  </td>
                </tr>
              ) : (
                filteredAthletes.map((athlete) => (
                  <tr
                    key={athlete.id}
                    onClick={(e) => {
                      if (bulkMode) {
                        e.stopPropagation();
                        const newSelected = new Set(selectedAthletes);
                        if (newSelected.has(athlete.id)) {
                          newSelected.delete(athlete.id);
                        } else {
                          newSelected.add(athlete.id);
                        }
                        setSelectedAthletes(newSelected);
                      } else {
                        router.push(`/dashboard/athletes/${athlete.id}`);
                      }
                    }}
                    className={`border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors duration-150 ${
                      bulkMode && selectedAthletes.has(athlete.id) ? 'bg-[#9BDDFF]/10' : ''
                    }`}
                  >
                    {bulkMode && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedAthletes.has(athlete.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newSelected = new Set(selectedAthletes);
                            if (e.target.checked) {
                              newSelected.add(athlete.id);
                            } else {
                              newSelected.delete(athlete.id);
                            }
                            setSelectedAthletes(newSelected);
                          }}
                          className="w-4 h-4 rounded border-gray-600 text-[#9BDDFF] focus:ring-[#9BDDFF] focus:ring-offset-gray-900"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            athlete.is_active ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                          title={athlete.is_active ? 'Active' : 'Inactive'}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] flex items-center justify-center text-black font-bold">
                          {athlete.first_name?.[0] || 'A'}
                          {athlete.last_name?.[0] || ''}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">
                              {athlete.first_name && athlete.last_name
                                ? `${athlete.first_name} ${athlete.last_name}`.trim()
                                : `Athlete #${athlete.id.slice(0, 8)}`
                              }
                            </p>
                            <div className="flex items-center gap-1">
                              {athlete.vald_profile_id && (
                                <div className="group relative">
                                  <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
                                    <span className="text-white font-bold text-xs">V</span>
                                  </div>
                                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    VALD Connected
                                  </div>
                                </div>
                              )}
                              {athlete.blast_player_id && (
                                <div className="group relative">
                                  <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center">
                                    <span className="text-blue-500 font-bold text-xs">B</span>
                                  </div>
                                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    Blast Motion Connected
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          {athlete.grad_year && (
                            <p className="text-sm text-gray-400">Class of {athlete.grad_year}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {athlete.play_level ? (
                        <span className="text-white text-sm">
                          {athlete.play_level}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {athlete.date_of_birth ? (
                        <p className="text-gray-400 text-sm">
                          {new Date(athlete.date_of_birth).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {athlete.profile?.email ? (
                        <p className="text-gray-400 text-sm">{athlete.profile.email}</p>
                      ) : athlete.email ? (
                        <p className="text-gray-400 text-sm">{athlete.email}</p>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-400 text-sm">{formatDate(athlete.lastWorkoutDate)}</p>
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
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                  {athlete.first_name?.[0] || 'A'}
                  {athlete.last_name?.[0] || ''}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-white font-semibold text-base">
                        {athlete.first_name && athlete.last_name
                          ? `${athlete.first_name} ${athlete.last_name}`.trim()
                          : `Athlete #${athlete.id.slice(0, 8)}`
                        }
                      </h3>
                      <div className="flex items-center gap-0.5">
                        {athlete.vald_profile_id && (
                          <div className="h-4 w-4 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-[10px]">V</span>
                          </div>
                        )}
                        {athlete.blast_player_id && (
                          <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-500 font-bold text-[10px]">B</span>
                          </div>
                        )}
                      </div>
                    </div>
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

      {/* Mobile Floating Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="sm:hidden fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[#9BDDFF] to-[#7BC5F0] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
      >
        <svg className="w-7 h-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Add Athlete Modal */}
      <AddAthleteModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          fetchAthletes(); // Refresh the athletes list
        }}
      />

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">Delete {selectedAthletes.size} Athlete{selectedAthletes.size > 1 ? 's' : ''}</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Are you sure you want to permanently delete <span className="text-white font-semibold">{selectedAthletes.size} athlete{selectedAthletes.size > 1 ? 's' : ''}</span>?
                </p>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
                  <p className="text-red-400 text-sm font-medium">
                    ⚠️ This action cannot be undone. This will permanently delete:
                  </p>
                  <ul className="text-red-400/80 text-xs mt-2 space-y-1 ml-4">
                    <li>• All workout history and logs</li>
                    <li>• All plan assignments</li>
                    <li>• All max records</li>
                    <li>• All group memberships</li>
                    <li>• All notes and documents</li>
                  </ul>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
                  <p className="text-emerald-400 text-xs">
                    ✅ <span className="font-medium">Preserved:</span> VALD test data and percentile contributions will remain.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleteLoading}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteLoading}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {bulkDeleteLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
