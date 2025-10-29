'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStaffPermissions } from '@/lib/auth/use-staff-permissions';
import { getContentFilter } from '@/lib/auth/permissions';

interface Measurement {
  id: string;
  name: string;
  type: string;
  unit: string;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  tags: string[];
  metric_schema?: {
    measurements: Measurement[];
  };
}

interface SwapExerciseDialogProps {
  currentExercise: {
    id: string;
    exercise_id: string | null;
    is_placeholder: boolean;
    placeholder_id: string | null;
    exercises: { name: string } | null;
  };
  planId?: string; // Only passed when in plan context
  workoutId?: string; // Workout being edited
  athleteId?: string; // Only passed when in athlete context
  onSwap: (exerciseId: string, exercise: Exercise, replaceMode: 'single' | 'future' | 'all') => void;
  onClose: () => void;
}

export function SwapExerciseDialog({ currentExercise, planId, workoutId, athleteId, onSwap, onClose }: SwapExerciseDialogProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [futureInstanceCount, setFutureInstanceCount] = useState(0);
  const [totalInstanceCount, setTotalInstanceCount] = useState(0);
  const supabase = createClient();

  // 🔐 Permissions state
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'coach' | 'athlete'>('coach');
  const { permissions } = useStaffPermissions(userId);

  // Get unique tags and categories from exercises
  const allTags = Array.from(new Set(exercises.flatMap(ex => ex.tags || []))).sort();
  const allCategories = Array.from(new Set(exercises.map(ex => ex.category).filter(Boolean))).sort();

  // 🔐 Load user info and permissions
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
    if (userId) {
      fetchExercises();
      if (planId) {
        countInstancesInPlan();
      } else if (athleteId) {
        countInstancesForAthlete();
      }
    }
  }, [userId, userRole]);

  async function countInstancesInPlan() {
    if (!planId || !workoutId || (!currentExercise.exercise_id && !currentExercise.placeholder_id)) return;

    // Get current workout's week/day position
    const { data: currentProgramDay, error: currentError } = await supabase
      .from('program_days')
      .select('week_number, day_number')
      .eq('workout_id', workoutId)
      .single();

    if (currentError || !currentProgramDay) {
      console.error('Could not determine current workout position');
      return;
    }

    const currentWeek = currentProgramDay.week_number;
    const currentDay = currentProgramDay.day_number;

    // Get ALL program_days in the plan (for total count)
    const { data: allProgramDays } = await supabase
      .from('program_days')
      .select('workout_id')
      .eq('plan_id', planId);

    // Get only FUTURE program_days (including current workout)
    const { data: futureProgramDays } = await supabase
      .from('program_days')
      .select('workout_id')
      .eq('plan_id', planId)
      .or(`week_number.gt.${currentWeek},and(week_number.eq.${currentWeek},day_number.gte.${currentDay})`);

    if (!allProgramDays || !futureProgramDays) return;

    const allWorkoutIds = allProgramDays.map(pd => pd.workout_id).filter(Boolean);
    const futureWorkoutIds = futureProgramDays.map(pd => pd.workout_id).filter(Boolean);

    // Get routines for ALL workouts
    const { data: allRoutines } = await supabase
      .from('routines')
      .select('id')
      .in('workout_id', allWorkoutIds);

    // Get routines for FUTURE workouts
    const { data: futureRoutines } = await supabase
      .from('routines')
      .select('id')
      .in('workout_id', futureWorkoutIds);

    if (!allRoutines || !futureRoutines) return;

    const allRoutineIds = allRoutines.map(r => r.id);
    const futureRoutineIds = futureRoutines.map(r => r.id);

    // Build queries to match by exercise_id OR placeholder_id
    const buildQuery = (routineIds: string[]) => {
      let query = supabase
        .from('routine_exercises')
        .select('id')
        .in('routine_id', routineIds);

      if (currentExercise.is_placeholder && currentExercise.placeholder_id) {
        query = query.eq('placeholder_id', currentExercise.placeholder_id);
      } else if (currentExercise.exercise_id) {
        query = query.eq('exercise_id', currentExercise.exercise_id);
      }

      return query;
    };

    // Count total instances
    const { data: totalData } = await buildQuery(allRoutineIds);
    if (totalData) {
      setTotalInstanceCount(totalData.length);
    }

    // Count future instances
    const { data: futureData } = await buildQuery(futureRoutineIds);
    if (futureData) {
      setFutureInstanceCount(futureData.length);
    }
  }

  async function countInstancesForAthlete() {
    if (!athleteId || !workoutId || (!currentExercise.exercise_id && !currentExercise.placeholder_id)) return;

    // Get current workout's scheduled date
    const { data: currentInstance, error: currentError } = await supabase
      .from('workout_instances')
      .select('scheduled_date')
      .eq('workout_id', workoutId)
      .eq('athlete_id', athleteId)
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .single();

    if (currentError || !currentInstance) {
      console.error('Could not determine current workout position');
      return;
    }

    const currentDate = currentInstance.scheduled_date;

    // Get ALL workout instances for this athlete
    const { data: allInstances } = await supabase
      .from('workout_instances')
      .select('workout_id')
      .eq('athlete_id', athleteId);

    // Get FUTURE workout instances (including current date)
    const { data: futureInstances } = await supabase
      .from('workout_instances')
      .select('workout_id')
      .eq('athlete_id', athleteId)
      .gte('scheduled_date', currentDate);

    if (!allInstances || !futureInstances) return;

    const allWorkoutIds = allInstances.map(i => i.workout_id).filter(Boolean);
    const futureWorkoutIds = futureInstances.map(i => i.workout_id).filter(Boolean);

    // Get routines for ALL workouts
    const { data: allRoutines } = await supabase
      .from('routines')
      .select('id')
      .in('workout_id', allWorkoutIds);

    // Get routines for FUTURE workouts
    const { data: futureRoutines } = await supabase
      .from('routines')
      .select('id')
      .in('workout_id', futureWorkoutIds);

    if (!allRoutines || !futureRoutines) return;

    const allRoutineIds = allRoutines.map(r => r.id);
    const futureRoutineIds = futureRoutines.map(r => r.id);

    // Build query to match by exercise_id OR placeholder_id
    const buildQuery = (routineIds: string[]) => {
      let query = supabase
        .from('routine_exercises')
        .select('id')
        .in('routine_id', routineIds);

      if (currentExercise.is_placeholder && currentExercise.placeholder_id) {
        query = query.eq('placeholder_id', currentExercise.placeholder_id);
      } else if (currentExercise.exercise_id) {
        query = query.eq('exercise_id', currentExercise.exercise_id);
      }

      return query;
    };

    // Count total instances
    const { data: totalData } = await buildQuery(allRoutineIds);
    if (totalData) {
      setTotalInstanceCount(totalData.length);
    }

    // Count future instances
    const { data: futureData } = await buildQuery(futureRoutineIds);
    if (futureData) {
      setFutureInstanceCount(futureData.length);
    }
  }

  async function fetchExercises() {
    if (!userId) return;

    setLoading(true);

    // 🔐 Apply visibility filter
    const filter = await getContentFilter(userId, userRole, 'exercises');

    let query = supabase
      .from('exercises')
      .select('*')
      .eq('is_active', true)
      .eq('is_placeholder', false)
      .order('name');

    // 🔐 Apply creator filter based on permissions
    if (filter.filter === 'ids' && filter.creatorIds) {
      if (filter.creatorIds.length === 0) {
        setExercises([]);
        setLoading(false);
        return;
      }
      query = query.in('created_by', filter.creatorIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching exercises:', error);
    } else if (data) {
      // 🏷️ Apply tag filtering if staff has tag restrictions
      let filteredData = data;
      if (permissions?.allowed_exercise_tags && permissions.allowed_exercise_tags.length > 0) {
        const allowedTags = permissions.allowed_exercise_tags;
        filteredData = data.filter(exercise => {
          // Exercise must have at least one tag that matches the allowed tags
          if (!exercise.tags || exercise.tags.length === 0) return false;
          return exercise.tags.some(tag => allowedTags.includes(tag));
        });
        console.log(`🏷️ [SwapExerciseDialog] Tag filtering: ${data.length} → ${filteredData.length} exercises (allowed tags: ${allowedTags.join(', ')})`);
      }

      // Filter out system exercises (used for measurement/tag definitions)
      const userExercises = filteredData.filter(ex => !ex.tags?.includes('_system'));
      setExercises(userExercises);
    }

    setLoading(false);
  }

  // Filter exercises based on search and filters
  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || exercise.category === categoryFilter;
    const matchesTags = tagFilter === 'all' || (exercise.tags && exercise.tags.includes(tagFilter));
    return matchesSearch && matchesCategory && matchesTags;
  });

  function handleSwap(replaceMode: 'single' | 'future' | 'all') {
    if (!selectedExercise) {
      alert('Please select an exercise');
      return;
    }

    onSwap(selectedExercise.id, selectedExercise, replaceMode);
  }

  const currentExerciseName = currentExercise.is_placeholder
    ? `Placeholder: ${currentExercise.placeholder_id || 'Unknown'}`
    : currentExercise.exercises?.name || 'Unknown Exercise';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg w-full max-w-3xl h-[65vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">Replace Exercise</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Select a new exercise - all programming details will be preserved
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors ml-4 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-3 border-b border-white/10 flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 [&>option]:bg-gray-900 [&>option]:text-white"
            >
              <option value="all" className="bg-gray-900 text-white">All Categories</option>
              {allCategories.map(category => (
                <option key={category} value={category} className="bg-gray-900 text-white capitalize">
                  {category.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-3 py-1.5 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 [&>option]:bg-gray-900 [&>option]:text-white"
            >
              <option value="all" className="bg-gray-900 text-white">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag} className="capitalize bg-gray-900 text-white">{tag}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Exercise List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading exercises...</div>
          ) : filteredExercises.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">No exercises found</p>
              <p className="text-gray-500 text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredExercises.map(exercise => (
                <button
                  key={exercise.id}
                  onClick={() => setSelectedExercise(exercise)}
                  className={`text-left p-2.5 rounded border transition-all ${
                    selectedExercise?.id === exercise.id
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="font-medium text-white text-sm">{exercise.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-1.5 py-0.5 bg-white/10 rounded text-gray-400 capitalize">
                      {exercise.category.replace('_', ' ')}
                    </span>
                    {exercise.tags && exercise.tags.length > 0 && (
                      <span className="text-xs text-gray-500">
                        +{exercise.tags.length} tag{exercise.tags.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 space-y-3 flex-shrink-0">
          {/* Info about instances */}
          {(planId || athleteId) && (totalInstanceCount > 1 || futureInstanceCount > 1) && (
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded">
              <div className="text-blue-200 text-xs">
                Found <span className="font-medium">{totalInstanceCount} total instance{totalInstanceCount !== 1 ? 's' : ''}</span> of <span className="font-medium">"{currentExerciseName}"</span> {planId ? 'in this plan' : 'for this athlete'}
                {futureInstanceCount !== totalInstanceCount && (
                  <span className="ml-1">
                    (<span className="font-medium">{futureInstanceCount} future</span>, {totalInstanceCount - futureInstanceCount} past)
                  </span>
                )}
                . All programming details will be preserved.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded text-sm transition-colors border border-white/10"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {/* Show single replace button if no context OR only 1 instance */}
              {((!planId && !athleteId) || totalInstanceCount === 1) && (
                <button
                  onClick={() => handleSwap('single')}
                  disabled={!selectedExercise}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                >
                  Replace Exercise
                </button>
              )}

              {/* Show all three buttons if in plan OR athlete context with multiple instances */}
              {(planId || athleteId) && totalInstanceCount > 1 && (
                <>
                  <button
                    onClick={() => handleSwap('single')}
                    disabled={!selectedExercise}
                    className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white rounded text-sm font-medium transition-colors border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    This Only
                  </button>
                  {futureInstanceCount > 1 && (
                    <button
                      onClick={() => handleSwap('future')}
                      disabled={!selectedExercise}
                      className="px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600/80"
                    >
                      Future ({futureInstanceCount})
                    </button>
                  )}
                  <button
                    onClick={() => handleSwap('all')}
                    disabled={!selectedExercise}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                  >
                    All ({totalInstanceCount})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
