'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WorkoutTagsManager } from '@/components/dashboard/workouts/workout-tags-manager';

// Workout categories - update here if new categories are added to database
const WORKOUT_CATEGORIES = [
  { value: 'hitting', label: 'Hitting' },
  { value: 'throwing', label: 'Throwing' },
  { value: 'strength_conditioning', label: 'Strength & Conditioning' }
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
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchWorkouts();
  }, []);

  async function fetchWorkouts() {
    console.log('Fetching workouts...');

    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        routines (
          id,
          routine_exercises (id)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workouts:', error);
    } else {
      console.log('Workouts loaded:', data);
      setWorkouts(data || []);
    }

    setLoading(false);
  }

  async function handleCreateWorkout() {
    console.log('=== CREATING WORKOUT ===');

    const { data, error } = await supabase
      .from('workouts')
      .insert({
        name: 'New Workout',
        estimated_duration_minutes: 60,
        is_template: false
      })
      .select()
      .single();

    console.log('Insert result:', { data, error });
    console.log('Error details:', error ? {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    } : 'No error');

    if (error) {
      console.error('Error creating workout:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      alert(`Failed to create workout: ${error.message || 'Unknown error'}`);
    } else {
      console.log('Workout created:', data);
      router.push(`/dashboard/workouts/${data.id}`);
    }
  }

  async function handleDuplicate(workout: Workout) {
    if (!confirm(`Duplicate "${workout.name}"?`)) return;

    // Create new workout
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

    // Fetch full workout data
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

    // Copy routines
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
        await supabase.from('routine_exercises').insert(exercisesToCopy);
      }
    }

    console.log('Workout duplicated');
    fetchWorkouts();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    // First, get all routines for this workout
    const { data: routines } = await supabase
      .from('routines')
      .select('id')
      .eq('workout_id', id);

    if (routines && routines.length > 0) {
      // Delete all routine_exercises for these routines
      const routineIds = routines.map(r => r.id);
      await supabase
        .from('routine_exercises')
        .delete()
        .in('routine_id', routineIds);

      // Delete all routines
      await supabase
        .from('routines')
        .delete()
        .eq('workout_id', id);
    }

    // Finally delete the workout
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting workout:', error);
      alert('Failed to delete workout');
    } else {
      console.log('Workout deleted');
      fetchWorkouts();
    }
  }

  // Get all unique tags from workouts for filter dropdown
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
        <div className="text-gray-400">Loading workouts...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Workout Library</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setManagerOpen(true)}
            className="px-4 py-2 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
          >
            ⚙️ Manage Tags
          </button>
          <button
            onClick={handleCreateWorkout}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            + Create Workout
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search workouts..."
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
          {WORKOUT_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
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

      {/* Workout Grid */}
      {filteredWorkouts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">
            {searchQuery ? 'No workouts found' : 'No workouts yet'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleCreateWorkout}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Create Your First Workout
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkouts.map((workout) => {
            const routineCount = workout.routines?.length || 0;
            const exerciseCount = workout.routines?.reduce(
              (sum, r) => sum + (r.routine_exercises?.length || 0),
              0
            ) || 0;

            return (
              <div
                key={workout.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Link
                      href={`/dashboard/workouts/${workout.id}`}
                      className="text-lg font-semibold text-white hover:text-blue-400 transition-colors block mb-2"
                    >
                      {workout.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      {getCategoryBadge(workout.category)}
                      {workout.is_template && (
                        <span className="inline-block px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs rounded">
                          Template
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Tags - top right */}
                  {workout.tags && workout.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end ml-2">
                      {workout.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                  <span>{routineCount} Routine{routineCount !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{exerciseCount} Exercise{exerciseCount !== 1 ? 's' : ''}</span>
                  {workout.estimated_duration_minutes && (
                    <>
                      <span>•</span>
                      <span>~{workout.estimated_duration_minutes} min</span>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/workouts/${workout.id}`}
                    className="flex-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded transition-colors text-center"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDuplicate(workout)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded transition-colors"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => handleDelete(workout.id, workout.name)}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
