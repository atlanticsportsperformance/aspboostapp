'use client';

// Updated to show all metric targets with values - v2
interface BlockOverviewProps {
  routines: any[];
  exerciseInputs: Record<string, Array<any>>;
  onExerciseClick: (exerciseId: string) => void;
  workout?: any;
}

export default function BlockOverview({ routines, exerciseInputs, onExerciseClick, workout }: BlockOverviewProps) {
  console.log('🚀🚀🚀 BLOCK OVERVIEW LOADED - CHECKING ROUTINES 🚀🚀🚀');
  console.log('Total routines:', routines?.length);

  // Calculate completion status for an exercise
  const getExerciseCompletion = (exercise: any) => {
    const targetSets = exercise.sets || 3;
    const inputs = exerciseInputs[exercise.id] || [];
    const completedSets = inputs.filter((input: any) =>
      input && (input.reps > 0 || input.weight > 0)
    ).length;

    return { completed: completedSets, total: targetSets };
  };

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  // Get YouTube thumbnail URL
  const getThumbnail = (videoUrl: string | null | undefined): string | null => {
    const videoId = getYouTubeVideoId(videoUrl);
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  };

  // Helper to check if a metric is primary (reps-based) or secondary (weight, time, distance, velo)
  const isPrimaryMetric = (key: string): boolean => {
    const lowerKey = key.toLowerCase();
    return lowerKey === 'reps' || lowerKey.endsWith('_reps');
  };

  // Helper to format metric display name
  const formatMetricName = (key: string): string => {
    // For custom measurements like "blue_ball_reps" or "blue_ball_velo"
    // Extract the base (e.g., "blue_ball") and check if it's a secondary metric
    if (key.includes('_')) {
      const parts = key.split('_');
      const lastPart = parts[parts.length - 1];

      // If it ends with a metric type, format nicely
      if (['reps', 'velo', 'mph', 'weight', 'time', 'distance'].includes(lastPart.toLowerCase())) {
        const baseName = parts.slice(0, -1).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const metricType = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
        return `${baseName} ${metricType}`;
      }
    }

    // Fallback: capitalize each word
    return key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="space-y-3 max-w-2xl mx-auto pb-24">
      {/* Workout Notes - Clean, no div container */}
      {(workout?.notes || workout?.description) && (
        <p className="text-sm text-gray-300 italic px-3">
          {workout.notes || workout.description}
        </p>
      )}

      {routines.map((routine, routineIdx) => {
        const hasBlockTitle = routine.name && routine.name.toLowerCase() !== 'exercise';
        const exercises = routine.routine_exercises || [];
        const blockLetter = String.fromCharCode(65 + routineIdx); // A, B, C, etc.

        return (
          <div key={routine.id} className="relative mb-4">
            {/* Block Header - Shiny black */}
            {hasBlockTitle && (
              <div className="mb-2">
                <div className="bg-gradient-to-r from-white/10 via-white/5 to-transparent border-l-4 border-white/30 px-3 py-2 rounded-lg backdrop-blur-sm">
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    {routine.name}
                  </h3>
                  {(routine.description || routine.notes) && (
                    <p className="text-xs text-gray-400 mt-0.5 italic">{routine.description || routine.notes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Exercise Rows - Flowy, no container */}
            <div className="space-y-1.5 pl-6">
              {exercises.map((ex: any, exIdx: number) => {
                const exercise = ex.exercises;
                if (!exercise) return null;

                // DEBUG: Log what data we have
                console.log('🔍 Exercise:', exercise.name, {
                  sets: ex.sets,
                  metric_targets: ex.metric_targets,
                  set_configurations: ex.set_configurations,
                  intensity_targets: ex.intensity_targets,
                  is_amrap: ex.is_amrap
                });

                const exerciseCode = `${blockLetter}${exIdx + 1}`;
                const completion = getExerciseCompletion(ex);
                const isComplete = completion.completed === completion.total;
                const isInProgress = completion.completed > 0 && !isComplete;
                const thumbnail = getThumbnail(exercise.video_url);
                const hasIntensity = ex.intensity_percent;
                const tracksPR = ex.tracked_max_metrics && ex.tracked_max_metrics.length > 0;
                const hasMetricTargets = ex.metric_targets && Object.keys(ex.metric_targets).length > 0;

                // Get reps display - check for ANY reps metric (reps, green_ball_reps, etc.)
                let repsDisplay = '0';
                if (ex.metric_targets) {
                  // Find any metric that ends with "_reps" or is just "reps"
                  const repsKeys = Object.keys(ex.metric_targets).filter((k: string) => k === 'reps' || k.endsWith('_reps'));
                  if (repsKeys.length > 0) {
                    // Use the first reps metric found
                    repsDisplay = ex.metric_targets[repsKeys[0]];
                  }
                }

                // Check for per-set reps in set_configurations
                const hasPerSetReps = ex.set_configurations &&
                                     Array.isArray(ex.set_configurations) &&
                                     ex.set_configurations.length > 0 &&
                                     ex.set_configurations.some((s: any) => s.metric_values?.reps || s.reps);

                if (hasPerSetReps) {
                  const repsPerSet = ex.set_configurations.map((setConfig: any) =>
                    setConfig.metric_values?.reps || setConfig.reps || 0
                  );
                  repsDisplay = repsPerSet.join(', ');
                }

                return (
                  <button
                    key={ex.id}
                    onClick={() => onExerciseClick(ex.id)}
                    className="w-full"
                  >
                    <div className="w-full flex items-center gap-2 py-1.5">
                      {/* Exercise Code Badge - Smaller */}
                      <div className="flex-shrink-0 w-6 h-6 rounded bg-[#9BDDFF]/20 border border-[#9BDDFF]/40 flex items-center justify-center">
                        <span className="text-xs font-black text-[#9BDDFF]">{exerciseCode}</span>
                      </div>

                      {/* Video Thumbnail */}
                      <div className="flex-shrink-0 w-14 h-9 rounded overflow-hidden bg-black border border-white/10">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={exercise.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Exercise Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base truncate">
                            {exercise.name}
                          </h4>
                          {tracksPR && (
                            <span className="text-yellow-400 text-sm shrink-0">🏆</span>
                          )}
                        </div>

                        {/* Compact format: 3 × 2 (Red Ball Reps, Blue Ball Reps, ...) */}
                        <div className="text-sm text-gray-300">
                          {(() => {
                            // Get metrics from set_configurations or metric_targets
                            const hasSetConfigurations = ex.set_configurations && ex.set_configurations.length > 0;
                            const hasMetricTargets = ex.metric_targets && Object.keys(ex.metric_targets).length > 0;

                            if (!hasSetConfigurations && !hasMetricTargets) {
                              return <span className="text-yellow-300">Not configured</span>;
                            }

                            // Get all unique metric keys from all sets
                            const allMetricKeys = new Set<string>();
                            if (hasSetConfigurations) {
                              ex.set_configurations.forEach((setConfig: any) => {
                                if (setConfig.metric_values) {
                                  Object.keys(setConfig.metric_values).forEach(key => allMetricKeys.add(key));
                                }
                              });
                            } else if (hasMetricTargets) {
                              Object.keys(ex.metric_targets).forEach(key => allMetricKeys.add(key));
                            }

                            return (
                              <span>
                                {ex.sets || 3} × {repsDisplay}
                                {ex.intensity_targets && ex.intensity_targets.length > 0 && (
                                  <span className="text-[#9BDDFF] font-semibold"> @ {ex.intensity_targets[0].percent}%</span>
                                )}
                                <span className="text-gray-400"> (
                                  {Array.from(allMetricKeys)
                                    .filter((key: string) => {
                                      const isPrimary = isPrimaryMetric(key);
                                      if (isPrimary) return true;

                                      // Show metric if it exists in any set's metric_values or in metric_targets
                                      // Don't filter by value - if the metric is enabled, show it
                                      if (hasSetConfigurations) {
                                        return ex.set_configurations.some((s: any) =>
                                          s.metric_values && key in s.metric_values
                                        );
                                      }
                                      return key in (ex.metric_targets || {});
                                    })
                                    .map((key: string, idx: number) => {
                                      const formattedKey = formatMetricName(key);
                                      return idx === 0 ? formattedKey : `, ${formattedKey}`;
                                    }).join('')}
                                )</span>
                              </span>
                            );
                          })()}
                        </div>

                        {/* Exercise Notes */}
                        {ex.notes && (
                          <p className="text-xs text-gray-400 italic mt-0.5">
                            {ex.notes}
                          </p>
                        )}
                      </div>

                      {/* Arrow indicator */}
                      <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Start First Exercise Button */}
      {routines.length > 0 && routines.some(r => r.routine_exercises?.length > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => {
              // Find the first exercise in the first routine
              const firstRoutine = routines.find(r => r.routine_exercises?.length > 0);
              const firstExercise = firstRoutine?.routine_exercises?.[0];
              if (firstExercise) {
                onExerciseClick(firstExercise.id);
              }
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-[#9BDDFF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] text-black font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">Start First Exercise</span>
          </button>
        </div>
      )}
    </div>
  );
}
