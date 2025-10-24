'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import VolumeChart from './volume-chart';

interface VolumeTrackingDashboardProps {
  athleteId: string;
}

interface ExerciseVolume {
  exercise_id: string;
  exercise_name: string;
  total_volume: number;
  session_count: number;
}

export default function VolumeTrackingDashboard({ athleteId }: VolumeTrackingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [exerciseVolumes, setExerciseVolumes] = useState<ExerciseVolume[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState<string>('');

  useEffect(() => {
    fetchExerciseVolumes();
  }, [athleteId]);

  async function fetchExerciseVolumes() {
    const supabase = createClient();
    setLoading(true);

    try {
      console.log('🔍 [Volume] Step 1: Fetching workout instances for athlete:', athleteId);

      // Step 1: Get all workout instances for this athlete (no nested selects)
      const { data: instances, error: instancesError } = await supabase
        .from('workout_instances')
        .select('id')
        .eq('athlete_id', athleteId)
        .in('status', ['completed', 'in_progress']);

      console.log('🔍 [Volume] Instances result:', { instances, instancesError });

      if (instancesError) {
        console.error('Error fetching workout instances:', instancesError);
        throw instancesError;
      }

      if (!instances || instances.length === 0) {
        console.log('🔍 [Volume] No workout instances found');
        setExerciseVolumes([]);
        setLoading(false);
        return;
      }

      const instanceIds = instances.map(i => i.id);
      console.log('🔍 [Volume] Step 2: Fetching exercise logs for instance IDs:', instanceIds);

      // Step 2: Get all exercise logs for these instances
      const { data: setLogs, error: setLogsError } = await supabase
        .from('exercise_logs')
        .select('id, workout_instance_id, routine_exercise_id, actual_reps, actual_weight')
        .in('workout_instance_id', instanceIds);

      console.log('🔍 [Volume] Exercise logs result:', { setLogs, setLogsError, count: setLogs?.length });

      if (setLogsError) {
        console.error('Error fetching set logs:', setLogsError);
        throw setLogsError;
      }

      if (!setLogs || setLogs.length === 0) {
        console.log('🔍 [Volume] No set logs found');
        setExerciseVolumes([]);
        setLoading(false);
        return;
      }

      // Step 3: Get unique routine_exercise_ids
      const routineExerciseIds = Array.from(new Set(setLogs.map(s => s.routine_exercise_id).filter(Boolean)));
      console.log('🔍 [Volume] Step 3: Unique routine_exercise_ids:', routineExerciseIds);

      if (routineExerciseIds.length === 0) {
        console.log('🔍 [Volume] No routine_exercise_ids found in exercise logs');
        setExerciseVolumes([]);
        setLoading(false);
        return;
      }

      // Step 4: Get routine exercises with exercise info
      const { data: routineExercises, error: reError } = await supabase
        .from('routine_exercises')
        .select('id, exercise_id')
        .in('id', routineExerciseIds);

      console.log('🔍 [Volume] Step 4: Routine exercises result:', { routineExercises, reError, count: routineExercises?.length });

      if (reError) {
        console.error('Error fetching routine exercises:', reError);
        throw reError;
      }

      // Step 5: Get exercise names
      const exerciseIds = Array.from(new Set((routineExercises || []).map(re => re.exercise_id).filter(Boolean)));
      console.log('🔍 [Volume] Step 5: Fetching exercise names for IDs:', exerciseIds);

      const { data: exercises, error: exError } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', exerciseIds);

      console.log('🔍 [Volume] Exercises result:', { exercises, exError, count: exercises?.length });

      if (exError) {
        console.error('Error fetching exercises:', exError);
        throw exError;
      }

      // Create mappings
      const reToExerciseMap = new Map((routineExercises || []).map(re => [re.id, re.exercise_id]));
      const exerciseNameMap = new Map((exercises || []).map(e => [e.id, e.name]));

      console.log('🔍 [Volume] Step 6: Calculating volumes...');
      console.log('🔍 [Volume] Maps created:', {
        reToExerciseMapSize: reToExerciseMap.size,
        exerciseNameMapSize: exerciseNameMap.size
      });

      // Calculate volume by exercise
      const volumeByExercise = new Map<string, ExerciseVolume>();

      setLogs.forEach((set: any) => {
        const exerciseId = reToExerciseMap.get(set.routine_exercise_id);
        if (!exerciseId) {
          console.log('⚠️ [Volume] No exercise ID found for routine_exercise_id:', set.routine_exercise_id);
          return;
        }

        const exerciseName = exerciseNameMap.get(exerciseId) || 'Unknown Exercise';
        const reps = set.actual_reps || 0;
        const weight = set.actual_weight || 0;
        const volume = reps * weight;

        console.log('📊 [Volume] Set calculation:', {
          exerciseId,
          exerciseName,
          reps,
          weight,
          volume
        });

        if (volume > 0) {
          const existing = volumeByExercise.get(exerciseId);
          if (existing) {
            existing.total_volume += volume;
            existing.session_count += 1;
          } else {
            volumeByExercise.set(exerciseId, {
              exercise_id: exerciseId,
              exercise_name: exerciseName,
              total_volume: volume,
              session_count: 1
            });
          }
        }
      });

      // Convert to array and sort by total volume
      const volumeArray = Array.from(volumeByExercise.values()).sort(
        (a, b) => b.total_volume - a.total_volume
      );

      console.log('✅ [Volume] Final volume array:', volumeArray);
      setExerciseVolumes(volumeArray);
    } catch (error) {
      console.error('❌ [Volume] Error fetching exercise volumes:', error);
      setExerciseVolumes([]);
    } finally {
      setLoading(false);
    }
  }

  // Filter exercises based on search
  const filteredExercises = exerciseVolumes.filter((ev) => {
    return exerciseSearch === '' ||
      ev.exercise_name.toLowerCase().includes(exerciseSearch.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#C9A857] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading volume data...</p>
        </div>
      </div>
    );
  }

  if (exerciseVolumes.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
        <div className="max-w-md mx-auto">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-400 text-lg mb-2">No Volume Data Yet</p>
          <p className="text-gray-500 text-sm">
            As the athlete logs workouts, volume trends will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Volume Over Time</h2>
          <p className="text-gray-400 text-sm">Track total training volume (reps × weight) by exercise</p>
        </div>

        {/* Exercise Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search exercises..."
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            className="pl-10 pr-10 py-2 bg-[#1a1a1a] text-white border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A857] focus:border-[#C9A857] w-full sm:w-64"
          />
          {exerciseSearch && (
            <button
              onClick={() => setExerciseSearch('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Total Exercises</p>
          <p className="text-2xl font-bold text-white">{exerciseVolumes.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Total Volume</p>
          <p className="text-2xl font-bold text-white">
            {(exerciseVolumes.reduce((sum, ev) => sum + ev.total_volume, 0) / 1000).toFixed(1)}k
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Avg per Exercise</p>
          <p className="text-2xl font-bold text-white">
            {exerciseVolumes.length > 0
              ? Math.round(exerciseVolumes.reduce((sum, ev) => sum + ev.total_volume, 0) / exerciseVolumes.length / 1000)
              : 0}k
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Showing Charts</p>
          <p className="text-2xl font-bold text-white">{filteredExercises.length}</p>
        </div>
      </div>

      {/* Charts Grid */}
      {filteredExercises.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-gray-400">No charts match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredExercises.map((ev) => (
            <VolumeChart
              key={ev.exercise_id}
              athleteId={athleteId}
              exerciseId={ev.exercise_id}
              exerciseName={ev.exercise_name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
