'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface TrainingTabProps {
  athleteId: string;
}

type TimeFilter = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export default function TrainingTab({ athleteId }: TrainingTabProps) {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('3M');

  useEffect(() => {
    async function fetchWorkoutHistory() {
      const supabase = createClient();

      console.log('🔍 [Training History] Loading...');

      try {
        // Calculate date range based on time filter
        const now = new Date();
        let startDate = new Date();

        switch (timeFilter) {
          case '1M':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case '3M':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case '6M':
            startDate.setMonth(now.getMonth() - 6);
            break;
          case '1Y':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          case 'ALL':
            startDate = new Date(0); // Beginning of time
            break;
        }

        const startDateStr = startDate.toISOString().split('T')[0];

        // Step 1: Get workout instances (no nested selects)
        const { data: instances, error: instancesError } = await supabase
          .from('workout_instances')
          .select('*')
          .eq('athlete_id', athleteId)
          .gte('scheduled_date', startDateStr)
          .order('scheduled_date', { ascending: false });

        console.log('🔍 [Training History] Instances:', { instances, instancesError, count: instances?.length });

        if (instancesError) {
          console.error('Error fetching instances:', instancesError);
          setWorkouts([]);
          setLoading(false);
          return;
        }

        if (!instances || instances.length === 0) {
          console.log('🔍 [Training History] No instances found');
          setWorkouts([]);
          setLoading(false);
          return;
        }

        const instanceIds = instances.map(i => i.id);
        const workoutIds = Array.from(new Set(instances.map(i => i.workout_id).filter(Boolean)));

        // Step 2: Get workout details
        const { data: workoutDetails, error: workoutsError } = await supabase
          .from('workouts')
          .select('id, name')
          .in('id', workoutIds);

        console.log('🔍 [Training History] Workouts:', {
          workoutDetails,
          workoutsError,
          count: workoutDetails?.length
        });

        // Step 3: Get exercise logs for these instances
        const { data: exerciseLogs, error: logsError } = await supabase
          .from('exercise_logs')
          .select('id, workout_instance_id, routine_exercise_id, set_number, actual_reps, actual_weight')
          .in('workout_instance_id', instanceIds);

        console.log('🔍 [Training History] Exercise logs:', {
          exerciseLogs,
          count: exerciseLogs?.length
        });

        // Step 4: Create lookup maps
        const workoutMap = new Map((workoutDetails || []).map(w => [w.id, w]));

        // Step 5: Combine the data
        const workoutsWithLogs = instances.map(instance => ({
          ...instance,
          workouts: workoutMap.get(instance.workout_id) || null,
          exercise_logs: exerciseLogs?.filter(log => log.workout_instance_id === instance.id) || []
        }));

        console.log('✅ [Training History] Final workouts:', workoutsWithLogs.length);
        setWorkouts(workoutsWithLogs);
      } catch (error) {
        console.error('❌ [Training History] Error:', error);
        setWorkouts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkoutHistory();
  }, [athleteId, timeFilter]);

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      not_started: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      skipped: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    return styles[status as keyof typeof styles] || styles.not_started;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return '✓';
    if (status === 'in_progress') return '◐';
    if (status === 'skipped') return '✕';
    return '○';
  };

  const calculateSetCount = (exerciseLogs: any[]) => {
    return exerciseLogs?.length || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading training history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Filter Buttons */}
      <div className="flex gap-2 bg-black/40 rounded-lg p-1 w-fit">
        {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setTimeFilter(filter)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              timeFilter === filter
                ? 'bg-[#9BDDFF] text-black'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Workout List */}
      <div className="space-y-3">
        {workouts.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <p className="text-gray-400">No workout history found</p>
            <p className="text-gray-500 text-sm mt-2">Completed workouts will appear here</p>
          </div>
        ) : (
          workouts.map((workout) => {
            const setCount = calculateSetCount(workout.exercise_logs);
            const statusIcon = getStatusIcon(workout.status);

            // Calculate total volume (reps × weight)
            const totalVolume = workout.exercise_logs?.reduce((sum: number, log: any) => {
              const reps = log.actual_reps || 0;
              const weight = log.actual_weight || 0;
              return sum + (reps * weight);
            }, 0) || 0;

            // Count unique exercises
            const uniqueExercises = new Set(
              workout.exercise_logs?.map((log: any) => log.routine_exercise_id).filter(Boolean)
            ).size;

            return (
              <button
                key={workout.id}
                onClick={() => {
                  // Navigate to view page for completed workouts, execute page for in-progress
                  if (workout.status === 'completed') {
                    router.push(`/dashboard/athletes/${athleteId}/workouts/${workout.id}/view`);
                  } else if (workout.status === 'in_progress') {
                    router.push(`/dashboard/athletes/${athleteId}/workouts/${workout.id}/execute`);
                  }
                }}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 lg:p-5 transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left Side: Date and Workout Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-gray-400 text-sm font-medium">
                        {(() => {
                          // Parse date as local to avoid timezone issues
                          const [year, month, day] = workout.scheduled_date.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });
                        })()}
                      </div>
                    </div>
                    <h3 className="text-white font-semibold text-lg group-hover:text-[#9BDDFF] transition-colors">
                      {workout.workouts?.name || 'Unnamed Workout'}
                    </h3>

                    {/* Workout Metrics Row */}
                    {setCount > 0 && (
                      <div className="flex flex-wrap items-center gap-4 mt-3">
                        {uniqueExercises > 0 && (
                          <span className="text-sm text-gray-300">
                            <span className="text-gray-500">Exercises:</span> <span className="font-semibold">{uniqueExercises}</span>
                          </span>
                        )}
                        <span className="text-sm text-gray-300">
                          <span className="text-gray-500">Sets:</span> <span className="font-semibold">{setCount}</span>
                        </span>
                        {totalVolume > 0 && (
                          <span className="text-sm text-gray-300">
                            <span className="text-gray-500">Volume:</span> <span className="font-semibold">{(totalVolume / 1000).toFixed(1)}k lbs</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Side: Status */}
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusBadge(workout.status)}`}>
                      {statusIcon} {workout.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Workout Notes */}
                {workout.notes && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-gray-400 text-sm line-clamp-2">{workout.notes}</p>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
