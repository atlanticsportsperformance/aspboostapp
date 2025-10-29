'use client';

import { useEffect, useState } from 'react';
import TestHistoryChart from './test-history-chart';

interface TestMetric {
  metric_name: string;
  display_name: string;
  test_date: string;
  value: number;
  percentile_play_level: number;
  percentile_overall: number;
}

interface IndividualTestSectionProps {
  athleteId: string;
  testType: 'CMJ' | 'IMTP' | 'SJ' | 'HJ' | 'PPU';
  playLevel: string;
}

type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all';

// In-memory cache to prevent redundant API calls - persists across component re-renders
const dataCache = new Map<string, {
  metrics: TestMetric[];
  eliteThresholds: Record<string, number>;
  eliteStdDev: Record<string, number>;
  timestamp: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function IndividualTestSection({ athleteId, testType, playLevel }: IndividualTestSectionProps) {
  const [metrics, setMetrics] = useState<TestMetric[]>([]);
  const [eliteThresholds, setEliteThresholds] = useState<Record<string, number>>({});
  const [eliteStdDev, setEliteStdDev] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  useEffect(() => {
    async function fetchTestHistory() {
      const cacheKey = `${athleteId}-${testType}`;
      const now = Date.now();

      // Check if we have fresh cached data
      const cached = dataCache.get(cacheKey);
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log(`Using cached data for ${testType}`);
        setMetrics(cached.metrics);
        setSelectedMetric(cached.metrics[0]?.metric_name || null);
        setEliteThresholds(cached.eliteThresholds);
        setEliteStdDev(cached.eliteStdDev);
        setLoading(false);
        return;
      }

      try {
        console.log(`Fetching fresh data for ${testType}`);
        const response = await fetch(`/api/athletes/${athleteId}/vald/percentile-history?test_type=${testType}`);
        const data = await response.json();

        if (data.metrics && data.metrics.length > 0) {
          // Store in cache with timestamp
          dataCache.set(cacheKey, {
            metrics: data.metrics,
            eliteThresholds: data.elite_thresholds || {},
            eliteStdDev: data.elite_std_dev || {},
            timestamp: now
          });

          setMetrics(data.metrics);
          setSelectedMetric(data.metrics[0].metric_name);
          setEliteThresholds(data.elite_thresholds || {});
          setEliteStdDev(data.elite_std_dev || {});
        }
      } catch (error) {
        console.error('Error fetching test history:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTestHistory();
  }, [athleteId, testType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading {testType} data...</div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">No {testType} data available</div>
      </div>
    );
  }

  // Get unique metric names
  const uniqueMetrics = Array.from(new Set(metrics.map(m => m.metric_name)));

  // Get tests for selected metric
  let selectedMetricData = metrics
    .filter(m => m.metric_name === selectedMetric)
    .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

  // Apply time range filter
  if (timeRange !== 'all') {
    const now = new Date();
    let cutoffDate = new Date();

    switch (timeRange) {
      case '1m':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3m':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6m':
        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    selectedMetricData = selectedMetricData.filter(m => new Date(m.test_date) >= cutoffDate);
  }

  // Handle empty filtered data
  if (selectedMetricData.length === 0) {
    return (
      <div className="space-y-2 md:space-y-4">
        {/* Metric Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {uniqueMetrics.map((metricName) => {
            const isSelected = metricName === selectedMetric;
            const metricData = metrics.find(m => m.metric_name === metricName);

            return (
              <button
                key={metricName}
                onClick={() => setSelectedMetric(metricName)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/7'
                }`}
              >
                {metricData?.display_name || metricName}
              </button>
            );
          })}
        </div>

        {/* Time Range Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {(['1m', '3m', '6m', '1y', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                timeRange === range
                  ? 'bg-[#9BDDFF] text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="relative flex items-center justify-center h-64 bg-black rounded-2xl border border-white/10" style={{
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)',
        }}>
          {/* Glossy shine overlay */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)',
          }} />
          <div className="text-gray-400 relative z-10">No data available for this time range</div>
        </div>
      </div>
    );
  }

  // Calculate stats
  const latestTest = selectedMetricData[selectedMetricData.length - 1];
  const previousTest = selectedMetricData.length > 1 ? selectedMetricData[selectedMetricData.length - 2] : null;
  const percentileChange = previousTest ? latestTest.percentile_play_level - previousTest.percentile_play_level : 0;
  const valueChange = previousTest ? ((latestTest.value - previousTest.value) / previousTest.value) * 100 : 0;

  return (
    <div className="space-y-2 md:space-y-4">
      {/* Metric Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {uniqueMetrics.map((metricName) => {
          const isSelected = metricName === selectedMetric;
          const metricData = metrics.find(m => m.metric_name === metricName);

          return (
            <button
              key={metricName}
              onClick={() => setSelectedMetric(metricName)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/7'
              }`}
            >
              {metricData?.display_name || metricName}
            </button>
          );
        })}
      </div>

      {/* Time Range Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {(['1m', '3m', '6m', '1y', 'all'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              timeRange === range
                ? 'bg-[#9BDDFF] text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {range === 'all' ? 'All Time' : range.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Stats Cards - Compact on mobile */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {/* Latest Result */}
        <div className="relative bg-black rounded-xl md:rounded-2xl border border-white/10 p-2.5 md:p-4 backdrop-blur-xl" style={{
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)',
        }}>
          {/* Glossy shine overlay */}
          <div className="absolute inset-0 rounded-xl md:rounded-2xl pointer-events-none" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)',
          }} />
          <div className="text-[10px] md:text-xs text-gray-400 mb-1 md:mb-2 relative z-10">Latest Result</div>
          <div className="text-2xl md:text-3xl font-bold text-white mb-0.5 md:mb-1 relative z-10">{latestTest.value.toFixed(1)}</div>
          <div className="text-[10px] md:text-xs text-gray-500 relative z-10">
            {new Date(latestTest.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        {/* Percentile Rank */}
        <div className="relative bg-black rounded-xl md:rounded-2xl border border-white/10 p-2.5 md:p-4 backdrop-blur-xl" style={{
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)',
        }}>
          {/* Glossy shine overlay */}
          <div className="absolute inset-0 rounded-xl md:rounded-2xl pointer-events-none" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)',
          }} />
          <div className="text-[10px] md:text-xs text-gray-400 mb-1 md:mb-2 relative z-10">Percentile Rank</div>
          <div className={`text-2xl md:text-3xl font-bold mb-0.5 md:mb-1 relative z-10 ${
            latestTest.percentile_play_level >= 75 ? 'text-green-400' :
            latestTest.percentile_play_level >= 50 ? 'text-[#9BDDFF]' :
            latestTest.percentile_play_level >= 25 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {Math.round(latestTest.percentile_play_level)}th
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 relative z-10">vs {playLevel} athletes</div>
        </div>

        {/* Change */}
        {previousTest && (
          <div className="relative bg-black rounded-xl md:rounded-2xl border border-white/10 p-2.5 md:p-4 backdrop-blur-xl" style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)',
          }}>
            {/* Glossy shine overlay */}
            <div className="absolute inset-0 rounded-xl md:rounded-2xl pointer-events-none" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)',
            }} />
            <div className="text-[10px] md:text-xs text-gray-400 mb-1 md:mb-2 relative z-10">Change from Previous</div>
            <div className={`text-2xl md:text-3xl font-bold mb-0.5 md:mb-1 relative z-10 ${
              percentileChange > 0 ? 'text-green-400' : percentileChange < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {percentileChange > 0 ? '+' : ''}{percentileChange.toFixed(0)}
            </div>
            <div className={`text-[10px] md:text-xs relative z-10 ${
              valueChange > 0 ? 'text-green-500' : valueChange < 0 ? 'text-red-500' : 'text-gray-500'
            }`}>
              {valueChange > 0 ? '+' : ''}{valueChange.toFixed(1)}% value change
            </div>
          </div>
        )}
      </div>

      {/* Test History Chart */}
      <div className="relative bg-black rounded-xl md:rounded-2xl border border-white/10 p-3 md:p-6 backdrop-blur-xl shadow-lg shadow-black/20" style={{
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)',
      }}>
        {/* Glossy shine overlay */}
        <div className="absolute inset-0 rounded-xl md:rounded-2xl pointer-events-none" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)',
        }} />
        <div className="text-xs md:text-sm font-semibold text-white mb-2 md:mb-4 relative z-10">Test History — {latestTest.display_name}</div>
        <div className="h-96 md:h-80 relative z-10">
          <TestHistoryChart
            data={selectedMetricData.map(test => ({
              date: test.test_date,
              value: test.value,
              percentile: test.percentile_play_level
            }))}
            metricName={latestTest.display_name}
            eliteThreshold={eliteThresholds[selectedMetric || '']}
            eliteStdDev={eliteStdDev[selectedMetric || '']}
          />
        </div>
      </div>
    </div>
  );
}
