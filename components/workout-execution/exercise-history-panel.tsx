'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface ExerciseHistoryPanelProps {
  athleteId: string;
  exerciseId: string;
  exerciseName: string;
}

interface ExerciseLog {
  id: string;
  workout_instance_id: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight: number | null;
  metric_data: any;
  created_at: string;
  workout_instances?: {
    completed_at: string;
  };
}

interface WorkoutSession {
  date: string;
  workoutId: string;
  sets: ExerciseLog[];
}

export function ExerciseHistoryPanel({ athleteId, exerciseId, exerciseName }: ExerciseHistoryPanelProps) {
  const supabase = createClient();
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const [prData, setPrData] = useState<any>(null);

  useEffect(() => {
    fetchHistory();
    fetchPRs();
  }, [athleteId, exerciseId]);

  async function fetchPRs() {
    const { data, error } = await supabase
      .from('athlete_maxes')
      .select('metric_id, max_value, achieved_on')
      .eq('athlete_id', athleteId)
      .eq('exercise_id', exerciseId)
      .order('achieved_on', { ascending: false });

    if (!error && data && data.length > 0) {
      // Group by metric and get the most recent (highest) value
      const prs: any = {};
      data.forEach(pr => {
        if (!prs[pr.metric_id] || pr.max_value > prs[pr.metric_id].max_value) {
          prs[pr.metric_id] = pr;
        }
      });
      setPrData(prs);
    }
  }

  async function fetchHistory() {
    setLoading(true);

    console.log('📜 Fetching exercise history:', {
      athleteId,
      exerciseId,
      exerciseName
    });

    // Fetch last 10 workout sessions for this exercise
    const { data, error } = await supabase
      .from('exercise_logs')
      .select(`
        id,
        workout_instance_id,
        set_number,
        actual_reps,
        actual_weight,
        metric_data,
        created_at,
        workout_instances (
          completed_at
        )
      `)
      .eq('athlete_id', athleteId)
      .eq('exercise_id', exerciseId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Error fetching exercise history:', error);
      setLoading(false);
      return;
    }

    console.log(`✅ Found ${data?.length || 0} exercise logs for history`);

    // Group by workout session
    const sessionMap = new Map<string, WorkoutSession>();

    (data || []).forEach((log: any) => {
      const date = log.workout_instances?.completed_at || log.created_at;
      const workoutId = log.workout_instance_id;

      if (!sessionMap.has(workoutId)) {
        sessionMap.set(workoutId, {
          date,
          workoutId,
          sets: []
        });
      }

      sessionMap.get(workoutId)!.sets.push(log);
    });

    // Convert to array and sort by date (most recent first)
    const sessions = Array.from(sessionMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // Keep only last 10 sessions

    // Sort sets within each session
    sessions.forEach(session => {
      session.sets.sort((a, b) => a.set_number - b.set_number);
    });

    setHistory(sessions);
    setLoading(false);
  }

  function formatMetricValue(value: any, metricId: string): string {
    if (value === null || value === undefined) return '-';

    // Format based on metric type
    if (metricId.includes('velo') || metricId.includes('speed')) {
      return `${value} mph`;
    }
    if (metricId.includes('time') || metricId.includes('duration')) {
      return `${value}s`;
    }
    if (metricId === 'weight') {
      return `${value} lbs`;
    }

    return String(value);
  }

  function getSessionStats(session: WorkoutSession) {
    const totalSets = session.sets.length;
    const totalReps = session.sets.reduce((sum, s) => sum + (s.actual_reps || 0), 0);
    const totalVolume = session.sets.reduce((sum, s) => sum + ((s.actual_reps || 0) * (s.actual_weight || 0)), 0);

    // Get max weight in this session
    const maxWeight = Math.max(...session.sets.map(s => s.actual_weight || 0));

    // Get any custom metrics (like velocities)
    const customMetrics: { [key: string]: number } = {};
    session.sets.forEach(s => {
      if (s.metric_data) {
        Object.entries(s.metric_data).forEach(([key, value]) => {
          if (typeof value === 'number') {
            if (!customMetrics[key] || value > customMetrics[key]) {
              customMetrics[key] = value;
            }
          }
        });
      }
    });

    return {
      totalSets,
      totalReps,
      totalVolume,
      maxWeight,
      customMetrics
    };
  }

  function getDisplayMetrics(log: ExerciseLog): { label: string; value: string }[] {
    const metrics: { label: string; value: string }[] = [];

    // Add basic metrics
    if (log.actual_reps !== null) {
      metrics.push({ label: 'Reps', value: String(log.actual_reps) });
    }
    if (log.actual_weight !== null) {
      metrics.push({ label: 'Weight', value: `${log.actual_weight} lbs` });
    }

    // Add custom metrics from metric_data
    if (log.metric_data) {
      Object.entries(log.metric_data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          // Format the label nicely
          const label = key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          metrics.push({
            label,
            value: formatMetricValue(value, key)
          });
        }
      });
    }

    return metrics;
  }

  if (loading) {
    return (
      <div className="p-4 bg-zinc-900/50 rounded-lg">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className="text-sm">Loading history...</span>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-4 bg-zinc-900/50 rounded-lg border border-white/10">
        <p className="text-sm text-gray-400 text-center">No previous workouts recorded</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 rounded-lg border border-white/10">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-sm font-semibold text-white">Exercise History</h3>
          <span className="text-xs text-gray-400">({history.length} sessions)</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* History List - Expandable */}
      {isExpanded && (
        <div className="border-t border-white/10">
          {/* Scrollable History - One Row Per Workout */}
          <div className="max-h-64 overflow-y-auto">
            {history.slice(0, displayCount).map((session, sessionIdx) => {
              const stats = getSessionStats(session);

              return (
                <div
                  key={session.workoutId}
                  className={`px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors ${
                    sessionIdx !== history.length - 1 ? 'border-b border-white/5' : ''
                  }`}
                >
                  {/* Date */}
                  <div className="flex flex-col min-w-[100px]">
                    <span className="text-xs font-medium text-blue-400">
                      {formatDistanceToNow(new Date(session.date), { addSuffix: true })}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Key Stats */}
                  <div className="flex gap-4 text-xs">
                    {stats.totalReps > 0 && (
                      <div className="text-center">
                        <div className="text-gray-500">Reps</div>
                        <div className="text-white font-semibold">{stats.totalReps}</div>
                      </div>
                    )}
                    {stats.maxWeight > 0 && (
                      <div className="text-center">
                        <div className="text-gray-500">Max</div>
                        <div className="text-white font-semibold">{stats.maxWeight} lbs</div>
                      </div>
                    )}
                    {stats.totalVolume > 0 && (
                      <div className="text-center">
                        <div className="text-gray-500">Vol</div>
                        <div className="text-white font-semibold">{stats.totalVolume}</div>
                      </div>
                    )}
                    {Object.entries(stats.customMetrics).slice(0, 2).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="text-gray-500">{key.split('_').pop()}</div>
                        <div className="text-white font-semibold">{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Sets Count */}
                  <div className="text-xs text-gray-400">
                    {stats.totalSets} sets
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {displayCount < history.length && (
            <div className="p-2 border-t border-white/10 text-center">
              <button
                onClick={() => setDisplayCount(prev => prev + 10)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                Show More ({history.length - displayCount} remaining)
              </button>
            </div>
          )}

          {/* PR/MAX KPI Section */}
          {prData && Object.keys(prData).length > 0 && (
            <div className="border-t-2 border-yellow-500/20 bg-gradient-to-b from-yellow-500/10 to-transparent p-3">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs font-bold text-yellow-500 uppercase">Personal Records</span>
              </div>
              <div className="flex gap-6">
                {Object.entries(prData).map(([metricId, pr]: [string, any]) => (
                  <div key={metricId} className="text-center">
                    <div className="text-xs text-gray-400 capitalize">
                      {metricId.replace('_', ' ')}
                    </div>
                    <div className="text-lg font-bold text-yellow-400">
                      {pr.max_value}
                      {metricId === 'weight' && ' lbs'}
                      {metricId.includes('velo') && ' mph'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(pr.achieved_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
