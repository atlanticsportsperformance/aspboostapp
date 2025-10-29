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
  const [displayCount, setDisplayCount] = useState(5);
  const [compactView, setCompactView] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [athleteId, exerciseId]);

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
          {/* View Controls */}
          {history.length > 5 && (
            <div className="p-2 border-b border-white/5 flex items-center justify-between bg-black/20">
              <button
                onClick={() => setCompactView(!compactView)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {compactView ? '📋 Detailed View' : '📊 Compact View'}
              </button>
              <span className="text-xs text-gray-500">
                Showing {Math.min(displayCount, history.length)} of {history.length}
              </span>
            </div>
          )}

          {/* Scrollable History */}
          <div className="max-h-80 overflow-y-auto">
            {history.slice(0, displayCount).map((session, sessionIdx) => (
            <div
              key={session.workoutId}
              className={`p-4 ${sessionIdx !== history.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              {/* Session Date */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-blue-400">
                  {formatDistanceToNow(new Date(session.date), { addSuffix: true })}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(session.date).toLocaleDateString()}
                </span>
              </div>

              {/* Sets - Detailed or Compact */}
              {!compactView ? (
                // Detailed View - Show all sets
                <div className="space-y-2">
                  {session.sets.map((log) => {
                    const metrics = getDisplayMetrics(log);

                    return (
                      <div
                        key={log.id}
                        className="bg-black/30 rounded p-2 border border-white/5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-400">
                            Set {log.set_number}
                          </span>
                          <div className="flex gap-3">
                            {metrics.map((metric, idx) => (
                              <div key={idx} className="text-right">
                                <div className="text-xs text-gray-500">{metric.label}</div>
                                <div className="text-sm font-semibold text-white">{metric.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Compact View - Just show summary
                <div className="text-xs text-gray-400">
                  {session.sets.length} sets completed
                </div>
              )}

              {/* Summary Stats */}
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">Total Sets: </span>
                    <span className="text-white font-medium">{session.sets.length}</span>
                  </div>
                  {session.sets.some(s => s.actual_reps !== null) && (
                    <div>
                      <span className="text-gray-500">Total Reps: </span>
                      <span className="text-white font-medium">
                        {session.sets.reduce((sum, s) => sum + (s.actual_reps || 0), 0)}
                      </span>
                    </div>
                  )}
                  {session.sets.some(s => s.actual_weight !== null && s.actual_reps !== null) && (
                    <div>
                      <span className="text-gray-500">Volume: </span>
                      <span className="text-white font-medium">
                        {session.sets.reduce((sum, s) => sum + ((s.actual_reps || 0) * (s.actual_weight || 0)), 0)} lbs
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {displayCount < history.length && (
            <div className="p-3 border-t border-white/10 text-center">
              <button
                onClick={() => setDisplayCount(prev => prev + 5)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                Load More ({history.length - displayCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
