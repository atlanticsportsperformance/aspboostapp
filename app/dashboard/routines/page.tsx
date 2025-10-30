'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { WorkoutTagsManager } from '@/components/dashboard/workouts/workout-tags-manager';
import { useStaffPermissions } from '@/lib/auth/use-staff-permissions';
import { getContentFilter } from '@/lib/auth/permissions';

// Routine categories - update here if new categories are added to database
const ROUTINE_CATEGORIES = [
  { value: 'hitting', label: 'Hitting' },
  { value: 'throwing', label: 'Throwing' },
  { value: 'strength_conditioning', label: 'S&C' }
] as const;

interface Routine {
  id: string;
  name: string;
  scheme: string;
  description: string | null;
  superset_block_name: string | null;
  text_info: string | null;
  tags?: string[];
  category?: 'hitting' | 'throwing' | 'strength_conditioning';
  created_at: string;
  created_by: string | null;
  creator?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  routine_exercises: {
    id: string;
    exercise_id: string | null;
    exercises: {
      name: string;
    } | null;
  }[];
}

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [schemeFilter, setSchemeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [managerOpen, setManagerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Permissions state
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'coach' | 'athlete'>('coach');
  const { permissions } = useStaffPermissions(userId);
  const [routinePermissions, setRoutinePermissions] = useState<{[key: string]: {canEdit: boolean, canDelete: boolean}}>({});

  // Load user info and permissions
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('app_role')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserRole(profile.app_role || 'coach');
        }
      }
    }
    loadUser();
  }, []);

  // Fetch routines when user info changes
  useEffect(() => {
    if (userId !== null) {
      fetchRoutines();
    }
  }, [pathname, userId, userRole]);

  // Recompute permissions when permissions load or routines change
  useEffect(() => {
    if (routines.length > 0 && userId && permissions) {
      computeRoutinePermissions();
    }
  }, [routines.length, userId, userRole, JSON.stringify(permissions)]);

  async function fetchRoutines() {
    if (!userId) return;
    console.log('Fetching standalone routines...');

    // Apply visibility filter
    const filter = await getContentFilter(userId, userRole, 'routines');

    let query = supabase
      .from('routines')
      .select(`
        *,
        creator:created_by (
          first_name,
          last_name,
          email
        ),
        routine_exercises (
          id,
          exercise_id,
          exercises (name)
        )
      `)
      .eq('is_standalone', true)
      .is('workout_id', null)
      .is('plan_id', null)
      .is('athlete_id', null)
      .order('created_at', { ascending: false });

    // Apply creator filter based on permissions
    if (filter.filter === 'ids' && filter.creatorIds) {
      if (filter.creatorIds.length === 0) {
        setRoutines([]);
        setLoading(false);
        return;
      }
      query = query.in('created_by', filter.creatorIds);
    }

    const { data, error} = await query;

    if (error) {
      console.error('Error fetching routines:', error);
    } else {
      console.log('✅ Template routines loaded:', data?.length);
      setRoutines(data || []);
    }

    setLoading(false);
  }

  async function computeRoutinePermissions() {
    if (!userId || !routines || routines.length === 0) return;

    const permsMap: {[key: string]: {canEdit: boolean, canDelete: boolean}} = {};
    const creatorIds = [...new Set(routines.map(r => r.created_by).filter(Boolean))] as string[];

    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, app_role')
        .in('id', creatorIds);

      const creatorRoles = new Map(creators?.map(c => [c.id, c.app_role]) || []);

      for (const routine of routines) {
        const isOwnRoutine = routine.created_by === userId;
        const creatorRole = routine.created_by ? creatorRoles.get(routine.created_by) : null;
        const isAdminOrSuperAdminRoutine = creatorRole === 'admin' || creatorRole === 'super_admin';

        const canEdit = userRole === 'super_admin' ||
                        (isOwnRoutine && permissions?.can_edit_own_routines) ||
                        (isAdminOrSuperAdminRoutine && permissions?.can_edit_admin_routines);
        const canDelete = userRole === 'super_admin' ||
                          (isOwnRoutine && permissions?.can_delete_own_routines) ||
                          (isAdminOrSuperAdminRoutine && permissions?.can_delete_admin_routines);

        permsMap[routine.id] = { canEdit, canDelete };
      }
    }

    setRoutinePermissions(permsMap);
  }

  async function handleCreateRoutine() {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('routines')
      .insert({
        name: 'New Routine',
        scheme: 'straight',
        is_standalone: true,
        created_by: user?.id || null,
        order_index: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating routine:', error);
      alert(`Failed to create routine: ${error.message || 'Unknown error'}`);
    } else {
      console.log('Routine created:', data);
      router.push(`/dashboard/routines/${data.id}`);
    }
  }

  async function handleDuplicate(routine: Routine) {
    if (!confirm(`Duplicate "${routine.name}"?`)) return;

    const { data: newRoutine, error: routineError } = await supabase
      .from('routines')
      .insert({
        name: `${routine.name} (Copy)`,
        scheme: routine.scheme,
        description: routine.description,
        superset_block_name: routine.superset_block_name,
        text_info: routine.text_info,
        is_standalone: true,
        order_index: 0
      })
      .select()
      .single();

    if (routineError) {
      console.error('Error duplicating routine:', routineError);
      alert('Failed to duplicate routine');
      return;
    }

    // Copy exercises
    const exercisesToCopy = routine.routine_exercises.map((ex: any) => ({
      routine_id: newRoutine.id,
      exercise_id: ex.exercise_id,
      is_placeholder: ex.is_placeholder,
      placeholder_id: ex.placeholder_id,
      order_index: ex.order_index,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps,
      target_time_seconds: ex.target_time_seconds,
      target_load: ex.target_load,
      intensity_percent: ex.intensity_percent,
      intensity_type: ex.intensity_type,
      target_rpe: ex.target_rpe,
      rest_seconds: ex.rest_seconds,
      notes: ex.notes
    }));

    if (exercisesToCopy.length > 0) {
      const { error: exercisesError } = await supabase
        .from('routine_exercises')
        .insert(exercisesToCopy);

      if (exercisesError) {
        console.error('Error copying exercises:', exercisesError);
      }
    }

    console.log('Routine duplicated');
    fetchRoutines();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting routine:', error);
      alert('Failed to delete routine');
    } else {
      console.log('Routine deleted');
      fetchRoutines();
    }
  }

  // Get all unique tags from routines for filter dropdown
  const allTags = Array.from(new Set(routines.flatMap(r => r.tags || []))).sort();

  const filteredRoutines = routines.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScheme = schemeFilter === 'all' || r.scheme === schemeFilter;
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesTag = tagFilter === 'all' || (r.tags && r.tags.includes(tagFilter));
    return matchesSearch && matchesScheme && matchesCategory && matchesTag;
  });

  const getSchemeBadge = (scheme: string) => {
    const schemes: Record<string, { label: string; color: string }> = {
      straight: { label: 'Straight', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
      superset: { label: 'Superset', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
      circuit: { label: 'Circuit', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      emom: { label: 'EMOM', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
      amrap: { label: 'AMRAP', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
      giant_set: { label: 'Giant Set', color: 'bg-red-500/20 text-red-300 border-red-500/30' }
    };
    const config = schemes[scheme] || schemes.straight;
    return (
      <span className={`px-1.5 py-0.5 rounded text-xs border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getCategoryBadge = (category?: string) => {
    const categories: Record<string, { label: string; color: string; emoji: string }> = {
      hitting: { label: 'Hitting', color: 'bg-red-500/20 text-red-300 border-red-500/30', emoji: '⚾' },
      throwing: { label: 'Throwing', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', emoji: '🎯' },
      strength_conditioning: { label: 'S&C', color: 'bg-green-500/20 text-green-300 border-green-500/30', emoji: '💪' }
    };
    const config = categories[category || 'strength_conditioning'] || categories.strength_conditioning;
    return (
      <span className={`px-1.5 py-0.5 rounded text-xs border ${config.color} flex items-center gap-1`}>
        <span>{config.emoji}</span>
        <span className="hidden sm:inline">{config.label}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-3 lg:p-6">
        <div className="text-gray-400 text-sm">Loading routines...</div>
      </div>
    );
  }

  const activeFilterCount = [
    categoryFilter !== 'all' ? 1 : 0,
    schemeFilter !== 'all' ? 1 : 0,
    tagFilter !== 'all' ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Compact Mobile Header */}
      <div className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/10">
        <div className="p-3 lg:p-6">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-white">Routines</h1>
              <p className="text-gray-400 text-xs lg:text-sm mt-0.5 lg:mt-1 hidden sm:block">
                Reusable exercise routines
              </p>
            </div>
            <div className="flex gap-2">
              {/* Mobile: Only show create button */}
              {(userRole === 'super_admin' || permissions?.can_create_routines) && (
                <button
                  onClick={handleCreateRoutine}
                  className="px-3 py-2 lg:px-4 lg:py-2 bg-[#9BDDFF] hover:bg-[#7BC5F0] text-black rounded-lg font-medium transition-colors text-sm lg:text-base"
                >
                  <span className="hidden sm:inline">+ Create</span>
                  <span className="sm:hidden">+</span>
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]/50"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors relative"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#9BDDFF] text-black text-xs rounded-full flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setManagerOpen(true)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
              title="Manage Tags"
            >
              ⚙️
            </button>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]/50 [&>option]:bg-neutral-900"
              >
                <option value="all">All Categories</option>
                {ROUTINE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <select
                value={schemeFilter}
                onChange={(e) => setSchemeFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]/50 [&>option]:bg-neutral-900"
              >
                <option value="all">All Schemes</option>
                <option value="straight">Straight Sets</option>
                <option value="superset">Superset</option>
                <option value="circuit">Circuit</option>
                <option value="emom">EMOM</option>
                <option value="amrap">AMRAP</option>
                <option value="giant_set">Giant Set</option>
              </select>
              {allTags.length > 0 && (
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]/50 [&>option]:bg-neutral-900"
                >
                  <option value="all">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag} className="capitalize">{tag}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Routine List */}
      <div className="p-3 lg:p-6">
        {filteredRoutines.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm mb-4">
              {searchQuery || schemeFilter !== 'all' ? 'No routines found' : 'No routines yet'}
            </p>
            {!searchQuery && schemeFilter === 'all' && (userRole === 'super_admin' || permissions?.can_create_routines) && (
              <button
                onClick={handleCreateRoutine}
                className="px-4 py-2 bg-[#9BDDFF] hover:bg-[#7BC5F0] text-black rounded-lg font-medium transition-colors text-sm"
              >
                Create Your First Routine
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: Card Layout */}
            <div className="lg:hidden space-y-2">
              {filteredRoutines.map((routine) => {
                const exerciseCount = routine.routine_exercises?.length || 0;
                const canEdit = routinePermissions[routine.id]?.canEdit;
                const canDelete = routinePermissions[routine.id]?.canDelete;

                return (
                  <div
                    key={routine.id}
                    onClick={() => canEdit && router.push(`/dashboard/routines/${routine.id}`)}
                    className={`bg-white/5 border border-white/10 rounded-lg p-3 ${canEdit ? 'active:bg-white/10' : ''}`}
                  >
                    {/* Top Row: Name and Badges */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium text-sm truncate">{routine.name}</h3>
                        {routine.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{routine.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {getCategoryBadge(routine.category)}
                      </div>
                    </div>

                    {/* Middle Row: Scheme and Exercise Count */}
                    <div className="flex items-center gap-2 mb-2">
                      {getSchemeBadge(routine.scheme)}
                      <span className="text-xs text-gray-400">
                        {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
                      </span>
                    </div>

                    {/* Bottom Row: Creator and Actions */}
                    <div className="flex items-center justify-between gap-2">
                      {routine.creator ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] text-xs font-semibold">
                            {routine.creator.first_name?.[0]}{routine.creator.last_name?.[0]}
                          </div>
                          <span className="text-xs text-gray-400 truncate">
                            {routine.creator.first_name} {routine.creator.last_name}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600">—</div>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(routine);
                          }}
                          className="p-1.5 hover:bg-blue-500/20 rounded text-blue-400 transition-colors"
                          title="Duplicate"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>

                        {canEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/routines/${routine.id}`);
                            }}
                            className="p-1.5 hover:bg-blue-500/20 rounded text-blue-400 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(routine.id, routine.name);
                            }}
                            className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden lg:block bg-neutral-900/30 border border-neutral-800 rounded-lg overflow-hidden">
              <div className="bg-neutral-900/50 border-b border-neutral-800 px-6 py-3">
                <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  <div className="col-span-3">Routine Name</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-2">Scheme</div>
                  <div className="col-span-1">Exercises</div>
                  <div className="col-span-2">Created By</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
              </div>

              <div className="divide-y divide-neutral-800">
                {filteredRoutines.map((routine) => {
                  const exerciseCount = routine.routine_exercises?.length || 0;

                  return (
                    <div
                      key={routine.id}
                      className="block px-6 py-4 hover:bg-neutral-800/30 transition-colors group"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3">
                          <div className="text-white font-medium">
                            {routine.name}
                          </div>
                          {routine.description && (
                            <div className="text-xs text-neutral-500 mt-1 line-clamp-1">
                              {routine.description}
                            </div>
                          )}
                        </div>

                        <div className="col-span-2">
                          {getCategoryBadge(routine.category)}
                        </div>

                        <div className="col-span-2">
                          {getSchemeBadge(routine.scheme)}
                        </div>

                        <div className="col-span-1 text-sm text-neutral-400">
                          {exerciseCount}
                        </div>

                        <div className="col-span-2">
                          {routine.creator ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] text-xs font-semibold">
                                {routine.creator.first_name?.[0]}{routine.creator.last_name?.[0]}
                              </div>
                              <div className="text-sm text-neutral-300">
                                {routine.creator.first_name} {routine.creator.last_name}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-600">—</span>
                          )}
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDuplicate(routine);
                            }}
                            className="p-2 hover:bg-blue-500/20 rounded text-blue-400/80 hover:text-blue-300 transition-colors"
                            title="Duplicate routine"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>

                          {routinePermissions[routine.id]?.canEdit && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/dashboard/routines/${routine.id}`);
                              }}
                              className="p-2 hover:bg-blue-500/20 rounded text-blue-400/80 hover:text-blue-300 transition-colors"
                              title="Edit routine"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}

                          {routinePermissions[routine.id]?.canDelete && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(routine.id, routine.name);
                              }}
                              className="p-2 hover:bg-red-500/20 rounded text-red-400/80 hover:text-red-300 transition-colors"
                              title="Delete routine"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tags Manager */}
      {managerOpen && (
        <WorkoutTagsManager
          onClose={() => setManagerOpen(false)}
          onUpdate={() => fetchRoutines()}
        />
      )}
    </div>
  );
}
