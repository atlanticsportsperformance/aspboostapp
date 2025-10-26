'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ExerciseWithLogs {
  routine_exercise_id: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string | null;
  superset_group: number | null;
  order_index: number;
  logs: any[];
}

export default function WorkoutViewPage() {
  const params = useParams();
  const athleteId = params.id as string;
  const instanceId = params['instance-id'] as string;

  const [loading, setLoading] = useState(true);
  const [instance, setInstance] = useState<any>(null);
  const [workout, setWorkout] = useState<any>(null);
  const [exercisesWithLogs, setExercisesWithLogs] = useState<ExerciseWithLogs[]>([]);

  useEffect(() => {
    async function loadWorkout() {
      const supabase = createClient();

      console.log('📖 [Workout View] Loading workout instance:', instanceId);

      try {
        // Step 1: Get workout instance
        const { data: instanceData, error: instanceError } = await supabase
          .from('workout_instances')
          .select('*')
          .eq('id', instanceId)
          .single();

        console.log('📖 [Workout View] Instance:', { instanceData, instanceError });

        if (instanceError || !instanceData) {
          console.error('Failed to load instance:', instanceError);
          setLoading(false);
          return;
        }

        setInstance(instanceData);

        // Step 2: Get workout details
        const { data: workoutData, error: workoutError } = await supabase
          .from('workouts')
          .select('*')
          .eq('id', instanceData.workout_id)
          .single();

        console.log('📖 [Workout View] Workout:', { workoutData, workoutError });

        if (workoutData) {
          setWorkout(workoutData);
        }

        // Step 3: Get all exercise logs for this instance (no nested queries)
        const { data: logsData, error: logsError } = await supabase
          .from('exercise_logs')
          .select('*')
          .eq('workout_instance_id', instanceId)
          .order('routine_exercise_id')
          .order('set_number');

        console.log('📖 [Workout View] Logs:', { logsData, logsError, count: logsData?.length });

        if (logsError) {
          console.error('📖 [Workout View] Error fetching logs:', logsError);
        }

        if (!logsData || logsData.length === 0) {
          console.warn('📖 [Workout View] No logs found for instance:', instanceId);
          console.log('📖 [Workout View] This means exercise_logs were not saved when the workout was completed');
          setLoading(false);
          return;
        }

        // Step 4: Get unique exercise and routine exercise IDs
        const exerciseIds = Array.from(new Set(logsData.map(log => log.exercise_id).filter(Boolean)));
        const routineExerciseIds = Array.from(new Set(logsData.map(log => log.routine_exercise_id).filter(Boolean)));

        console.log('📖 [Workout View] Extracted IDs:', { exerciseIds, routineExerciseIds });

        // Step 5: Fetch exercise details (just name for now)
        const { data: exercises, error: exercisesError } = await supabase
          .from('exercises')
          .select('id, name')
          .in('id', exerciseIds);

        console.log('📖 [Workout View] Exercises:', { exercises, exercisesError });

        if (exercisesError) {
          console.error('📖 [Workout View] Exercises error details:', exercisesError);
        }

        // Step 6: Fetch routine exercise details (no superset_group - doesn't exist)
        const { data: routineExercises, error: routineExercisesError } = await supabase
          .from('routine_exercises')
          .select('id, order_index')
          .in('id', routineExerciseIds);

        console.log('📖 [Workout View] Routine exercises:', { routineExercises, routineExercisesError });

        if (routineExercisesError) {
          console.error('📖 [Workout View] Routine exercises error details:', routineExercisesError);
        }

        // Step 7: Create lookup maps
        const exerciseMap = new Map((exercises || []).map(e => [e.id, e]));
        const routineExerciseMap = new Map((routineExercises || []).map(re => [re.id, re]));

        // Step 8: Group logs by routine_exercise_id
        const logsByExercise = new Map<string, any[]>();
        logsData.forEach(log => {
          const key = log.routine_exercise_id;
          if (!logsByExercise.has(key)) {
            logsByExercise.set(key, []);
          }
          logsByExercise.get(key)!.push(log);
        });

        // Step 9: Build the final data structure
        const combined: ExerciseWithLogs[] = [];
        logsByExercise.forEach((logs, routineExerciseId) => {
          const firstLog = logs[0];
          const exerciseData = exerciseMap.get(firstLog.exercise_id);
          const routineExerciseData = routineExerciseMap.get(routineExerciseId);

          console.log('📖 [Workout View] Processing exercise:', {
            routineExerciseId,
            exercise_id: firstLog.exercise_id,
            exerciseData,
            routineExerciseData
          });

          combined.push({
            routine_exercise_id: routineExerciseId,
            exercise_id: firstLog.exercise_id,
            exercise_name: exerciseData?.name || 'Unknown Exercise',
            muscle_group: null, // Removed muscle_group for now
            superset_group: routineExerciseData?.superset_group || null,
            order_index: routineExerciseData?.order_index || 0,
            logs: logs.sort((a, b) => a.set_number - b.set_number)
          });
        });

        // Sort by order_index
        combined.sort((a, b) => a.order_index - b.order_index);

        console.log('📖 [Workout View] Final combined data:', combined);
        setExercisesWithLogs(combined);

      } catch (error) {
        console.error('❌ [Workout View] Error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadWorkout();
  }, [instanceId]);

  const formatDate = (dateStr: string) => {
    // Parse date as local to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading workout...</p>
        </div>
      </div>
    );
  }

  if (!instance || !workout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Workout not found</p>
          <Link
            href={`/dashboard/athletes/${athleteId}`}
            className="text-[#9BDDFF] hover:underline"
          >
            Back to Athlete
          </Link>
        </div>
      </div>
    );
  }

  // Group exercises by superset
  const groupedExercises: { [key: string]: ExerciseWithLogs[] } = {};
  exercisesWithLogs.forEach(exercise => {
    const group = exercise.superset_group?.toString() || `single-${exercise.routine_exercise_id}`;
    if (!groupedExercises[group]) {
      groupedExercises[group] = [];
    }
    groupedExercises[group].push(exercise);
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/98 to-[#0A0A0A]/95 backdrop-blur-lg z-20 border-b border-white/10">
        <div className="px-4 py-4 lg:px-8 lg:py-6">
          {/* Back Button and Title */}
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/dashboard/athletes/${athleteId}`}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl lg:text-2xl font-bold text-white">{workout.name}</h1>
              <p className="text-sm text-gray-400">{formatDate(instance.scheduled_date)}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              instance.status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : instance.status === 'in_progress'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
            }`}>
              {instance.status === 'completed' ? '✓ Completed' : instance.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          {/* Workout Info */}
          {instance.completed_at && (
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Completed at {formatTime(instance.completed_at)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-8 py-6 space-y-4">
        {/* Workout Notes */}
        {instance.notes && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Workout Notes</h3>
            <p className="text-white">{instance.notes}</p>
          </div>
        )}

        {/* Exercises */}
        {Object.values(groupedExercises).map((group, groupIndex) => {
          const isSuperset = group.length > 1;

          return (
            <div
              key={groupIndex}
              className={`${isSuperset ? 'border-l-4 border-[#9BDDFF] pl-4' : ''}`}
            >
              {isSuperset && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-[#9BDDFF] uppercase tracking-wider">
                    Superset {group[0].superset_group}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {group.map((exercise) => {
                  const isComplete = exercise.logs.length > 0;

                  return (
                    <div
                      key={exercise.routine_exercise_id}
                      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                    >
                      {/* Exercise Header */}
                      <div className={`px-4 py-3 border-b border-white/10 ${
                        isComplete ? 'bg-green-500/5' : 'bg-white/5'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isComplete && (
                              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            <div>
                              <h3 className="text-white font-semibold">
                                {exercise.exercise_name}
                              </h3>
                              {exercise.muscle_group && (
                                <p className="text-xs text-gray-500 uppercase tracking-wider">
                                  {exercise.muscle_group}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-gray-400">{exercise.logs.length} sets</span>
                        </div>
                      </div>

                      {/* Sets */}
                      <div className="divide-y divide-white/5">
                        {exercise.logs.map((log) => (
                          <div key={log.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-400">Set {log.set_number}</span>
                              <div className="flex items-center gap-4">
                                {log.actual_weight !== null && (
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500">Weight</p>
                                    <p className="text-white font-semibold">{log.actual_weight} lbs</p>
                                  </div>
                                )}
                                {log.actual_reps !== null && (
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500">Reps</p>
                                    <p className="text-white font-semibold">{log.actual_reps}</p>
                                  </div>
                                )}
                                {log.actual_duration !== null && (
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500">Duration</p>
                                    <p className="text-white font-semibold">{log.actual_duration}s</p>
                                  </div>
                                )}
                                {log.actual_distance !== null && (
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500">Distance</p>
                                    <p className="text-white font-semibold">{log.actual_distance}m</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            {log.notes && (
                              <p className="text-sm text-gray-400 mt-2">{log.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {exercisesWithLogs.length === 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <p className="text-gray-400">No exercise data logged for this workout</p>
          </div>
        )}
      </div>
    </div>
  );
}
