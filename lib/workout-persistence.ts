// Workout persistence utility for saving/loading active workout state

export interface WorkoutState {
  workoutInstanceId: string;
  athleteId: string;
  athleteName: string;
  workoutName: string;
  startedAt: string;
  currentExerciseIndex: number;
  exercises: Array<{
    id: string;
    name: string;
    sets: number;
    reps: string;
    weight?: string;
    notes?: string;
    completedSets: number;
    setLogs: Array<{
      setNumber: number;
      reps: number;
      weight?: number;
      notes?: string;
      completedAt: string;
    }>;
  }>;
  restTimer?: {
    seconds: number;
    startedAt: string;
  };
  notes?: string;
}

const STORAGE_KEY = 'active_workout_state';

export function saveWorkoutState(state: WorkoutState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    console.log('Workout state saved:', state.workoutInstanceId);
  } catch (error) {
    console.error('Failed to save workout state:', error);
  }
}

export function loadWorkoutState(): WorkoutState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const state = JSON.parse(stored) as WorkoutState;

    // Check if workout is stale (older than 24 hours)
    const startedAt = new Date(state.startedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      console.log('Workout state is stale (>24h), clearing');
      clearWorkoutState();
      return null;
    }

    console.log('Loaded workout state:', state.workoutInstanceId);
    return state;
  } catch (error) {
    console.error('Failed to load workout state:', error);
    return null;
  }
}

export function clearWorkoutState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Workout state cleared');
  } catch (error) {
    console.error('Failed to clear workout state:', error);
  }
}

export function hasActiveWorkout(): boolean {
  return loadWorkoutState() !== null;
}

export function getActiveWorkoutInfo(): { workoutName: string; startedAt: string; athleteName: string } | null {
  const state = loadWorkoutState();
  if (!state) return null;

  return {
    workoutName: state.workoutName,
    startedAt: state.startedAt,
    athleteName: state.athleteName,
  };
}
