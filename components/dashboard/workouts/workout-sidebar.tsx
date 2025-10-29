'use client';

import { useState } from 'react';
import { getActualIntensity, shouldUsePerceivedIntensity } from '@/lib/perceived-intensity';

interface Measurement {
  id: string;
  name: string;
  type: string;
  unit: string;
  enabled: boolean;
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

interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string | null;
  is_placeholder: boolean;
  placeholder_id: string | null;
  placeholder_name: string | null;
  order_index: number;
  sets: number | null;
  reps_min: number | null;
  metric_targets?: Record<string, string | number | boolean | null>;
  exercises: Exercise | null;
}

interface Routine {
  id: string;
  workout_id: string;
  name: string;
  scheme: string;
  order_index: number;
  routine_exercises: RoutineExercise[];
}

interface WorkoutSidebarProps {
  routines: Routine[];
  selectedExerciseId: string | null;
  selectedRoutineId: string | null;
  onSelectExercise: (routineId: string, exerciseId: string) => void;
  onSelectRoutine: (routineId: string) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onDeleteRoutine: (routineId: string) => void;
  onAddExercise: () => void;
  onAddExerciseToBlock?: (routineId: string) => void;
  onImportRoutine: () => void;
  onCreateBlock: () => void;
  onLinkExerciseToBlock: (exerciseId: string, targetRoutineId: string) => void;
  onMoveExercise?: (exerciseId: string, direction: 'up' | 'down') => void;
  onMoveRoutine?: (routineId: string, direction: 'up' | 'down') => void;
}

export default function WorkoutSidebar({
  routines,
  selectedExerciseId,
  selectedRoutineId,
  onSelectExercise,
  onSelectRoutine,
  onDeleteExercise,
  onDeleteRoutine,
  onAddExercise,
  onAddExerciseToBlock,
  onImportRoutine,
  onCreateBlock,
  onLinkExerciseToBlock,
  onMoveExercise,
  onMoveRoutine
}: WorkoutSidebarProps) {
  const [linkingExerciseId, setLinkingExerciseId] = useState<string | null>(null);

  // Check if exercise is tracking any PRs
  const isTrackingPRs = (exercise: RoutineExercise) => {
    return exercise.tracked_max_metrics && exercise.tracked_max_metrics.length > 0;
  };

  const getExerciseSummary = (exercise: RoutineExercise) => {
    const parts: string[] = [];

    // Sets
    if (exercise.sets) parts.push(`${exercise.sets} ${exercise.sets === 1 ? 'Set' : 'Sets'}`);

    // Reps - Check for per-set configuration first
    const hasPerSetReps = exercise.set_configurations &&
                         Array.isArray(exercise.set_configurations) &&
                         exercise.set_configurations.length > 0 &&
                         exercise.set_configurations.some((s: any) => s.metric_values?.reps || s.reps);

    if (hasPerSetReps) {
      // Show per-set reps (e.g., "5, 8, 10 reps")
      // Check both metric_values.reps (new format) and direct reps (old format)
      const repsArray = exercise.set_configurations.map((s: any) => s.metric_values?.reps || s.reps || '—');
      parts.push(`${repsArray.join(', ')} reps`);
    } else if (exercise.metric_targets?.reps) {
      // Show simple reps from metric_targets
      parts.push(`${exercise.metric_targets.reps} reps`);
    }

    // Other metrics from metric_targets (skip reps since we handled it above)
    // Show ALL metrics the same way - locked and custom measurements treated identically
    if (exercise.metric_targets) {
      Object.entries(exercise.metric_targets).forEach(([key, value]) => {
        if (key !== 'reps' && value != null && value !== '') {
          // Format the metric name - convert snake_case to Title Case
          const formattedKey = key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          parts.push(`${value} ${formattedKey}`);
        }
      });
    }

    // Intensity % - Show corrected % for throwing exercises
    if (exercise.intensity_targets && exercise.intensity_targets.length > 0) {
      const intensity = exercise.intensity_targets[0];
      if (intensity.percent && intensity.metric_label) {
        const exerciseCategory = exercise.exercises?.category;

        if (shouldUsePerceivedIntensity(exerciseCategory)) {
          // For throwing exercises, show: "60% effort (80% actual)"
          const actualPercent = getActualIntensity(intensity.percent);
          parts.push(`${intensity.percent}% effort (${actualPercent}% actual)`);
        } else {
          // For other exercises, show normal percentage
          parts.push(`${intensity.percent}% ${intensity.metric_label}`);
        }
      }
    }

    // Rest
    if (exercise.rest_seconds) {
      const minutes = Math.floor(exercise.rest_seconds / 60);
      const seconds = exercise.rest_seconds % 60;
      if (minutes > 0) {
        parts.push(`${minutes}:${seconds.toString().padStart(2, '0')} rest`);
      } else {
        parts.push(`${seconds}s rest`);
      }
    }

    // Notes preview (first line only, truncated)
    if (exercise.notes) {
      const firstLine = exercise.notes.split('\n')[0];
      const truncated = firstLine.length > 30 ? firstLine.substring(0, 30) + '...' : firstLine;
      parts.push(truncated);
    }

    return parts.length > 0 ? parts.join(', ') : 'Not configured';
  };

  // Sort routines by order_index for display
  const sortedRoutines = [...routines].sort((a, b) => a.order_index - b.order_index);

  // Get all blocks for linking dropdown
  const blocks = sortedRoutines.filter(r => r.scheme !== 'straight');

  const handleLinkExercise = (exerciseId: string, blockId: string) => {
    onLinkExerciseToBlock(exerciseId, blockId);
    setLinkingExerciseId(null);
  };

  // Assign letters to blocks - all exercises in same block get same letter
  const getBlockLetter = (routineId: string) => {
    const blockRoutines = sortedRoutines.filter(r => r.scheme !== 'straight');
    const blockIndex = blockRoutines.findIndex(r => r.id === routineId);
    return blockIndex >= 0 ? String.fromCharCode(65 + blockIndex) : '';
  };

  return (
    <div className="w-[26rem] h-full bg-black border-r border-neutral-800 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-900">
        <h2 className="text-lg font-semibold text-white mb-1">Workout Structure</h2>
        <p className="text-xs text-neutral-400">Click to configure</p>
      </div>

      {/* Scrollable Exercise List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black">
        {sortedRoutines.map((routine, routineIndex) => {
          const isBlock = routine.scheme !== 'straight';

          if (isBlock) {
            // BLOCK CONTAINER
            return (
              <div key={routine.id} className="space-y-2">
                {/* Block Header */}
                <div
                  className={`w-full px-4 py-3 rounded-md border transition-all ${
                    selectedRoutineId === routine.id && !selectedExerciseId
                      ? 'bg-neutral-800 border-neutral-600'
                      : 'bg-neutral-900 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    {/* Reorder buttons for blocks */}
                    {onMoveRoutine && (
                      <div className="flex flex-col gap-0.5 mr-2">
                        <button
                          onClick={() => onMoveRoutine(routine.id, 'up')}
                          disabled={routineIndex === 0}
                          className="p-0.5 hover:bg-neutral-700/50 rounded text-neutral-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          title="Move block up"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onMoveRoutine(routine.id, 'down')}
                          disabled={routineIndex === sortedRoutines.length - 1}
                          className="p-0.5 hover:bg-neutral-700/50 rounded text-neutral-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          title="Move block down"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => onSelectRoutine(routine.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      <div className="w-1.5 h-8 bg-neutral-500 rounded-full" />
                      <div>
                        <h3 className="text-sm font-semibold text-white">{routine.name}</h3>
                        <p className="text-xs text-neutral-400">{routine.routine_exercises.length} exercises</p>
                      </div>
                    </button>
                    <button
                      onClick={() => onDeleteRoutine(routine.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded text-red-400/80 hover:text-red-300 transition-colors shrink-0"
                      title="Delete block"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Exercises in Block */}
                <div className="ml-4 space-y-2">
                  {(() => {
                    const sortedExercises = [...routine.routine_exercises].sort((a, b) => a.order_index - b.order_index);
                    return sortedExercises.map((exercise, exerciseIndex) => (
                      <div key={exercise.id} className="flex items-start gap-2">
                        {/* Reorder buttons for exercises within block */}
                        {onMoveExercise && (
                          <div className="flex flex-col gap-0.5 shrink-0 mt-1.5">
                            <button
                              onClick={() => onMoveExercise(exercise.id, 'up')}
                              disabled={exerciseIndex === 0}
                              className="p-0.5 hover:bg-neutral-700/50 rounded text-neutral-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              title="Move exercise up"
                            >
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => onMoveExercise(exercise.id, 'down')}
                              disabled={exerciseIndex === sortedExercises.length - 1}
                              className="p-0.5 hover:bg-neutral-700/50 rounded text-neutral-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              title="Move exercise down"
                            >
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        )}

                        {/* Letter Label - Same for all exercises in block */}
                        <div className="w-6 h-6 rounded bg-neutral-800/50 flex items-center justify-center shrink-0 mt-1.5">
                          <span className="text-xs font-semibold text-neutral-300">
                            {getBlockLetter(routine.id)}
                          </span>
                        </div>

                        {/* Exercise Card */}
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => onSelectExercise(routine.id, exercise.id)}
                            className={`w-full px-3 py-2 rounded-md text-left transition-all ${
                              selectedExerciseId === exercise.id
                                ? 'bg-neutral-800/50 border border-neutral-600'
                                : 'bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="text-sm font-medium text-white truncate">
                                {exercise.is_placeholder
                                  ? exercise.placeholder_name || 'Placeholder Exercise'
                                  : exercise.exercises?.name || 'Exercise'}
                              </h4>
                              {isTrackingPRs(exercise) && (
                                <span className="text-yellow-400 text-sm shrink-0" title="Tracking Personal Records">
                                  🏆
                                </span>
                              )}
                              {exercise.is_placeholder && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-semibold bg-blue-500/20 border border-blue-500/30 text-blue-300 shrink-0">
                                  PH
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 truncate">
                              {getExerciseSummary(exercise)}
                            </p>
                          </button>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => onDeleteExercise(exercise.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded text-red-400/80 hover:text-red-300 transition-colors shrink-0 mt-1.5"
                          title="Delete exercise"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ));
                  })()}

                  {/* Add Exercise to Block Button */}
                  {onAddExerciseToBlock && (
                    <button
                      onClick={() => onAddExerciseToBlock(routine.id)}
                      className="ml-6 w-[calc(100%-1.5rem)] px-3 py-2 bg-neutral-900/30 hover:bg-neutral-800/50 border border-dashed border-neutral-700 hover:border-neutral-600 rounded-md text-neutral-400 hover:text-white transition-all flex items-center justify-center gap-2"
                      title="Add exercise to this block"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs font-medium">Add to Block</span>
                    </button>
                  )}
                </div>
              </div>
            );
          } else {
            // SINGLE EXERCISE (not in block)
            const exercise = routine.routine_exercises[0];
            if (!exercise) return null;

            return (
              <div key={routine.id}>
                <div className="flex items-start gap-2">
                  {/* Reorder buttons for standalone exercises */}
                  {onMoveRoutine && (
                    <div className="flex flex-col gap-0.5 shrink-0 mt-2">
                      <button
                        onClick={() => onMoveRoutine(routine.id, 'up')}
                        disabled={routineIndex === 0}
                        className="p-0.5 hover:bg-neutral-700/50 rounded text-neutral-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move exercise up"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onMoveRoutine(routine.id, 'down')}
                        disabled={routineIndex === sortedRoutines.length - 1}
                        className="p-0.5 hover:bg-neutral-700/50 rounded text-neutral-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move exercise down"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => onSelectExercise(routine.id, exercise.id)}
                    className={`flex-1 px-4 py-3 rounded-md text-left transition-all ${
                      selectedExerciseId === exercise.id
                        ? 'bg-neutral-800/50 border border-neutral-600'
                        : 'bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-white truncate">
                        {exercise.is_placeholder
                          ? exercise.placeholder_name || 'Placeholder Exercise'
                          : exercise.exercises?.name || 'Exercise'}
                      </h4>
                      {isTrackingPRs(exercise) && (
                        <span className="text-yellow-400 text-sm shrink-0" title="Tracking Personal Records">
                          🏆
                        </span>
                      )}
                      {exercise.is_placeholder && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-semibold bg-blue-500/20 border border-blue-500/30 text-blue-300 shrink-0">
                          PH
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 truncate">
                      {getExerciseSummary(exercise)}
                    </p>
                  </button>

                  {/* Link to Block Button */}
                  {blocks.length > 0 && (
                    <button
                      onClick={() => setLinkingExerciseId(linkingExerciseId === exercise.id ? null : exercise.id)}
                      className={`p-2 rounded transition-colors shrink-0 ${
                        linkingExerciseId === exercise.id
                          ? 'bg-neutral-800/50 text-white'
                          : 'hover:bg-neutral-800/30 text-neutral-400 hover:text-white'
                      }`}
                      title="Link to block"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => onDeleteExercise(exercise.id)}
                    className="p-2 hover:bg-red-500/20 rounded text-red-400/80 hover:text-red-300 transition-colors shrink-0"
                    title="Delete exercise"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Link to Block Dropdown */}
                {linkingExerciseId === exercise.id && blocks.length > 0 && (
                  <div className="mt-2 ml-2 p-3 bg-neutral-950/50 border border-neutral-800 rounded-md">
                    <p className="text-xs text-neutral-400 mb-2">Link to which block?</p>
                    <div className="space-y-1">
                      {blocks.map((block) => (
                        <button
                          key={block.id}
                          onClick={() => handleLinkExercise(exercise.id, block.id)}
                          className="w-full px-3 py-2 bg-neutral-900/50 hover:bg-neutral-800/50 border border-neutral-800 rounded-sm text-left transition-colors"
                        >
                          <div className="text-sm text-white font-medium">{block.name}</div>
                          <div className="text-xs text-neutral-400">{block.routine_exercises.length} exercises</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }
        })}

        {routines.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto mb-3 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-neutral-400 text-sm mb-2">No exercises yet</p>
            <p className="text-neutral-500 text-xs">Add your first exercise</p>
          </div>
        )}

        {/* Create Block Button - Always at bottom of list */}
        <button
          onClick={onCreateBlock}
          className="w-full px-3 py-2 bg-neutral-900/30 hover:bg-neutral-800/50 border border-dashed border-neutral-700 hover:border-neutral-600 rounded-md text-neutral-400 hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs font-medium">Create Block</span>
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-900 space-y-2">
        <button
          onClick={onAddExercise}
          className="w-full px-4 py-2.5 bg-neutral-800/50 border border-neutral-600 hover:bg-neutral-700/50 text-white rounded-md font-medium text-sm transition-all"
        >
          Add Exercise
        </button>
        <button
          onClick={onImportRoutine}
          className="w-full px-4 py-2.5 bg-neutral-900/50 border border-neutral-700 hover:bg-neutral-800/50 text-neutral-300 hover:text-white rounded-md font-medium text-sm transition-all"
        >
          Import Routine
        </button>
      </div>
    </div>
  );
}
