'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WorkoutTagsManager } from '@/components/dashboard/workouts/workout-tags-manager';

// Routine categories - update here if new categories are added to database
const ROUTINE_CATEGORIES = [
  { value: 'hitting', label: 'Hitting' },
  { value: 'throwing', label: 'Throwing' },
  { value: 'strength_conditioning', label: 'Strength & Conditioning' }
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
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchRoutines();
  }, []);

  async function fetchRoutines() {
    console.log('Fetching standalone routines...');

    const { data, error} = await supabase
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
      .eq('is_standalone', true)          // ✅ ONLY templates
      .is('workout_id', null)              // ✅ NOT in a workout
      .is('plan_id', null)                 // ✅ NOT in a plan
      .is('athlete_id', null)              // ✅ NOT for an athlete
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching routines:', error);
    } else {
      console.log('✅ Template routines loaded:', data?.length);
      console.log('✅ Filtered to templates only (is_standalone=true, plan_id=null, athlete_id=null)');
      setRoutines(data || []);
    }

    setLoading(false);
  }

  async function handleCreateRoutine() {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('routines')
      .insert({
        name: 'New Routine',
        scheme: 'straight',
        is_standalone: true,
        created_by: user?.id || null,  // Set creator
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

    // Create new routine
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
      straight: { label: 'Straight Sets', color: 'bg-gray-500/20 text-gray-300' },
      superset: { label: 'Superset', color: 'bg-blue-500/20 text-blue-300' },
      circuit: { label: 'Circuit', color: 'bg-purple-500/20 text-purple-300' },
      emom: { label: 'EMOM', color: 'bg-green-500/20 text-green-300' },
      amrap: { label: 'AMRAP', color: 'bg-yellow-500/20 text-yellow-300' },
      giant_set: { label: 'Giant Set', color: 'bg-red-500/20 text-red-300' }
    };
    const config = schemes[scheme] || schemes.straight;
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getCategoryBadge = (category?: string) => {
    const categories: Record<string, { label: string; color: string }> = {
      hitting: { label: 'Hitting', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
      throwing: { label: 'Throwing', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
      strength_conditioning: { label: 'Strength & Conditioning', color: 'bg-green-500/20 text-green-300 border-green-500/30' }
    };
    const config = categories[category || 'strength_conditioning'] || categories.strength_conditioning;
    return (
      <span className={`px-2 py-0.5 rounded text-xs border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-400">Loading routines...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Routine Library</h1>
          <p className="text-gray-400 text-sm mt-1">
            Create reusable routines to import into workouts or assign directly to calendar
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setManagerOpen(true)}
            className="px-4 py-2 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
          >
            ⚙️ Manage Tags
          </button>
          <button
            onClick={handleCreateRoutine}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            + Create Routine
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search routines..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-neutral-900 [&>option]:text-white"
        >
          <option value="all">All Categories</option>
          {ROUTINE_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        <select
          value={schemeFilter}
          onChange={(e) => setSchemeFilter(e.target.value)}
          className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-neutral-900 [&>option]:text-white"
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
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-neutral-900 [&>option]:text-white"
          >
            <option value="all">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag} className="capitalize">{tag}</option>
            ))}
          </select>
        )}
      </div>

      {/* Routine List */}
      {filteredRoutines.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">
            {searchQuery || schemeFilter !== 'all' ? 'No routines found' : 'No routines yet'}
          </p>
          {!searchQuery && schemeFilter === 'all' && (
            <button
              onClick={handleCreateRoutine}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Create Your First Routine
            </button>
          )}
        </div>
      ) : (
        <div className="bg-neutral-900/30 border border-neutral-800 rounded-lg overflow-hidden">
          {/* List Header */}
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

          {/* List Items */}
          <div className="divide-y divide-neutral-800">
            {filteredRoutines.map((routine) => {
              const exerciseCount = routine.routine_exercises?.length || 0;

              return (
                <Link
                  key={routine.id}
                  href={`/dashboard/routines/${routine.id}`}
                  className="block px-6 py-4 hover:bg-neutral-800/30 transition-colors group"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Routine Name */}
                    <div className="col-span-3">
                      <div className="text-white font-medium group-hover:text-blue-400 transition-colors">
                        {routine.name}
                      </div>
                      {routine.description && (
                        <div className="text-xs text-neutral-500 mt-1 line-clamp-1">
                          {routine.description}
                        </div>
                      )}
                    </div>

                    {/* Category */}
                    <div className="col-span-2">
                      {getCategoryBadge(routine.category)}
                    </div>

                    {/* Scheme */}
                    <div className="col-span-2">
                      {getSchemeBadge(routine.scheme)}
                    </div>

                    {/* Exercises */}
                    <div className="col-span-1 text-sm text-neutral-400">
                      {exerciseCount}
                    </div>

                    {/* Created By */}
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

                    {/* Actions */}
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
                      <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

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
