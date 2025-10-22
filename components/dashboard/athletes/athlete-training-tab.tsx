'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface TrainingTabProps {
  athleteId: string;
}

export default function TrainingTab({ athleteId }: TrainingTabProps) {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'history'>('history');
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkoutHistory() {
      const supabase = createClient();

      console.log('=== TRAINING TAB LOADING ===');

      // Get last 90 days of workouts
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];

      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workout_instances')
        .select(`
          *,
          workouts(id, name, description),
          set_logs(
            id,
            routine_exercise_id,
            set_number,
            actual_reps,
            actual_load,
            actual_velocity,
            actual_rpe,
            logged_at
          )
        `)
        .eq('athlete_id', athleteId)
        .gte('scheduled_date', ninetyDaysAgoStr)
        .order('scheduled_date', { ascending: false })
        .limit(50);

      console.log('Workouts with sets:', workoutsData, workoutsError);

      setWorkouts(workoutsData || []);
      setLoading(false);
    }

    fetchWorkoutHistory();
  }, [athleteId]);

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-emerald-500/10 text-emerald-400',
      in_progress: 'bg-blue-500/10 text-blue-400',
      not_started: 'bg-gray-500/10 text-gray-400',
      skipped: 'bg-red-500/10 text-red-400'
    };
    return styles[status as keyof typeof styles] || styles.not_started;
  };

  const calculateVolume = (sets: any[]) => {
    if (!sets || sets.length === 0) return 0;
    return sets.reduce((total, set) => {
      const reps = set.actual_reps || 0;
      const load = set.actual_load || 0;
      return total + (reps * load);
    }, 0);
  };

  const formatDuration = (completedAt: string | null, scheduledDate: string) => {
    if (!completedAt) return '-';
    // This is simplified - in real app you'd track start time
    return '45 min';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#C9A857] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading training history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Training History</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'history'
                ? 'bg-[#C9A857] text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'calendar'
                ? 'bg-[#C9A857] text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {viewMode === 'history' ? (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-gray-400 text-sm mb-2">Total Workouts</p>
              <p className="text-3xl font-bold text-white">{workouts.length}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-gray-400 text-sm mb-2">Completed</p>
              <p className="text-3xl font-bold text-emerald-400">
                {workouts.filter(w => w.status === 'completed').length}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-gray-400 text-sm mb-2">In Progress</p>
              <p className="text-3xl font-bold text-blue-400">
                {workouts.filter(w => w.status === 'in_progress').length}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-gray-400 text-sm mb-2">Total Volume</p>
              <p className="text-3xl font-bold text-purple-400">
                {workouts.reduce((total, w) => total + calculateVolume(w.set_logs || []), 0).toLocaleString()} lbs
              </p>
            </div>
          </div>

          {/* Workout History Table/List */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Date</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Workout</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Duration</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Volume</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Sets</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {workouts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <p className="text-gray-400">No workout history found</p>
                      </td>
                    </tr>
                  ) : (
                    workouts.map((workout) => {
                      const isExpanded = expandedWorkout === workout.id;
                      const volume = calculateVolume(workout.set_logs || []);

                      return (
                        <React.Fragment key={workout.id}>
                          <tr
                            onClick={() => setExpandedWorkout(isExpanded ? null : workout.id)}
                            className="border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4">
                              <p className="text-white font-medium">
                                {new Date(workout.scheduled_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white font-medium">{workout.workouts?.name || 'Workout'}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-gray-400">{formatDuration(workout.completed_at, workout.scheduled_date)}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-md text-xs font-medium ${getStatusBadge(workout.status)}`}>
                                {workout.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white font-medium">{volume.toLocaleString()} lbs</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-gray-400">{workout.set_logs?.length || 0} sets</p>
                            </td>
                            <td className="px-6 py-4">
                              <svg
                                className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </td>
                          </tr>

                          {/* Expanded Row - Set Details */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="px-6 py-4 bg-white/5">
                                <div className="space-y-3">
                                  {workout.notes && (
                                    <div className="mb-4">
                                      <p className="text-xs text-gray-400 mb-1">Notes</p>
                                      <p className="text-white">{workout.notes}</p>
                                    </div>
                                  )}

                                  {workout.set_logs && workout.set_logs.length > 0 ? (
                                    <div>
                                      <p className="text-xs text-gray-400 mb-3">Set Details</p>
                                      <div className="grid gap-2">
                                        {workout.set_logs.map((set: any, idx: number) => (
                                          <div key={set.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                                            <span className="text-gray-400 font-mono text-sm">Set {set.set_number}</span>
                                            <div className="flex gap-4 flex-1">
                                              {set.actual_reps && (
                                                <span className="text-white">
                                                  <span className="text-gray-400 text-xs">Reps:</span> {set.actual_reps}
                                                </span>
                                              )}
                                              {set.actual_load && (
                                                <span className="text-white">
                                                  <span className="text-gray-400 text-xs">Load:</span> {set.actual_load} lbs
                                                </span>
                                              )}
                                              {set.actual_velocity && (
                                                <span className="text-white">
                                                  <span className="text-gray-400 text-xs">Velocity:</span> {set.actual_velocity} m/s
                                                </span>
                                              )}
                                              {set.actual_rpe && (
                                                <span className="text-white">
                                                  <span className="text-gray-400 text-xs">RPE:</span> {set.actual_rpe}/10
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-gray-400 text-sm">No set details logged</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden p-4 space-y-4">
              {workouts.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No workout history found</p>
              ) : (
                workouts.map((workout) => {
                  const volume = calculateVolume(workout.set_logs || []);

                  return (
                    <div key={workout.id} className="bg-white/5 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-medium">{workout.workouts?.name || 'Workout'}</p>
                          <p className="text-sm text-gray-400">
                            {new Date(workout.scheduled_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${getStatusBadge(workout.status)}`}>
                          {workout.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Duration</p>
                          <p className="text-white">{formatDuration(workout.completed_at, workout.scheduled_date)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Volume</p>
                          <p className="text-white">{volume.toLocaleString()} lbs</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Sets</p>
                          <p className="text-white">{workout.set_logs?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Load More */}
          {workouts.length >= 50 && (
            <div className="text-center">
              <button
                onClick={() => alert('Load more - Coming soon')}
                className="px-6 py-3 bg-white/5 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
              >
                Load More Workouts
              </button>
            </div>
          )}
        </div>
      ) : (
        // Calendar View
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400 text-lg mb-2">Calendar View Coming Soon</p>
            <p className="text-gray-500 text-sm">Interactive calendar with workout dots will be added in the next update</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Add React import for Fragment
import React from 'react';
