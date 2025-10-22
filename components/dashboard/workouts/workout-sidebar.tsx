'use client';

import { useState } from 'react';

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
  order_index: number;
  sets: number | null;
  reps_min: number | null;
  metric_targets?: Record<string, any>;
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
  onImportRoutine: () => void;
  onCreateBlock: () => void;
  onLinkExerciseToBlock: (exerciseId: string, targetRoutineId: string) => void;
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
  onImportRoutine,
  onCreateBlock,
  onLinkExerciseToBlock
}: WorkoutSidebarProps) {
  const [linkingExerciseId, setLinkingExerciseId] = useState<string | null>(null);
  const getExerciseSummary = (exercise: RoutineExercise) => {
    const parts: string[] = [];
    if (exercise.sets) parts.push(`${exercise.sets} Sets`);
    if (exercise.reps_min) parts.push(`${exercise.reps_min} reps`);
    if (exercise.metric_targets?.weight) parts.push(`${exercise.metric_targets.weight} lbs`);
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
    <div className="w-80 h-full bg-neutral-950/30 backdrop-blur-sm border-r border-neutral-800 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-neutral-800">
        <h2 className="text-lg font-semibold text-white mb-1">Workout Structure</h2>
        <p className="text-xs text-neutral-400">Click to configure</p>
      </div>

      {/* Scrollable Exercise List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedRoutines.map((routine) => {
          const isBlock = routine.scheme !== 'straight';

          if (isBlock) {
            // BLOCK CONTAINER
            return (
              <div key={routine.id} className="space-y-2">
                {/* Block Header */}
                <div
                  className={`w-full px-4 py-3 rounded-md border transition-all ${
                    selectedRoutineId === routine.id && !selectedExerciseId
                      ? 'bg-neutral-800/50 border-neutral-600'
                      : 'bg-neutral-900/30 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
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
                  {routine.routine_exercises
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((exercise, index) => (
                      <div key={exercise.id} className="flex items-start gap-2">
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
                            <h4 className="text-sm font-medium text-white truncate mb-0.5">
                              {exercise.exercises?.name || 'Exercise'}
                            </h4>
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
                    ))}
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
                  <button
                    onClick={() => onSelectExercise(routine.id, exercise.id)}
                    className={`flex-1 px-4 py-3 rounded-md text-left transition-all ${
                      selectedExerciseId === exercise.id
                        ? 'bg-neutral-800/50 border border-neutral-600'
                        : 'bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-800'
                    }`}
                  >
                    <h4 className="text-sm font-medium text-white truncate mb-1">
                      {exercise.exercises?.name || 'Exercise'}
                    </h4>
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
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-neutral-800 space-y-2">
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
        <button
          onClick={onCreateBlock}
          className="w-full px-4 py-2.5 bg-neutral-900/50 border border-neutral-700 hover:bg-neutral-800/50 text-neutral-300 hover:text-white rounded-md font-medium text-sm transition-all"
        >
          Create Block
        </button>
      </div>
    </div>
  );
}
