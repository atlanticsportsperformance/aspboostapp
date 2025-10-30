'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { WorkoutTagsManager } from '@/components/dashboard/workouts/workout-tags-manager';
import { useStaffPermissions } from '@/lib/auth/use-staff-permissions';
import { getContentFilter } from '@/lib/auth/permissions';

// Workout categories
const WORKOUT_CATEGORIES = [
  { value: 'hitting', label: 'Hitting' },
  { value: 'throwing', label: 'Throwing' },
  { value: 'strength_conditioning', label: 'S&C' }
] as const;

interface Workout {
  id: string;
  name: string;
  estimated_duration_minutes: number | null;
  is_template: boolean;
  notes: string | null;
  tags?: string[];
  category?: 'hitting' | 'throwing' | 'strength_conditioning';
  created_at: string;
  created_by: string | null;
  creator?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  routines: {
    id: string;
    routine_exercises: { id: string }[];
  }[];
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
  const [workoutPermissions, setWorkoutPermissions] = useState<{[key: string]: {canEdit: boolean, canDelete: boolean}}>({});

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

  useEffect(() => {
    if (userId !== null) {
      fetchWorkouts();
    }
  }, [pathname, userId, userRole]);

  useEffect(() => {
    if (workouts.length > 0 && userId && permissions) {
      computeWorkoutPermissions();
    }
  }, [workouts.length, userId, userRole, JSON.stringify(permissions)]);

  async function fetchWorkouts() {
    if (!userId) return;

    const filter = await getContentFilter(userId, userRole, 'workouts');

    let query = supabase
      .from('workouts')
      .select(`
        *,
        creator:created_by (
          first_name,
          last_name,
          email
        ),
        routines (
          id,
          routine_exercises (id)
        )
      `)
      .eq('is_template', true)
      .is('plan_id', null)
      .is('athlete_id', null)
      .order('created_at', { ascending: false });

    if (filter.filter === 'ids' && filter.creatorIds) {
      if (filter.creatorIds.length === 0) {
        setWorkouts([]);
        setLoading(false);
        return;
      }
      query = query.in('created_by', filter.creatorIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching workouts:', error);
      setLoading(false);
      return;
    }

    setWorkouts(data || []);
    setLoading(false);
  }

  async function computeWorkoutPermissions() {
    if (!userId || !workouts || workouts.length === 0) return;

    const permsMap: {[key: string]: {canEdit: boolean, canDelete: boolean}} = {};
    const creatorIds = [...new Set(workouts.map(w => w.created_by).filter(Boolean))] as string[];

    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, app_role')
        .in('id', creatorIds);

      const creatorRoles = new Map(creators?.map(c => [c.id, c.app_role]) || []);

      for (const workout of workouts) {
        const isOwnWorkout = workout.created_by === userId;
        const creatorRole = workout.created_by ? creatorRoles.get(workout.created_by) : null;
        const isAdminOrSuperAdminWorkout = creatorRole === 'admin' || creatorRole === 'super_admin';

        const canEdit = userRole === 'super_admin' ||
                        (isOwnWorkout && permissions?.can_edit_own_workouts) ||
                        (isAdminOrSuperAdminWorkout && permissions?.can_edit_admin_workouts);
        const canDelete = userRole === 'super_admin' ||
                          (isOwnWorkout && permissions?.can_delete_own_workouts) ||
                          (isAdminOrSuperAdminWorkout && permissions?.can_delete_admin_workouts);

        permsMap[workout.id] = { canEdit, canDelete };
      }
    }

    setWorkoutPermissions(permsMap);
  }

  async function handleCreateWorkout() {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('workouts')
      .insert({
        name: 'New Workout',
        estimated_duration_minutes: 60,
        is_template: true,
        plan_id: null,
        athlete_id: null,
        created_by: user?.id || null,
        placeholder_definitions: { placeholders: [] }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating workout:', error);
      alert(`Failed to create workout: ${error.message || 'Unknown error'}`);
    } else {
      router.push(`/dashboard/workouts/${data.id}`);
    }
  }

  async function handleDuplicate(workout: Workout) {
    if (!confirm(`Duplicate "${workout.name}"?`)) return;

    const { data: newWorkout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        name: `${workout.name} (Copy)`,
        estimated_duration_minutes: workout.estimated_duration_minutes,
        is_template: workout.is_template,
        notes: workout.notes
      })
      .select()
      .single();

    if (workoutError) {
      console.error('Error duplicating workout:', workoutError);
      return;
    }

    const { data: fullWorkout } = await supabase
      .from('workouts')
      .select(`
        *,
        routines (
          *,
          routine_exercises (*)
        )
      `)
      .eq('id', workout.id)
      .single();

    if (!fullWorkout || !fullWorkout.routines) return;

    for (const routine of fullWorkout.routines) {
      const { data: newRoutine } = await supabase
        .from('routines')
        .insert({
          workout_id: newWorkout.id,
          name: routine.name,
          scheme: routine.scheme,
          order_index: routine.order_index,
          rest_between_rounds_seconds: routine.rest_between_rounds_seconds,
          notes: routine.notes,
          superset_block_name: routine.superset_block_name,
          text_info: routine.text_info
        })
        .select()
        .single();

      if (!newRoutine) continue;

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
        await supabase.from('routine_exercises').insert(exercisesToCopy);
      }
    }

    fetchWorkouts();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    await supabase.from('workout_instances').delete().eq('workout_id', id);
    await supabase.from('program_days').delete().eq('workout_id', id);

    const { data: routines } = await supabase
      .from('routines')
      .select('id')
      .eq('workout_id', id);

    if (routines && routines.length > 0) {
      const routineIds = routines.map(r => r.id);
      await supabase.from('routine_exercises').delete().in('routine_id', routineIds);
      await supabase.from('routines').delete().eq('workout_id', id);
    }

    const { error } = await supabase.from('workouts').delete().eq('id', id);

    if (error) {
      console.error('Error deleting workout:', error);
      alert(`Failed to delete workout: ${error.message || 'Unknown error'}`);
    } else {
      fetchWorkouts();
    }
  }

  const allTags = Array.from(new Set(workouts.flatMap(w => w.tags || []))).sort();

  const filteredWorkouts = workouts.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || w.category === categoryFilter;
    const matchesTag = tagFilter === 'all' || (w.tags && w.tags.includes(tagFilter));
    return matchesSearch && matchesCategory && matchesTag;
  });

  const getCategoryBadge = (category?: string) => {
    const categories: Record<string, { label: string; color: string }> = {
      hitting: { label: 'Hitting', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
      throwing: { label: 'Throwing', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
      strength_conditioning: { label: 'S&C', color: 'bg-green-500/20 text-green-300 border-green-500/30' }
    };
    const config = categories[category || 'strength_conditioning'] || categories.strength_conditioning;
    return (
      <span className={`px-1.5 py-0.5 rounded text-xs border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-3 lg:p-6">
        <div className="text-gray-400 text-sm">Loading workouts...</div>
      </div>
    );
  }

  const activeFilterCount = [
    categoryFilter !== 'all' ? 1 : 0,
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
              <h1 className="text-xl lg:text-3xl font-bold text-white">Workouts</h1>
              <p className="text-gray-400 text-xs lg:text-sm mt-0.5 lg:mt-1 hidden sm:block">
                Reusable workout templates
              </p>
            </div>
            <div className="flex gap-2">
              {(userRole === 'super_admin' || permissions?.can_create_workouts) && (
                <button
                  onClick={handleCreateWorkout}
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
                {WORKOUT_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
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

      {/* Workout List */}
      <div className="p-3 lg:p-6">
        {filteredWorkouts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm mb-4">
              {searchQuery ? 'No workouts found' : 'No workouts yet'}
            </p>
            {!searchQuery && (userRole === 'super_admin' || permissions?.can_create_workouts) && (
              <button
                onClick={handleCreateWorkout}
                className="px-4 py-2 bg-[#9BDDFF] hover:bg-[#7BC5F0] text-black rounded-lg font-medium transition-colors text-sm"
              >
                Create Your First Workout
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: Card Layout */}
            <div className="lg:hidden space-y-2">
              {filteredWorkouts.map((workout) => {
                const routineCount = workout.routines?.length || 0;
                const exerciseCount = workout.routines?.reduce((sum, r) => sum + (r.routine_exercises?.length || 0), 0) || 0;
                const canEdit = workoutPermissions[workout.id]?.canEdit;
                const canDelete = workoutPermissions[workout.id]?.canDelete;

                return (
                  <div
                    key={workout.id}
                    onClick={() => canEdit && router.push(`/dashboard/workouts/${workout.id}`)}
                    className={`bg-white/5 border border-white/10 rounded-lg p-3 ${canEdit ? 'active:bg-white/10' : ''}`}
                  >
                    {/* Top Row: Name and Category */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium text-sm truncate">{workout.name}</h3>
                        {workout.estimated_duration_minutes && (
                          <p className="text-xs text-gray-400 mt-0.5">~{workout.estimated_duration_minutes} min</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {getCategoryBadge(workout.category)}
                      </div>
                    </div>

                    {/* Middle Row: Routines and Exercises */}
                    <div className="flex items-center gap-3 mb-2 text-xs text-gray-400">
                      <span>{routineCount} routine{routineCount !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>{exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Tags Row (if any) */}
                    {workout.tags && workout.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {workout.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300"
                          >
                            {tag}
                          </span>
                        ))}
                        {workout.tags.length > 3 && (
                          <span className="px-1.5 py-0.5 text-xs text-gray-500">
                            +{workout.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bottom Row: Creator and Actions */}
                    <div className="flex items-center justify-between gap-2">
                      {workout.creator ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] text-xs font-semibold">
                            {workout.creator.first_name?.[0]}{workout.creator.last_name?.[0]}
                          </div>
                          <span className="text-xs text-gray-400 truncate">
                            {workout.creator.first_name} {workout.creator.last_name}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600">—</div>
                      )}

                      <div className="flex items-center gap-1">
                        {(userRole === 'super_admin' || permissions?.can_create_workouts) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(workout);
                            }}
                            className="p-1.5 hover:bg-blue-500/20 rounded text-blue-400 transition-colors"
                            title="Duplicate"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}

                        {canEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/workouts/${workout.id}`);
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
                              handleDelete(workout.id, workout.name);
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
                  <div className="col-span-3">Workout Name</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-2">Details</div>
                  <div className="col-span-2">Tags</div>
                  <div className="col-span-2">Created By</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>
              </div>

              <div className="divide-y divide-neutral-800">
                {filteredWorkouts.map((workout) => {
                  const routineCount = workout.routines?.length || 0;
                  const exerciseCount = workout.routines?.reduce((sum, r) => sum + (r.routine_exercises?.length || 0), 0) || 0;

                  return (
                    <div
                      key={workout.id}
                      className="block px-6 py-4 hover:bg-neutral-800/30 transition-colors group"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3">
                          <div className="text-white font-medium">
                            {workout.name}
                          </div>
                          {workout.estimated_duration_minutes && (
                            <div className="text-xs text-neutral-500 mt-1">
                              ~{workout.estimated_duration_minutes} min
                            </div>
                          )}
                        </div>

                        <div className="col-span-2">
                          {getCategoryBadge(workout.category)}
                        </div>

                        <div className="col-span-2 text-sm text-neutral-400">
                          <div>{routineCount} Routine{routineCount !== 1 ? 's' : ''}</div>
                          <div className="text-xs text-neutral-500">{exerciseCount} Exercise{exerciseCount !== 1 ? 's' : ''}</div>
                        </div>

                        <div className="col-span-2">
                          {workout.tags && workout.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {workout.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300"
                                >
                                  {tag}
                                </span>
                              ))}
                              {workout.tags.length > 2 && (
                                <span className="px-2 py-0.5 text-xs text-neutral-500">
                                  +{workout.tags.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-600">—</span>
                          )}
                        </div>

                        <div className="col-span-2">
                          {workout.creator ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] text-xs font-semibold">
                                {workout.creator.first_name?.[0]}{workout.creator.last_name?.[0]}
                              </div>
                              <div className="text-sm text-neutral-300">
                                {workout.creator.first_name} {workout.creator.last_name}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-600">—</span>
                          )}
                        </div>

                        <div className="col-span-1 flex items-center justify-end gap-2">
                          {(userRole === 'super_admin' || permissions?.can_create_workouts) && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDuplicate(workout);
                              }}
                              className="p-2 hover:bg-blue-500/20 rounded text-blue-400/80 hover:text-blue-300 transition-colors"
                              title="Duplicate workout"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          )}
                          {workoutPermissions[workout.id]?.canEdit && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/dashboard/workouts/${workout.id}`);
                              }}
                              className="p-2 hover:bg-blue-500/20 rounded text-blue-400/80 hover:text-blue-300 transition-colors"
                              title="Edit workout"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {workoutPermissions[workout.id]?.canDelete && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(workout.id, workout.name);
                              }}
                              className="p-2 hover:bg-red-500/20 rounded text-red-400/80 hover:text-red-300 transition-colors"
                              title="Delete workout"
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
          onUpdate={() => fetchWorkouts()}
        />
      )}
    </div>
  );
}
