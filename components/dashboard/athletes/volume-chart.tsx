'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';

interface VolumeChartProps {
  athleteId: string;
  exerciseId: string;
  exerciseName: string;
}

type TimeFilter = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface VolumeData {
  date: string;
  fullDate: string;
  volume: number;
  sets: number;
}

export default function VolumeChart({
  athleteId,
  exerciseId,
  exerciseName
}: VolumeChartProps) {
  const [loading, setLoading] = useState(true);
  const [volumeHistory, setVolumeHistory] = useState<VolumeData[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('6M');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchVolumeHistory();
  }, [athleteId, exerciseId, timeFilter]);

  async function fetchVolumeHistory() {
    const supabase = createClient();
    setLoading(true);

    try {
      console.log('🔍 [VolumeChart] Fetching for:', { athleteId, exerciseId, exerciseName, timeFilter });

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
      console.log('🔍 [VolumeChart] Date range: from', startDateStr, 'to now');

      // Step 1: Get workout instances
      const { data: instances, error: instancesError } = await supabase
        .from('workout_instances')
        .select('id, scheduled_date')
        .eq('athlete_id', athleteId)
        .gte('scheduled_date', startDateStr)
        .in('status', ['completed', 'in_progress'])
        .order('scheduled_date', { ascending: true });

      console.log('🔍 [VolumeChart] Instances:', { instances, instancesError, count: instances?.length });

      if (instancesError) throw instancesError;

      if (!instances || instances.length === 0) {
        console.log('🔍 [VolumeChart] No instances found');
        setVolumeHistory([]);
        setLoading(false);
        return;
      }

      const instanceIds = instances.map(i => i.id);

      // Step 2: Get exercise logs for these instances
      const { data: setLogs, error: setLogsError } = await supabase
        .from('exercise_logs')
        .select('id, workout_instance_id, routine_exercise_id, actual_reps, actual_weight')
        .in('workout_instance_id', instanceIds);

      console.log('🔍 [VolumeChart] Exercise logs:', { setLogs, setLogsError, count: setLogs?.length });

      if (setLogsError) throw setLogsError;

      if (!setLogs || setLogs.length === 0) {
        console.log('🔍 [VolumeChart] No set logs found');
        setVolumeHistory([]);
        setLoading(false);
        return;
      }

      // Step 3: Get unique routine_exercise_ids
      const routineExerciseIds = Array.from(new Set(setLogs.map(s => s.routine_exercise_id).filter(Boolean)));
      console.log('🔍 [VolumeChart] Routine exercise IDs:', routineExerciseIds);

      // Step 4: Get routine exercises to find which ones match our exercise_id
      const { data: routineExercises, error: reError } = await supabase
        .from('routine_exercises')
        .select('id, exercise_id')
        .in('id', routineExerciseIds)
        .eq('exercise_id', exerciseId);

      console.log('🔍 [VolumeChart] Matching routine exercises:', { routineExercises, reError, count: routineExercises?.length });

      if (reError) throw reError;

      // Create set of matching routine_exercise IDs
      const matchingIds = new Set(routineExercises?.map(re => re.id) || []);
      console.log('🔍 [VolumeChart] Matching IDs for this exercise:', Array.from(matchingIds));

      // Calculate volume by date
      const volumeByDate = new Map<string, { volume: number; sets: number }>();

      // Group exercise logs by instance
      const setLogsByInstance = new Map<string, any[]>();
      setLogs.forEach(set => {
        const logs = setLogsByInstance.get(set.workout_instance_id) || [];
        logs.push(set);
        setLogsByInstance.set(set.workout_instance_id, logs);
      });

      instances.forEach((instance: any) => {
        const instanceSets = setLogsByInstance.get(instance.id) || [];
        let dailyVolume = 0;
        let setCount = 0;

        instanceSets.forEach((set: any) => {
          // Only count sets for the exercise we're tracking
          if (matchingIds.has(set.routine_exercise_id)) {
            const reps = set.actual_reps || 0;
            const weight = set.actual_weight || 0;
            const volume = reps * weight;
            dailyVolume += volume;
            setCount++;

            console.log('📊 [VolumeChart] Adding set:', {
              date: instance.scheduled_date,
              reps,
              weight,
              volume
            });
          }
        });

        if (dailyVolume > 0) {
          const date = instance.scheduled_date;
          const existing = volumeByDate.get(date) || { volume: 0, sets: 0 };
          volumeByDate.set(date, {
            volume: existing.volume + dailyVolume,
            sets: existing.sets + setCount
          });
        }
      });

      // Convert to array format for chart
      const chartData: VolumeData[] = Array.from(volumeByDate.entries()).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date,
        volume: data.volume,
        sets: data.sets
      }));

      console.log('✅ [VolumeChart] Final chart data:', chartData);
      setVolumeHistory(chartData);
    } catch (error) {
      console.error('❌ [VolumeChart] Error fetching volume history:', error);
      setVolumeHistory([]);
    } finally {
      setLoading(false);
    }
  }

  // Calculate stats
  const totalVolume = volumeHistory.reduce((sum, v) => sum + v.volume, 0);
  const avgVolume = volumeHistory.length > 0 ? Math.round(totalVolume / volumeHistory.length) : 0;
  const maxVolume = volumeHistory.length > 0 ? Math.max(...volumeHistory.map(v => v.volume)) : 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1A1A1A] border border-white/20 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-1">{data.volume.toLocaleString()} lbs</p>
          <p className="text-gray-400 text-xs mb-1">{new Date(data.fullDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p className="text-gray-500 text-xs">{data.sets} sets</p>
        </div>
      );
    }
    return null;
  };

  const chartContent = (compact: boolean) => (
    <>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-400 text-sm">Loading chart data...</div>
        </div>
      ) : volumeHistory.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-400">No volume data for this time period</p>
            <p className="text-gray-500 text-sm mt-1">Log workouts to see volume trends</p>
          </div>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className={compact ? "h-48 mb-4" : "h-96 mb-6"}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={volumeHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="date"
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="volume"
                  fill="#C9A857"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#C9A857"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Footer */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            {/* Total Volume */}
            <div>
              <p className="text-xs text-gray-400 mb-1">Total Volume</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">
                  {(totalVolume / 1000).toFixed(1)}k
                </p>
                <p className="text-sm text-gray-400">lbs</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {timeFilter === 'ALL' ? 'All time' : timeFilter.toLowerCase()}
              </p>
            </div>

            {/* Average Volume */}
            <div>
              <p className="text-xs text-gray-400 mb-1">Avg per Session</p>
              <p className="text-2xl font-bold text-blue-400">
                {avgVolume.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {volumeHistory.length} sessions
              </p>
            </div>

            {/* Max Volume */}
            <div>
              <p className="text-xs text-gray-400 mb-1">Peak Volume</p>
              <p className="text-2xl font-bold text-emerald-400">
                {maxVolume.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Single session
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Compact Chart Card */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-5 hover:bg-white/10 transition-all w-full group">
        {/* Header with Time Filters */}
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Left: Exercise Name */}
          <button
            onClick={() => setIsExpanded(true)}
            className="text-left flex-shrink-0"
          >
            <h3 className="text-base font-bold text-white mb-1 group-hover:text-[#C9A857] transition-colors">{exerciseName}</h3>
            <p className="text-xs text-gray-400">Total Volume (reps × weight)</p>
          </button>

          {/* Right: Time Filters and Expand Button */}
          <div className="flex items-center gap-2">
            {/* Time Filter Buttons */}
            <div className="flex gap-1 bg-black/40 rounded-lg p-1">
              {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                    timeFilter === filter
                      ? 'bg-[#C9A857] text-black'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Expand Icon */}
            <button
              onClick={() => setIsExpanded(true)}
              className="flex-shrink-0"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Compact Chart */}
        <div onClick={() => setIsExpanded(true)} className="cursor-pointer">
          {chartContent(true)}
        </div>
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#1A1A1A] rounded-xl border border-white/10 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{exerciseName}</h3>
                <p className="text-sm text-gray-400">Total Volume (reps × weight)</p>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Time Filter Buttons */}
              <div className="flex gap-1.5 bg-black/40 rounded-lg p-1 mb-6 justify-center">
                {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                      timeFilter === filter
                        ? 'bg-[#C9A857] text-black'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Expanded Chart */}
              {chartContent(false)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
