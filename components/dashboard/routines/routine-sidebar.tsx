'use client';

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
  description?: string | null;
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
  reps_max: number | null;
  metric_targets?: Record<string, any>;
  exercises: Exercise | null;
}

interface RoutineSidebarProps {
  exercises: RoutineExercise[];
  selectedExerciseId: string | null;
  onSelectExercise: (exerciseId: string) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onMoveExercise: (exerciseId: string, direction: 'up' | 'down') => void;
  onAddExercise: () => void;
  getPlaceholderName: (placeholderId: string | null) => string;
}

export default function RoutineSidebar({
  exercises,
  selectedExerciseId,
  onSelectExercise,
  onDeleteExercise,
  onMoveExercise,
  onAddExercise,
  getPlaceholderName
}: RoutineSidebarProps) {
  const getExerciseSummary = (exercise: RoutineExercise) => {
    const parts: string[] = [];
    if (exercise.sets) parts.push(`${exercise.sets} sets`);
    if (exercise.metric_targets?.reps) parts.push(`${exercise.metric_targets.reps} reps`);
    if (exercise.metric_targets?.weight) parts.push(`${exercise.metric_targets.weight} lbs`);
    return parts.length > 0 ? parts.join(' × ') : 'Not configured';
  };

  // Sort exercises by order_index
  const sortedExercises = [...exercises].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="w-80 h-full bg-neutral-950/30 backdrop-blur-sm border-r border-neutral-800 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-neutral-800">
        <h2 className="text-lg font-semibold text-white mb-1">Routine Structure</h2>
        <p className="text-xs text-neutral-400">Click to configure</p>
      </div>

      {/* Scrollable Exercise List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedExercises.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto mb-3 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-neutral-400 text-sm mb-2">No exercises yet</p>
            <p className="text-neutral-500 text-xs">Add your first exercise</p>
          </div>
        ) : (
          sortedExercises.map((exercise, index) => (
            <div key={exercise.id} className="flex items-start gap-2">
              {/* Order Controls */}
              <div className="flex flex-col gap-1 mt-2">
                <button
                  onClick={() => onMoveExercise(exercise.id, 'up')}
                  disabled={index === 0}
                  className="p-1 hover:bg-neutral-800/50 rounded text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Move up"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => onMoveExercise(exercise.id, 'down')}
                  disabled={index === sortedExercises.length - 1}
                  className="p-1 hover:bg-neutral-800/50 rounded text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Move down"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Exercise Card */}
              <button
                onClick={() => onSelectExercise(exercise.id)}
                className={`flex-1 px-4 py-3 rounded-md text-left transition-all ${
                  selectedExerciseId === exercise.id
                    ? 'bg-neutral-800/50 border border-neutral-600'
                    : 'bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-white truncate">
                    {exercise.is_placeholder
                      ? getPlaceholderName(exercise.placeholder_id)
                      : exercise.exercises?.name || 'Exercise'}
                  </h4>
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

              {/* Delete Button */}
              <button
                onClick={() => onDeleteExercise(exercise.id)}
                className="p-2 hover:bg-red-500/20 rounded text-red-400/80 hover:text-red-300 transition-colors shrink-0 mt-2"
                title="Delete exercise"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-neutral-800">
        <button
          onClick={onAddExercise}
          className="w-full px-4 py-2.5 bg-neutral-800/50 border border-neutral-600 hover:bg-neutral-700/50 text-white rounded-md font-medium text-sm transition-all"
        >
          Add Exercise
        </button>
      </div>
    </div>
  );
}
