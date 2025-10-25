'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WorkoutExecutionPage() {
  const params = useParams();
  const athleteId = params?.id as string;
  const instanceId = params?.['instance-id'] as string;
  const router = useRouter();
  const supabase = createClient();

  const [instance, setInstance] = useState<any>(null);
  const [workout, setWorkout] = useState<any>(null);
  const [routines, setRoutines] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false); // For expanding FAB menu
  // Shared athlete maxes state for all exercises in this workout
  const [sharedAthleteMaxes, setSharedAthleteMaxes] = useState<Record<string, Record<string, number>>>({});
  // Persistent input state for all exercises (keyed by exercise ID)
  const [exerciseInputs, setExerciseInputs] = useState<Record<string, Array<any>>>({});

  useEffect(() => {
    if (instanceId) {
      fetchData();
    }
  }, [instanceId]);

  useEffect(() => {
    let interval: any;
    if (timerActive) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  async function fetchData() {
    const { data: inst } = await supabase
      .from('workout_instances')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (!inst) return;
    setInstance(inst);

    // Fetch logs first
    const { data: logData } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('workout_instance_id', instanceId)
      .order('logged_at');

    setLogs(logData || []);

    const { data: wo } = await supabase
      .from('workouts')
      .select(`
        *,
        routines (
          *,
          routine_exercises (
            *,
            exercises (*)
          )
        )
      `)
      .eq('id', inst.workout_id)
      .single();

    if (wo) {
      setWorkout(wo);
      const sorted = (wo.routines || []).sort((a: any, b: any) => a.order_index - b.order_index);

      sorted.forEach((routine: any) => {
        if (routine.routine_exercises) {
          routine.routine_exercises.sort((a: any, b: any) => a.order_index - b.order_index);
        }
      });

      setRoutines(sorted);

      // Auto-expand first incomplete exercise
      if (!expandedExerciseId) {
        const firstIncomplete = sorted
          .flatMap((r: any) => r.routine_exercises || [])
          .find((ex: any) => {
            const exLogs = (logData || []).filter((l: any) => l.routine_exercise_id === ex.id);
            return exLogs.length < (ex.sets || 1);
          });
        if (firstIncomplete) {
          setExpandedExerciseId(firstIncomplete.id);
        }
      }
    }
  }

  async function startWorkout() {
    await supabase
      .from('workout_instances')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', instanceId);

    setInstance({ ...instance, status: 'in_progress' });
    setTimerActive(true);
  }

  async function completeWorkout() {
    // First, save all exercises with their current inputs (like hitting "Next" on each)
    const allExercises = routines.flatMap(r => r.routine_exercises || []);

    for (const exercise of allExercises) {
      const targetSets = exercise.sets || 3;
      const exLogs = logs.filter((l: any) => l.routine_exercise_id === exercise.id);
      const measurements = exercise.exercises?.metric_schema?.measurements || [];

      // Get persisted inputs for this exercise, or create empty ones
      const inputs = exerciseInputs[exercise.id] || [];

      for (let i = 0; i < targetSets; i++) {
        const setNumber = i + 1;
        const setData = inputs[i] || {};
        const existingLog = exLogs.find((log: any) => log.set_number === setNumber);

        // Prepare log data - use inputted values or 0s
        const logData = {
          actual_reps: setData.reps > 0 ? setData.reps : null,
          actual_weight: setData.weight > 0 ? setData.weight : null,
          actual_duration_seconds: setData.time > 0 ? setData.time : null,
          actual_rpe: setData.rpe > 0 ? setData.rpe : null,
          notes: setData.notes || null
        };

        if (existingLog) {
          // Update existing log
          await supabase
            .from('exercise_logs')
            .update(logData)
            .eq('id', existingLog.id);
        } else {
          // Create new log
          await supabase.from('exercise_logs').insert({
            workout_instance_id: instanceId,
            routine_exercise_id: exercise.id,
            athlete_id: athleteId,
            exercise_id: exercise.exercise_id,
            set_number: setNumber,
            target_sets: targetSets,
            target_reps: setData.targetReps || null,
            target_weight: setData.targetWeight || null,
            target_duration_seconds: setData.targetTime || null,
            target_intensity_percent: setData.intensityPercent || null,
            ...logData
          });
        }
      }
    }

    // Then mark workout as completed
    await supabase
      .from('workout_instances')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', instanceId);

    setTimerActive(false);
    router.push(`/dashboard/athletes/${athleteId}`);
  }

  const allExercises = routines.flatMap(r => r.routine_exercises || []);
  const completed = allExercises.filter((ex: any) =>
    logs.filter(l => l.routine_exercise_id === ex.id).length >= (ex.sets || 1)
  ).length;

  function getYouTubeVideoId(url: string | null | undefined): string | null {
    if (!url) return null;

    // Extract video ID from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      return match[2];
    }

    return null;
  }

  function getYouTubeThumbnail(videoId: string | null): string | null {
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }

  if (!workout || !instance) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#C9A857] border-r-transparent mb-4"></div>
          <p className="text-gray-400">Loading workout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-4">
      {/* Immersive Header - Ultra Compact for Mobile */}
      <div className="sticky top-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/98 to-[#0A0A0A]/95 backdrop-blur-lg z-20">
        <div className="px-3 py-2 md:px-4 md:py-3">
          {/* Single compact row - Exit, Title, Timer */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <Link
              href={`/dashboard/athletes/${athleteId}`}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all group"
              title="Exit workout"
            >
              <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>

            <div className="flex-1 min-w-0 text-center">
              <h1 className="text-sm md:text-base font-bold leading-tight truncate">{workout.name}</h1>
              <p className="text-[10px] text-gray-500">{instance.scheduled_date}</p>
            </div>

            {instance.status === 'in_progress' && (
              <div className="flex-shrink-0 flex items-center gap-1.5 bg-[#C9A857]/10 border border-[#C9A857]/30 rounded-full px-2.5 py-1">
                <svg className="w-3 h-3 text-[#C9A857]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-mono font-bold text-[#C9A857] tabular-nums">
                  {Math.floor(timer/60)}:{(timer%60).toString().padStart(2,'0')}
                </span>
              </div>
            )}
          </div>

          {/* Ultra-thin Progress Bar */}
          {instance.status === 'in_progress' && allExercises.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/5 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#C9A857] to-green-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{width: `${allExercises.length > 0 ? (completed/allExercises.length)*100 : 0}%`}}
                />
              </div>
              <span className="text-[10px] font-semibold text-[#C9A857] tabular-nums whitespace-nowrap">
                {completed}/{allExercises.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {instance.status === 'not_started' && (
          <div className="text-center py-16 px-4">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center border border-green-500/30">
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-3">Ready to go?</h2>
              <p className="text-gray-400 mb-8">Press start when you're ready to begin your workout session.</p>
              {/* Preview exercise count */}
              <div className="flex items-center justify-center gap-6 text-sm text-gray-400 mb-8">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>{allExercises.length} exercises</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>{routines.length} {routines.length === 1 ? 'block' : 'blocks'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {instance.status === 'in_progress' && (
          <div className="space-y-3">
            {routines.map((routine, routineIdx) => {
              const hasBlockTitle = routine.name && routine.name.toLowerCase() !== 'exercise';

              return (
                <div key={routine.id} className="relative">
                  {/* Visual grouping - Left border for ALL blocks */}
                  <div className="border-l-4 border-[#C9A857] pl-4">
                    {/* Block Header - Show if name is NOT "Exercise" */}
                    {hasBlockTitle && (
                      <div className="mb-2 -ml-4 pl-4">
                        <h3 className="text-sm font-bold text-[#C9A857] uppercase tracking-wide">
                          {routine.name}
                        </h3>
                        {routine.description && (
                          <p className="text-xs text-gray-400 mt-1">{routine.description}</p>
                        )}
                        {routine.notes && (
                          <p className="text-xs text-gray-300 mt-1 italic">{routine.notes}</p>
                        )}
                      </div>
                    )}

                    {/* Exercise Cards - Grouped tightly by block */}
                    <div className="space-y-0.5">
                      {(routine.routine_exercises || []).map((exercise: any, exerciseIdx: number) => {
                    const videoId = getYouTubeVideoId(exercise.exercises?.video_url);
                    // Generate exercise code (A1, A2, B1, etc.)
                    const letter = String.fromCharCode(65 + routineIdx); // A, B, C, etc.
                    const number = exerciseIdx + 1;
                    const exerciseCode = `${letter}${number}`;

                    return (
                      <ExerciseAccordionCard
                        key={exercise.id}
                        exercise={exercise}
                        exerciseCode={exerciseCode}
                        athleteId={athleteId}
                        instanceId={instanceId}
                        logs={logs}
                        isExpanded={expandedExerciseId === exercise.id}
                        onToggle={() => setExpandedExerciseId(expandedExerciseId === exercise.id ? null : exercise.id)}
                        onUpdate={fetchData}
                        onMoveNext={() => {
                          const currentIdx = allExercises.findIndex((ex: any) => ex.id === exercise.id);
                          if (currentIdx >= 0 && currentIdx < allExercises.length - 1) {
                            setExpandedExerciseId(allExercises[currentIdx + 1].id);
                          } else {
                            setExpandedExerciseId(null);
                          }
                        }}
                        videoId={videoId}
                        persistedInputs={exerciseInputs[exercise.id]}
                        onInputsChange={(inputs: any[]) => {
                          setExerciseInputs(prev => ({
                            ...prev,
                            [exercise.id]: inputs
                          }));
                        }}
                        thumbnail={getYouTubeThumbnail(videoId)}
                        sharedAthleteMaxes={sharedAthleteMaxes}
                        onMaxUpdate={(exerciseId: string, metricId: string, maxValue: number) => {
                          setSharedAthleteMaxes(prev => ({
                            ...prev,
                            [exerciseId]: {
                              ...prev[exerciseId],
                              [metricId]: maxValue
                            }
                          }));
                        }}
                        onLogsUpdate={(newLogsForExercise: any[]) => {
                          setLogs(prevLogs => {
                            // Remove old logs for this exercise and add new ones
                            const otherLogs = prevLogs.filter(log => log.routine_exercise_id !== exercise.id);
                            return [...otherLogs, ...newLogsForExercise];
                          });
                        }}
                      />
                    );
                  })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) - Mobile optimized */}
      {instance.status === 'in_progress' && (
        <>
          {/* Backdrop when menu is open */}
          {showFabMenu && (
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setShowFabMenu(false)}
            />
          )}

          {/* FAB Menu */}
          <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3">
            {/* Expanded menu options */}
            {showFabMenu && (
              <div className="flex flex-col gap-2 items-end animate-in slide-in-from-bottom-2 fade-in duration-200">
                <button
                  onClick={async () => {
                    setShowFabMenu(false);
                    if (confirm('Are you sure you want to restart this workout? All logged sets and timer will be reset.')) {
                      await supabase
                        .from('exercise_logs')
                        .delete()
                        .eq('workout_instance_id', instanceId);

                      await supabase
                        .from('workout_instances')
                        .update({ started_at: new Date().toISOString() })
                        .eq('id', instanceId);

                      setTimer(0);
                      fetchData();
                    }
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-full font-medium text-sm transition-all shadow-lg backdrop-blur-xl"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Restart Workout
                </button>
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    completeWorkout();
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white rounded-full font-bold text-sm transition-all shadow-lg shadow-blue-500/30"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete Workout
                </button>
              </div>
            )}

            {/* Main FAB button */}
            <button
              onClick={() => setShowFabMenu(!showFabMenu)}
              className={`w-14 h-14 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold shadow-2xl shadow-green-500/40 transition-all flex items-center justify-center ${
                showFabMenu ? 'rotate-45' : ''
              }`}
            >
              {showFabMenu ? (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>
        </>
      )}

      {/* Start Button - Centered */}
      {instance.status === 'not_started' && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/98 to-transparent backdrop-blur-lg p-4 pb-6 safe-area-inset-bottom z-30">
          <button
            onClick={startWorkout}
            className="w-full max-w-md mx-auto block py-4 px-8 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 active:scale-95 text-black rounded-xl font-bold text-lg transition-all shadow-lg shadow-green-500/30"
          >
            Start Workout
          </button>
        </div>
      )}
    </div>
  );
}

// Exercise.com-style Accordion Card
function ExerciseAccordionCard({ exercise, exerciseCode, athleteId, instanceId, logs, isExpanded, onToggle, onUpdate, onMoveNext, videoId, thumbnail, sharedAthleteMaxes, onMaxUpdate, onLogsUpdate, persistedInputs, onInputsChange }: any) {
  const supabase = createClient();

  const targetSets = exercise.sets || 3;
  const hasPerSetConfig = exercise.set_configurations && exercise.set_configurations.length > 0;
  const exLogs = logs.filter((l: any) => l.routine_exercise_id === exercise.id);
  const isComplete = exLogs.length >= targetSets;

  // Use shared maxes for THIS exercise, or fetch if not yet available
  const athleteMaxes = sharedAthleteMaxes[exercise.exercise_id] || {};
  const [setInputs, setSetInputs] = useState<Array<any>>([]);
  const [saving, setSaving] = useState(false);

  // Get display info - only show metrics that are enabled
  const firstSet = hasPerSetConfig ? exercise.set_configurations[0] : null;
  const enabledMeasurementIds = exercise.enabled_measurements || [];

  // Only show reps if it's in enabled_measurements (or if enabled_measurements is empty/null - fallback to showing all)
  const showReps = enabledMeasurementIds.length === 0 || enabledMeasurementIds.includes('reps');
  const showWeight = enabledMeasurementIds.length === 0 || enabledMeasurementIds.includes('weight');

  const displayReps = showReps ? (firstSet?.metric_values?.reps || exercise.metric_targets?.reps || 0) : null;
  const displayWeight = showWeight ? (firstSet?.metric_values?.weight || exercise.metric_targets?.weight) : null;
  const displayIntensity = firstSet?.intensity_targets?.[0]?.percent || exercise.intensity_targets?.[0]?.percent;

  useEffect(() => {
    if (isExpanded) {
      initializeSets();
      if (exercise.exercise_id) {
        fetchAthleteMaxes();
      }
    }
  }, [isExpanded, exercise.id]);

  // Recalculate TARGET weights when athlete maxes change (for live % updates)
  // BUT preserve user inputs
  useEffect(() => {
    if (isExpanded && Object.keys(athleteMaxes).length > 0 && setInputs.length > 0) {
      const updatedSets = setInputs.map((setData, idx) => {
        // Only update target weight if this set has an intensity percent
        if (setData.intensityPercent) {
          let newTargetWeight = 0;

          // Check per-set config first
          if (hasPerSetConfig && exercise.set_configurations[idx]) {
            const setConfig = exercise.set_configurations[idx];
            const intensityTargets = setConfig.intensity_targets || [];
            const firstIntensity = intensityTargets[0];
            if (firstIntensity && athleteMaxes[firstIntensity.metric]) {
              newTargetWeight = Math.round((athleteMaxes[firstIntensity.metric] * firstIntensity.percent / 100) / 5) * 5;
            }
          } else {
            // Check simple mode intensity
            const intensityMetric = exercise.intensity_targets?.[0]?.metric;
            if (intensityMetric && athleteMaxes[intensityMetric]) {
              newTargetWeight = Math.round((athleteMaxes[intensityMetric] * setData.intensityPercent / 100) / 5) * 5;
            }
          }

          // Only update if we calculated a valid target weight
          if (newTargetWeight > 0) {
            return {
              ...setData,
              targetWeight: newTargetWeight,
              // Only update actual weight if it's still 0 or was the old target
              weight: (setData.weight === 0 || setData.weight === setData.targetWeight) ? newTargetWeight : setData.weight
            };
          }
        }

        return setData;
      });

      setSetInputs(updatedSets);
    }
  }, [athleteMaxes]);

  async function fetchAthleteMaxes() {
    const { data } = await supabase
      .from('athlete_maxes')
      .select('metric_id, max_value')
      .eq('athlete_id', athleteId)
      .eq('exercise_id', exercise.exercise_id)
      .order('achieved_on', { ascending: false });

    if (data) {
      const maxes: Record<string, number> = {};
      data.forEach((m: any) => {
        if (!maxes[m.metric_id]) {
          maxes[m.metric_id] = m.max_value;
        }
      });

      // Update shared state for this exercise
      data.forEach((m: any) => {
        if (!maxes[m.metric_id]) {
          onMaxUpdate(exercise.exercise_id, m.metric_id, m.max_value);
        }
      });

      // Also update for each metric
      Object.entries(maxes).forEach(([metricId, maxValue]) => {
        onMaxUpdate(exercise.exercise_id, metricId, maxValue);
      });
    }
  }

  function initializeSets() {
    const initialSets = [];
    const allMeasurements = exercise.exercises?.metric_schema?.measurements || [];

    // Get measurements to work with based on enabled_measurements
    let measurements = [];
    let enabledMeasurementIds = new Set<string>();

    if (exercise.enabled_measurements && exercise.enabled_measurements.length > 0) {
      // If enabled_measurements is specified, use those IDs
      enabledMeasurementIds = new Set(exercise.enabled_measurements);

      // Create measurement objects for each enabled ID (matching rendering logic)
      measurements = exercise.enabled_measurements.map((measurementId: string) => {
        const existing = allMeasurements.find((m: any) => m.id === measurementId);
        if (existing) {
          return existing;
        }
        // Create basic measurement object if not in schema
        return {
          id: measurementId,
          name: measurementId.charAt(0).toUpperCase() + measurementId.slice(1).replace(/_/g, ' '),
          type: 'number',
          unit: measurementId === 'weight' ? 'lbs' : (measurementId === 'reps' ? 'reps' : '')
        };
      });
    } else {
      // If no enabled_measurements, use all from schema
      measurements = allMeasurements;
      enabledMeasurementIds = new Set(allMeasurements.map((m: any) => m.id));
    }

    // If we have persisted inputs, clean them to remove disabled measurements
    if (persistedInputs && persistedInputs.length > 0) {
      const cleanedInputs = persistedInputs.map((setData: any) => {
        const cleaned: any = {
          notes: setData.notes || '',
          isAMRAP: setData.isAMRAP || false,
          intensityPercent: setData.intensityPercent || null,
          intensityMetric: setData.intensityMetric || null,
          setNotes: setData.setNotes || ''
        };

        // Only keep values for enabled measurements
        Object.keys(setData).forEach((key) => {
          if (enabledMeasurementIds.has(key) || key.startsWith('target')) {
            cleaned[key] = setData[key];
          }
        });

        return cleaned;
      });

      setSetInputs(cleanedInputs);
      return;
    }

    for (let i = 0; i < targetSets; i++) {
      const setNumber = i + 1;
      const existingLog = exLogs.find((log: any) => log.set_number === setNumber);

      // Start with empty set data
      const setData: any = {
        notes: '',
        isAMRAP: false,
        intensityPercent: null,
        intensityMetric: null,
        setNotes: ''
      };

      if (existingLog) {
        // Load from existing log - populate ONLY ENABLED measurements dynamically
        measurements.forEach((measurement: any) => {
          const metricId = measurement.id;
          // Map from exercise_logs columns to metric IDs
          if (metricId === 'reps') {
            setData[metricId] = existingLog.actual_reps || 0;
          } else if (metricId === 'weight') {
            setData[metricId] = existingLog.actual_weight || 0;
          } else if (metricId === 'time') {
            setData[metricId] = existingLog.actual_duration_seconds || 0;
          } else {
            // For custom metrics, check if stored in a custom field
            setData[metricId] = existingLog[`actual_${metricId}`] || 0;
          }
        });
        setData.notes = existingLog.notes || '';
      } else if (hasPerSetConfig) {
        // Per-set configuration mode
        const setConfig = exercise.set_configurations[i];

        // Get intensity targets for this set (could be multiple metrics with intensity %)
        const intensityTargets = setConfig?.intensity_targets || [];

        // Store the first intensity % found (for display badge)
        const firstIntensity = intensityTargets.length > 0 ? intensityTargets[0] : null;
        if (firstIntensity) {
          setData.intensityPercent = firstIntensity.percent;
          setData.intensityMetric = firstIntensity.metric;
        }

        // Populate ONLY ENABLED measurements from set_configurations
        measurements.forEach((measurement: any) => {
          const metricId = measurement.id;
          const baseValue = setConfig?.metric_values?.[metricId] || 0;

          // Check if this metric has intensity percentage applied
          const intensityForMetric = intensityTargets.find((it: any) => it.metric === metricId);

          if (intensityForMetric) {
            const athleteMax = athleteMaxes[metricId] || 0;
            if (athleteMax > 0) {
              // Calculate percentage-based value
              const calculated = Math.round((athleteMax * intensityForMetric.percent / 100) / 5) * 5;
              setData[metricId] = calculated;
              setData[`target${metricId.charAt(0).toUpperCase() + metricId.slice(1)}`] = calculated;
            } else {
              setData[metricId] = baseValue;
              setData[`target${metricId.charAt(0).toUpperCase() + metricId.slice(1)}`] = baseValue;
            }
          } else {
            setData[metricId] = baseValue;
            setData[`target${metricId.charAt(0).toUpperCase() + metricId.slice(1)}`] = baseValue;
          }
        });

        setData.isAMRAP = setConfig?.is_amrap || false;
        setData.setNotes = setConfig?.notes || '';
      } else {
        // Simple mode - all sets use same targets
        const intensityPercent = exercise.intensity_targets?.[0]?.percent;
        const intensityMetric = exercise.intensity_targets?.[0]?.metric;

        // Populate ONLY ENABLED measurements from metric_targets
        measurements.forEach((measurement: any) => {
          const metricId = measurement.id;
          const baseValue = exercise.metric_targets?.[metricId] || 0;

          // Check if this metric uses intensity percentage
          if (intensityMetric === metricId && intensityPercent) {
            const athleteMax = athleteMaxes[metricId] || 0;
            if (athleteMax > 0) {
              // Calculate percentage-based value
              const calculated = Math.round((athleteMax * intensityPercent / 100) / 5) * 5;
              setData[metricId] = calculated;
              setData[`target${metricId.charAt(0).toUpperCase() + metricId.slice(1)}`] = calculated;
            } else {
              setData[metricId] = baseValue;
              setData[`target${metricId.charAt(0).toUpperCase() + metricId.slice(1)}`] = baseValue;
            }

            setData.intensityPercent = intensityPercent;
            setData.intensityMetric = metricId;
          } else {
            setData[metricId] = baseValue;
            setData[`target${metricId.charAt(0).toUpperCase() + metricId.slice(1)}`] = baseValue;
          }
        });

        setData.isAMRAP = exercise.is_amrap || false;
      }

      initialSets.push(setData);
    }

    setSetInputs(initialSets);
  }

  async function saveAllSets() {
    setSaving(true);

    for (let i = 0; i < targetSets; i++) {
      const setNumber = i + 1;
      const setData = setInputs[i];
      if (!setData) continue;

      const existingLog = exLogs.find((log: any) => log.set_number === setNumber);

      if (existingLog) {
        await supabase
          .from('exercise_logs')
          .update({
            actual_reps: setData.reps > 0 ? setData.reps : null,
            actual_weight: setData.weight > 0 ? setData.weight : null,
            actual_duration_seconds: setData.time > 0 ? setData.time : null,
            notes: setData.notes || null
          })
          .eq('id', existingLog.id);
      } else {
        await supabase.from('exercise_logs').insert({
          workout_instance_id: instanceId,
          routine_exercise_id: exercise.id,
          athlete_id: athleteId,
          exercise_id: exercise.exercise_id,
          set_number: setNumber,
          target_sets: targetSets,
          target_reps: setData.targetReps,
          target_weight: setData.targetWeight,
          target_duration_seconds: setData.time || null,
          target_intensity_percent: setData.intensityPercent,
          actual_reps: setData.reps > 0 ? setData.reps : null,
          actual_weight: setData.weight > 0 ? setData.weight : null,
          actual_duration_seconds: setData.time > 0 ? setData.time : null,
          notes: setData.notes || null
        });
      }
    }

    setSaving(false);
    await onUpdate();
  }

  async function saveAndMoveNext() {
    setSaving(true);

    // Save all sets first and collect new logs
    const newLogs = [];
    for (let i = 0; i < targetSets; i++) {
      const setNumber = i + 1;
      const setData = setInputs[i];
      if (!setData) continue;

      const existingLog = exLogs.find((log: any) => log.set_number === setNumber);

      if (existingLog) {
        await supabase
          .from('exercise_logs')
          .update({
            actual_reps: setData.reps > 0 ? setData.reps : null,
            actual_weight: setData.weight > 0 ? setData.weight : null,
            actual_duration_seconds: setData.time > 0 ? setData.time : null,
            notes: setData.notes || null
          })
          .eq('id', existingLog.id);

        // Update existing log in memory
        newLogs.push({
          ...existingLog,
          actual_reps: setData.reps > 0 ? setData.reps : null,
          actual_weight: setData.weight > 0 ? setData.weight : null,
          actual_duration_seconds: setData.time > 0 ? setData.time : null,
          notes: setData.notes || null
        });
      } else {
        const { data: insertedLog } = await supabase.from('exercise_logs').insert({
          workout_instance_id: instanceId,
          routine_exercise_id: exercise.id,
          athlete_id: athleteId,
          exercise_id: exercise.exercise_id,
          set_number: setNumber,
          target_sets: targetSets,
          target_reps: setData.targetReps,
          target_weight: setData.targetWeight,
          target_duration_seconds: setData.time || null,
          target_intensity_percent: setData.intensityPercent,
          actual_reps: setData.reps > 0 ? setData.reps : null,
          actual_weight: setData.weight > 0 ? setData.weight : null,
          actual_duration_seconds: setData.time > 0 ? setData.time : null,
          notes: setData.notes || null
        }).select().single();

        if (insertedLog) {
          newLogs.push(insertedLog);
        }
      }
    }

    // Update parent logs state so other exercises see these logs
    if (newLogs.length > 0 && onLogsUpdate) {
      onLogsUpdate(newLogs);
    }

    // Auto-save max if exercise is marked to track as PR
    if (isTrackingPR && exercise.tracked_max_metrics && exercise.tracked_max_metrics.length > 0) {
      // Loop through each metric that's being tracked as a max
      for (const metricId of exercise.tracked_max_metrics) {
        // Find highest value logged across all sets for this metric
        const maxValue = Math.max(...setInputs.map((s: any) => s[metricId] || 0));

        if (maxValue > 0) {
          // Check current max from athlete_maxes
          const { data: currentMaxData } = await supabase
            .from('athlete_maxes')
            .select('max_value')
            .eq('athlete_id', athleteId)
            .eq('exercise_id', exercise.exercise_id)
            .eq('metric_id', metricId)
            .eq('reps_at_max', 1)
            .order('achieved_on', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get metric display name and unit
          const measurement = exercise.exercises?.metric_schema?.measurements?.find((m: any) => m.id === metricId);
          const metricName = measurement?.name || metricId;
          const metricUnit = measurement?.unit || '';

          // If lower than previous max, show warning but allow
          if (currentMaxData && maxValue < currentMaxData.max_value) {
            const proceed = confirm(
              `New max (${maxValue} ${metricUnit}) is lower than previous max (${currentMaxData.max_value} ${metricUnit}) for ${metricName}.\n\nSave anyway?`
            );
            if (!proceed) {
              continue; // Skip this metric, continue with others
            }
          }

          // Save to athlete_maxes
          // ALWAYS INSERT new record for historical tracking
          // The unique constraint will prevent duplicates on same day
          const { error } = await supabase
            .from('athlete_maxes')
            .insert({
              athlete_id: athleteId,
              exercise_id: exercise.exercise_id,
              metric_id: metricId,
              max_value: maxValue,
              reps_at_max: 1,
              achieved_on: new Date().toISOString().split('T')[0],
              source: 'logged'
            });

          if (!error) {
            // Update shared state so ALL exercises in this workout see the new max
            onMaxUpdate(exercise.exercise_id, metricId, maxValue);
          } else {
            console.error(`Failed to save max for ${metricName}:`, error);
            alert(`Failed to save max for ${metricName}: ${error.message}`);
          }
        }
      }
    }

    setSaving(false);
    // Move to next without refetching
    onMoveNext();
  }

  function updateSetInput(setNumber: number, field: string, value: any) {
    const newInputs = [...setInputs];
    newInputs[setNumber - 1] = {
      ...newInputs[setNumber - 1],
      [field]: value
    };
    setSetInputs(newInputs);
    // Persist to parent state
    if (onInputsChange) {
      onInputsChange(newInputs);
    }
  }

  // Check if this exercise is marked to track as PR
  const isTrackingPR = exercise.tracked_max_metrics && exercise.tracked_max_metrics.length > 0;

  return (
    <div className={`bg-white/5 border-2 rounded-xl overflow-hidden transition-all ${
      isComplete ? 'border-green-500/40' :
      isTrackingPR ? 'border-[#C9A857] shadow-lg shadow-[#C9A857]/20' :
      'border-white/10'
    }`}>
      {/* Collapsed Header - Exercise.com Style */}
      <button
        onClick={onToggle}
        className="w-full p-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors"
      >
        {/* Thumbnail */}
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={exercise.exercises?.name}
            className="w-16 h-12 object-cover rounded"
          />
        ) : (
          <div className="w-16 h-12 bg-white/10 rounded flex items-center justify-center">
            <span className="text-xl">💪</span>
          </div>
        )}

        {/* Exercise Info */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-blue-400 font-bold">{exerciseCode}</span>
            {exercise.exercises?.name && (
              <h3 className="font-semibold text-base">{exercise.exercises.name}</h3>
            )}
            {isTrackingPR && (
              <span className="text-[10px] px-1.5 py-0.5 bg-[#C9A857]/20 text-[#C9A857] rounded font-bold border border-[#C9A857]/40">
                🏆 PR
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {targetSets} sets
            {displayReps !== null && ` × ${displayReps} reps`}
            {displayWeight && ` • ${displayWeight} lbs`}
            {displayIntensity && ` • ${displayIntensity}%`}
          </p>
          {/* Show which sets are completed */}
          <div className="flex gap-1 mt-1">
            {Array.from({ length: targetSets }, (_, i) => {
              const setNumber = i + 1;
              const isLogged = exLogs.some((log: any) => log.set_number === setNumber);
              return (
                <div
                  key={setNumber}
                  className={`w-6 h-1 rounded-full ${
                    isLogged ? 'bg-green-500' : 'bg-white/20'
                  }`}
                  title={`Set ${setNumber}${isLogged ? ' - Completed' : ''}`}
                />
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {isComplete && (
            <span className="text-green-400 font-semibold text-sm">✓</span>
          )}
          <span className="text-xs text-gray-400">{exLogs.length}/{targetSets}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/10 p-2.5">
          {/* Desktop: 2-column layout (video/notes | sets) */}
          {/* Mobile: Stacked layout */}
          <div className="lg:grid lg:grid-cols-[380px_1fr] lg:gap-4">
            {/* Left Column: Video & Notes (Desktop) / Top (Mobile) */}
            <div className="lg:sticky lg:top-4 lg:self-start">
              {/* YouTube Video */}
              {videoId && (
                <div className="mb-2">
                  <div className="aspect-video w-full">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      className="w-full h-full rounded"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Exercise Notes from Exercise Library */}
              {exercise.exercises?.description && (
                <div className="mb-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                  <p className="text-[9px] text-blue-400 font-semibold mb-0.5 uppercase">Exercise Notes</p>
                  <p className="text-xs text-gray-200 whitespace-pre-wrap leading-tight">{exercise.exercises.description}</p>
                </div>
              )}

              {/* Coach Notes from Workout Builder */}
              {exercise.notes && (
                <div className="mb-2 p-2 bg-[#C9A857]/10 border border-[#C9A857]/30 rounded">
                  <p className="text-[9px] text-[#C9A857] font-semibold mb-0.5 uppercase">Coach Notes</p>
                  <p className="text-xs text-gray-200 leading-tight">{exercise.notes}</p>
                </div>
              )}
            </div>

            {/* Right Column: Sets (Desktop) / Below video (Mobile) */}
            <div>

          {/* Sets - Always show */}
          <div className="space-y-1.5 mb-2">
            {Array.from({ length: targetSets }, (_, i) => {
              const setNumber = i + 1;
              const isLogged = exLogs.some((log: any) => log.set_number === setNumber);
              const setData = setInputs[i] || {};
              const isAMRAP = setData.isAMRAP || false;

              return (
                <div
                  key={setNumber}
                  className={`p-2 rounded border ${
                    isLogged ? 'bg-green-500/5 border-green-500/40' : 'bg-[#1a1a1a] border-white/10'
                  }`}
                >
                  {/* Set Header - responsive for many measurements */}
                  <div className="mb-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold">Set {setNumber}</span>
                      {isLogged && <span className="text-green-400 text-xs">✓</span>}
                      {isAMRAP && <span className="text-blue-400 text-[10px] px-1.5 py-0.5 bg-blue-500/20 rounded">AMRAP</span>}
                    </div>
                    {setData.intensityPercent && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#C9A857]/10 border border-[#C9A857]/30 rounded">
                        <span className="text-sm font-bold text-[#C9A857]">
                          {setData.intensityPercent}% Intensity
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-2">
                    {/* Dynamically render inputs based on ENABLED measurements only */}
                    {(() => {
                      const allMeasurements = exercise.exercises?.metric_schema?.measurements || [];

                      // Get measurements to display based on enabled_measurements
                      let displayMeasurements = [];

                      if (exercise.enabled_measurements && exercise.enabled_measurements.length > 0) {
                        // If enabled_measurements is specified, use ONLY those
                        // Create measurement objects for each enabled ID (even if not in schema)
                        displayMeasurements = exercise.enabled_measurements.map((measurementId: string) => {
                          // Try to find in schema first
                          const existing = allMeasurements.find((m: any) => m.id === measurementId);
                          if (existing) {
                            return existing;
                          }
                          // If not in schema, create a basic measurement object
                          return {
                            id: measurementId,
                            name: measurementId.charAt(0).toUpperCase() + measurementId.slice(1).replace(/_/g, ' '),
                            type: 'number',
                            unit: measurementId === 'weight' ? 'lbs' : (measurementId === 'reps' ? 'reps' : '')
                          };
                        });
                      } else {
                        // If no enabled_measurements specified, show all from schema
                        displayMeasurements = allMeasurements;
                      }

                      return displayMeasurements.map((measurement: any) => {
                        const metricId = measurement.id;
                        const metricName = measurement.name;
                        const metricUnit = measurement.unit || '';
                        const metricType = measurement.type || 'number';

                        // Check if this metric is being tracked for PR
                        const isTrackedForPR = exercise.tracked_max_metrics?.includes(metricId);

                        // Special handling for reps (could be AMRAP)
                        const label = (metricId === 'reps' && isAMRAP) ? 'Reps (AMRAP)' : metricName;
                        const targetKey = `target${metricId.charAt(0).toUpperCase() + metricId.slice(1)}`;
                        const targetValue = setData[targetKey];

                        // Dynamic placeholder - show "AMRAP" for reps when AMRAP is enabled
                        let placeholderText = targetValue?.toString() || '0';
                        if (metricId === 'reps' && isAMRAP) {
                          placeholderText = 'AMRAP';
                        }

                        // Only show unit if it's different from the metric name (avoid "Reps (reps)")
                        const showUnit = metricUnit && metricUnit.toLowerCase() !== metricName.toLowerCase() && metricUnit.toLowerCase() !== metricId.toLowerCase();

                        return (
                          <div key={metricId} className="relative">
                            <label className="block text-[10px] text-gray-400 mb-0.5 uppercase truncate flex items-center gap-1" title={`${label} ${showUnit ? `(${metricUnit})` : ''}`}>
                              {label} {showUnit && `(${metricUnit})`}
                              {isTrackedForPR && (
                                <span className="text-[#C9A857]" title="Tracking PR for this metric">
                                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                </span>
                              )}
                            </label>
                            <input
                              type="number"
                              value={setData[metricId] || ''}
                              onChange={(e) => {
                                const value = metricType === 'integer' || metricId === 'reps'
                                  ? parseInt(e.target.value) || 0
                                  : parseFloat(e.target.value) || 0;
                                updateSetInput(setNumber, metricId, value);
                              }}
                              className={`w-full text-center text-lg font-bold bg-black/40 rounded py-1 focus:outline-none ${
                                isTrackedForPR
                                  ? 'border-2 border-[#C9A857] shadow-lg shadow-[#C9A857]/20 focus:border-[#C9A857] focus:shadow-[#C9A857]/40'
                                  : 'border border-white/20 focus:border-blue-500'
                              }`}
                              step={metricType === 'integer' || metricId === 'reps' ? '1' : '0.1'}
                              placeholder={placeholderText}
                            />
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Coach Set Notes - Read Only */}
                  {setData.setNotes && (
                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                      <p className="text-[10px] text-yellow-400 font-semibold mb-0.5 uppercase">Coach Note:</p>
                      <p className="text-xs text-yellow-100 leading-tight">{setData.setNotes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            onClick={saveAndMoveNext}
            disabled={saving}
            className="w-full py-2 rounded font-bold text-sm bg-blue-500 hover:bg-blue-400 text-white transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Next'}
          </button>
            </div>
            {/* End Right Column */}
          </div>
          {/* End 2-column grid */}
        </div>
      )}
    </div>
  );
}
