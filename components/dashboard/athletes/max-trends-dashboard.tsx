'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import MaxTrendsChart from './max-trends-chart';

interface MaxTrendsDashboardProps {
  athleteId: string;
}

interface ExerciseMax {
  exercise_id: string;
  metric_id: string;
  exercise_name: string;
  metric_label: string;
  metric_unit: string;
  latest_max: number;
  data_points: number;
}

export default function MaxTrendsDashboard({ athleteId }: MaxTrendsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [exerciseMaxes, setExerciseMaxes] = useState<ExerciseMax[]>([]);
  const [metricSearch, setMetricSearch] = useState<string>('');
  const [exerciseSearch, setExerciseSearch] = useState<string>('');

  useEffect(() => {
    fetchExerciseMaxes();
  }, [athleteId]);

  async function fetchExerciseMaxes() {
    const supabase = createClient();
    setLoading(true);

    try {
      // Get all athlete maxes with exercise info
      const { data: maxesData, error } = await supabase
        .from('athlete_maxes')
        .select(`
          *,
          exercises (
            id,
            name,
            metric_schema
          )
        `)
        .eq('athlete_id', athleteId)
        .order('achieved_on', { ascending: false });

      if (error) throw error;

      // Group by exercise_id + metric_id and get latest max with data point count
      const groupedMaxes = new Map<string, ExerciseMax>();

      (maxesData || []).forEach((max: any) => {
        const key = `${max.exercise_id}_${max.metric_id}`;

        if (!groupedMaxes.has(key)) {
          // Find metric label and unit from exercise metric_schema
          const measurement = max.exercises?.metric_schema?.measurements?.find(
            (m: any) => m.id === max.metric_id
          );

          groupedMaxes.set(key, {
            exercise_id: max.exercise_id,
            metric_id: max.metric_id,
            exercise_name: max.exercises?.name || 'Unknown Exercise',
            metric_label: measurement?.name || max.metric_id,
            metric_unit: measurement?.unit || '',
            latest_max: parseFloat(max.max_value),
            data_points: 1
          });
        } else {
          // Increment data point count
          const existing = groupedMaxes.get(key)!;
          existing.data_points += 1;
        }
      });

      setExerciseMaxes(Array.from(groupedMaxes.values()));
    } catch (error) {
      console.error('Error fetching exercise maxes:', error);
      setExerciseMaxes([]);
    } finally {
      setLoading(false);
    }
  }

  // Get unique counts for summary
  const uniqueExercises = Array.from(new Set(exerciseMaxes.map(em => em.exercise_id)));
  const uniqueMetrics = Array.from(new Set(exerciseMaxes.map(em => em.metric_id)));

  // Filter exercise maxes based on search
  const filteredMaxes = exerciseMaxes.filter((em) => {
    const metricMatch = metricSearch === '' ||
      em.metric_label.toLowerCase().includes(metricSearch.toLowerCase()) ||
      em.metric_id.toLowerCase().includes(metricSearch.toLowerCase());

    const exerciseMatch = exerciseSearch === '' ||
      em.exercise_name.toLowerCase().includes(exerciseSearch.toLowerCase());

    return metricMatch && exerciseMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#C9A857] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading max trends...</p>
        </div>
      </div>
    );
  }

  if (exerciseMaxes.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
        <div className="max-w-md mx-auto">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-400 text-lg mb-2">No Max History Yet</p>
          <p className="text-gray-500 text-sm">
            As the athlete logs workouts and sets personal records, their max trends will appear here.
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
          <h2 className="text-2xl font-bold text-white mb-1">Max Trends Over Time</h2>
          <p className="text-gray-400 text-sm">Track progress for each exercise and measurement</p>
        </div>

        {/* Search Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
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
              className="pl-10 pr-4 py-2 bg-[#1a1a1a] text-white border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A857] focus:border-[#C9A857] w-full sm:w-48"
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

          {/* Metric Search */}
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
              placeholder="Search metrics..."
              value={metricSearch}
              onChange={(e) => setMetricSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1a1a1a] text-white border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A857] focus:border-[#C9A857] w-full sm:w-48"
            />
            {metricSearch && (
              <button
                onClick={() => setMetricSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Clear All */}
          {(exerciseSearch || metricSearch) && (
            <button
              onClick={() => {
                setExerciseSearch('');
                setMetricSearch('');
              }}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors whitespace-nowrap"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Total Exercises</p>
          <p className="text-2xl font-bold text-white">{uniqueExercises.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Metrics Tracked</p>
          <p className="text-2xl font-bold text-white">{uniqueMetrics.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Total Records</p>
          <p className="text-2xl font-bold text-white">
            {exerciseMaxes.reduce((sum, em) => sum + em.data_points, 0)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Showing Charts</p>
          <p className="text-2xl font-bold text-white">{filteredMaxes.length}</p>
        </div>
      </div>

      {/* Charts Grid */}
      {filteredMaxes.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-gray-400">No charts match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredMaxes.map((em) => (
            <MaxTrendsChart
              key={`${em.exercise_id}_${em.metric_id}`}
              athleteId={athleteId}
              exerciseId={em.exercise_id}
              metricId={em.metric_id}
              exerciseName={em.exercise_name}
              metricLabel={em.metric_label}
              metricUnit={em.metric_unit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
