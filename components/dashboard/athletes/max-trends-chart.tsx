'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface MaxTrendsChartProps {
  athleteId: string;
  exerciseId: string;
  metricId: string;
  exerciseName: string;
  metricLabel: string;
  metricUnit: string;
}

type TimeFilter = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export default function MaxTrendsChart({
  athleteId,
  exerciseId,
  metricId,
  exerciseName,
  metricLabel,
  metricUnit
}: MaxTrendsChartProps) {
  const [loading, setLoading] = useState(true);
  const [maxHistory, setMaxHistory] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('6M');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchMaxHistory();
  }, [athleteId, exerciseId, metricId, timeFilter]);

  async function fetchMaxHistory() {
    const supabase = createClient();
    setLoading(true);

    try {
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

      // Fetch max history
      const { data, error } = await supabase
        .from('athlete_maxes')
        .select('*')
        .eq('athlete_id', athleteId)
        .eq('exercise_id', exerciseId)
        .eq('metric_id', metricId)
        .gte('achieved_on', startDateStr)
        .order('achieved_on', { ascending: true });

      if (error) {
        console.error('Error fetching max history:', error);
        setMaxHistory([]);
      } else {
        setMaxHistory(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setMaxHistory([]);
    } finally {
      setLoading(false);
    }
  }

  // Calculate percentage change
  const calculatePercentChange = () => {
    if (maxHistory.length < 2) return null;
    const first = parseFloat(maxHistory[0].max_value);
    const last = parseFloat(maxHistory[maxHistory.length - 1].max_value);
    return ((last - first) / first * 100).toFixed(1);
  };

  // Prepare data for chart
  const chartData = maxHistory.map((max) => ({
    date: new Date(max.achieved_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: max.achieved_on,
    value: parseFloat(max.max_value),
    verified: max.verified_by_coach,
    source: max.source
  }));

  const latestMax = maxHistory.length > 0 ? maxHistory[maxHistory.length - 1] : null;
  const percentChange = calculatePercentChange();

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1A1A1A] border border-white/20 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-1">{data.value} {metricUnit}</p>
          <p className="text-gray-400 text-xs mb-1">{new Date(data.fullDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          {data.verified && (
            <p className="text-green-400 text-xs">✓ Verified</p>
          )}
          <p className="text-gray-500 text-xs capitalize">{data.source}</p>
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
      ) : maxHistory.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-400">No max history for this time period</p>
            <p className="text-gray-500 text-sm mt-1">Log more workouts to see trends</p>
          </div>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className={compact ? "h-48" : "h-96"}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`colorValue${exerciseId}${metricId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A857" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#C9A857" stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#C9A857"
                  strokeWidth={3}
                  fill={`url(#colorValue${exerciseId}${metricId})`}
                  dot={{ fill: '#C9A857', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, fill: '#C9A857', stroke: '#000', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Footer */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-white/10">
            {/* Latest Max */}
            <div>
              <p className="text-xs text-gray-400 mb-1">Latest Max</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">
                  {latestMax ? parseFloat(latestMax.max_value).toFixed(1) : '-'}
                </p>
                <p className="text-sm text-gray-400">{metricUnit}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {latestMax ? new Date(latestMax.achieved_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
              </p>
            </div>

            {/* Change */}
            {percentChange !== null && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Change</p>
                <p className={`text-2xl font-bold ${parseFloat(percentChange) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {parseFloat(percentChange) >= 0 ? '+' : ''}{percentChange}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Since {timeFilter === 'ALL' ? 'start' : timeFilter.toLowerCase()}
                </p>
              </div>
            )}

            {/* Total Records */}
            <div className="col-span-2 lg:col-span-1">
              <p className="text-xs text-gray-400 mb-1">Data Points</p>
              <p className="text-2xl font-bold text-white">{maxHistory.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {maxHistory.filter(m => m.verified_by_coach).length} verified
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
            <p className="text-xs text-gray-400">{metricLabel} {metricUnit && `(${metricUnit})`}</p>
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
                <p className="text-sm text-gray-400">{metricLabel} {metricUnit && `(${metricUnit})`}</p>
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
