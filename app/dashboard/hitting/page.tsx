'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  LineChart,
  ComposedChart,
} from 'recharts';

interface Athlete {
  id: string;
  first_name: string;
  last_name: string;
  blast_player_id: string;
}

interface SwingData {
  athlete_id: string;
  bat_speed: number | null;
  peak_hand_speed: number | null;
  attack_angle: number | null;
  early_connection: number | null;
  connection_at_impact: number | null;
  rotational_acceleration: number | null;
  plane_score: number | null;
  connection_score: number | null;
  rotation_score: number | null;
  power: number | null;
  recorded_date: string;
  recorded_time: string;
}

type DateFilter = '7d' | '1m' | '3m' | '6m' | 'custom';
type MetricKey = 'bat_speed' | 'peak_hand_speed' | 'attack_angle' | 'early_connection' | 'connection_at_impact' | 'rotational_acceleration' | 'plane_score' | 'connection_score' | 'rotation_score' | 'power';

const METRICS: { value: MetricKey; label: string }[] = [
  { value: 'bat_speed', label: 'Bat Speed (mph)' },
  { value: 'peak_hand_speed', label: 'Peak Hand Speed (mph)' },
  { value: 'attack_angle', label: 'Attack Angle (°)' },
  { value: 'early_connection', label: 'Early Connection' },
  { value: 'connection_at_impact', label: 'Connection at Impact' },
  { value: 'rotational_acceleration', label: 'Rotational Acceleration (g)' },
  { value: 'plane_score', label: 'Plane Score' },
  { value: 'connection_score', label: 'Connection Score' },
  { value: 'rotation_score', label: 'Rotation Score' },
  { value: 'power', label: 'Power' },
];

const ATHLETE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // orange
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange-red
];

export default function HittingAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [swingData, setSwingData] = useState<SwingData[]>([]);
  const [filteredData, setFilteredData] = useState<SwingData[]>([]);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Chart settings
  const [dateFilter, setDateFilter] = useState<DateFilter>('1m');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [xAxis, setXAxis] = useState<MetricKey>('peak_hand_speed');
  const [yAxis, setYAxis] = useState<MetricKey>('bat_speed');
  const [showRegression, setShowRegression] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchAthletes();
  }, []);

  useEffect(() => {
    if (selectedAthletes.size > 0) {
      fetchSwingData();
    } else {
      setSwingData([]);
      setFilteredData([]);
    }
  }, [selectedAthletes]);

  useEffect(() => {
    filterDataByDate();
  }, [dateFilter, customStartDate, customEndDate, swingData]);

  async function checkAuth() {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      router.push('/sign-in');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

    if (!profile || !['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      router.push('/dashboard');
    }
  }

  async function fetchAthletes() {
    const supabase = createClient();

    const { data: athletesData, error } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, blast_player_id')
      .not('blast_player_id', 'is', null)
      .order('last_name', { ascending: true });

    if (error) {
      console.error('Error fetching athletes:', error);
    } else {
      setAthletes(athletesData || []);
      // Auto-select all athletes by default
      if (athletesData && athletesData.length > 0) {
        setSelectedAthletes(new Set(athletesData.map(a => a.id)));
      }
    }

    setLoading(false);
  }

  async function fetchSwingData() {
    const supabase = createClient();
    const athleteIds = Array.from(selectedAthletes);

    if (athleteIds.length === 0) return;

    const { data: swings, error } = await supabase
      .from('blast_swings')
      .select('athlete_id, bat_speed, peak_hand_speed, attack_angle, early_connection, connection_at_impact, rotational_acceleration, plane_score, connection_score, rotation_score, power, recorded_date, recorded_time')
      .in('athlete_id', athleteIds)
      .order('recorded_date', { ascending: false });

    if (error) {
      console.error('Error fetching swing data:', error);
    } else {
      setSwingData(swings || []);
    }
  }

  function filterDataByDate() {
    if (swingData.length === 0) {
      setFilteredData([]);
      return;
    }

    const now = new Date();
    let startDate: Date;

    if (dateFilter === 'custom') {
      if (!customStartDate || !customEndDate) {
        setFilteredData(swingData);
        return;
      }
      startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      const filtered = swingData.filter(swing => {
        const swingDate = new Date(swing.recorded_date);
        return swingDate >= startDate && swingDate <= endDate;
      });
      setFilteredData(filtered);
      return;
    }

    // Calculate start date based on filter
    switch (dateFilter) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3m':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6m':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filtered = swingData.filter(swing => {
      const swingDate = new Date(swing.recorded_date);
      return swingDate >= startDate;
    });

    setFilteredData(filtered);
  }

  function toggleAthlete(athleteId: string) {
    const newSelected = new Set(selectedAthletes);
    if (newSelected.has(athleteId)) {
      newSelected.delete(athleteId);
    } else {
      newSelected.add(athleteId);
    }
    setSelectedAthletes(newSelected);
  }

  function selectAll() {
    setSelectedAthletes(new Set(athletes.map(a => a.id)));
  }

  function deselectAll() {
    setSelectedAthletes(new Set());
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch('/api/blast/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setSyncMessage({
          type: 'success',
          text: `Successfully synced! ${data.swingsAdded || 0} new swings added.`
        });
        // Refresh swing data
        await fetchSwingData();
      } else {
        setSyncMessage({
          type: 'error',
          text: data.error || 'Failed to sync'
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncMessage({
        type: 'error',
        text: 'An error occurred while syncing'
      });
    }

    setSyncing(false);
  }

  // Calculate regression line
  function calculateRegression(data: any[]) {
    if (data.length < 2) return null;

    const validData = data.filter(d => d[xAxis] != null && d[yAxis] != null);
    if (validData.length < 2) return null;

    const n = validData.length;
    const sumX = validData.reduce((sum, d) => sum + d[xAxis], 0);
    const sumY = validData.reduce((sum, d) => sum + d[yAxis], 0);
    const sumXY = validData.reduce((sum, d) => sum + d[xAxis] * d[yAxis], 0);
    const sumX2 = validData.reduce((sum, d) => sum + d[xAxis] * d[xAxis], 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const yMean = sumY / n;
    const ssTotal = validData.reduce((sum, d) => sum + Math.pow(d[yAxis] - yMean, 2), 0);
    const ssResidual = validData.reduce((sum, d) => {
      const predicted = slope * d[xAxis] + intercept;
      return sum + Math.pow(d[yAxis] - predicted, 2);
    }, 0);
    const r2 = 1 - (ssResidual / ssTotal);

    return { slope, intercept, r2 };
  }

  // Prepare chart data
  const chartData = filteredData
    .filter(d => d[xAxis] != null && d[yAxis] != null)
    .map(swing => ({
      ...swing,
      athleteName: athletes.find(a => a.id === swing.athlete_id)?.first_name + ' ' + athletes.find(a => a.id === swing.athlete_id)?.last_name?.charAt(0) || 'Unknown',
    }));

  // Group by athlete for coloring
  const dataByAthlete = athletes
    .filter(a => selectedAthletes.has(a.id))
    .map((athlete, index) => ({
      athlete,
      data: chartData.filter(d => d.athlete_id === athlete.id),
      color: ATHLETE_COLORS[index % ATHLETE_COLORS.length],
    }));

  const regression = showRegression ? calculateRegression(chartData) : null;

  // Calculate min/max for regression line
  const xValues = chartData.map(d => d[xAxis] as number);
  const minX = xValues.length > 0 ? Math.min(...xValues) : 0;
  const maxX = xValues.length > 0 ? Math.max(...xValues) : 100;

  // Create regression line data points
  const regressionLineData = regression && showRegression ? [
    { [xAxis]: minX, [yAxis]: regression.slope * minX + regression.intercept, isRegression: true },
    { [xAxis]: maxX, [yAxis]: regression.slope * maxX + regression.intercept, isRegression: true }
  ] : [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white/20 border-r-white"></div>
          <p className="mt-4 text-sm text-white/50">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-20 md:pb-8">
      <div className="relative">
        <main className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {/* Header */}
          <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Hitting Analytics</h1>
              <p className="text-sm lg:text-base text-white/60">
                Advanced data visualization for Blast Motion swing metrics
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black rounded-lg transition-all font-medium disabled:opacity-50"
            >
              {syncing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-black/20 border-r-black"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync Data
                </>
              )}
            </button>
          </div>

          {syncMessage && (
            <div className={`mb-6 p-4 rounded-lg ${
              syncMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/20 text-red-300'
            }`}>
              {syncMessage.text}
            </div>
          )}

          {/* Filters Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Athlete Selection */}
            <div className="glass-card shadow-premium rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Athletes</h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                  >
                    All
                  </button>
                  <button
                    onClick={deselectAll}
                    className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {athletes.map((athlete, index) => (
                  <label
                    key={athlete.id}
                    className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAthletes.has(athlete.id)}
                      onChange={() => toggleAthlete(athlete.id)}
                      className="w-4 h-4 rounded border-white/20 bg-white/10 text-[#9BDDFF] focus:ring-[#9BDDFF] focus:ring-offset-0"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ATHLETE_COLORS[index % ATHLETE_COLORS.length] }}
                      />
                      <span className="text-sm text-white">
                        {athlete.first_name} {athlete.last_name}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              {athletes.length === 0 && (
                <p className="text-sm text-white/50 text-center py-4">
                  No athletes with paired sensors
                </p>
              )}
            </div>

            {/* Date Filter */}
            <div className="glass-card shadow-premium rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Date Range</h3>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { value: '7d', label: '7 Days' },
                  { value: '1m', label: '1 Month' },
                  { value: '3m', label: '3 Months' },
                  { value: '6m', label: '6 Months' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setDateFilter(option.value as DateFilter)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dateFilter === option.value
                        ? 'bg-[#9BDDFF] text-black'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setDateFilter('custom')}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-3 ${
                  dateFilter === 'custom'
                    ? 'bg-[#9BDDFF] text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Custom Range
              </button>

              {dateFilter === 'custom' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-white/60">
                  {filteredData.length} swings in selected range
                </p>
              </div>
            </div>

            {/* Chart Settings */}
            <div className="glass-card shadow-premium rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Chart Settings</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/60 mb-2 block">X-Axis</label>
                  <select
                    value={xAxis}
                    onChange={(e) => setXAxis(e.target.value as MetricKey)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
                  >
                    {METRICS.map(metric => (
                      <option key={metric.value} value={metric.value} className="bg-[#0A0A0A]">
                        {metric.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-2 block">Y-Axis</label>
                  <select
                    value={yAxis}
                    onChange={(e) => setYAxis(e.target.value as MetricKey)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
                  >
                    {METRICS.map(metric => (
                      <option key={metric.value} value={metric.value} className="bg-[#0A0A0A]">
                        {metric.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRegression}
                    onChange={(e) => setShowRegression(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-[#9BDDFF] focus:ring-[#9BDDFF] focus:ring-offset-0"
                  />
                  <span className="text-sm text-white">Show Regression Line</span>
                </label>

                {regression && (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-white/60 mb-1">Regression Stats</p>
                    <p className="text-sm text-white">R² = {regression.r2.toFixed(4)}</p>
                    <p className="text-xs text-white/50 mt-1">
                      y = {regression.slope.toFixed(3)}x + {regression.intercept.toFixed(3)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="glass-card shadow-premium rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">
              {METRICS.find(m => m.value === yAxis)?.label} vs {METRICS.find(m => m.value === xAxis)?.label}
            </h3>

            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[600px]">
                <div className="text-center">
                  <svg className="w-16 h-16 text-white/20 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-white/60 mb-2">No data to display</p>
                  <p className="text-sm text-white/40">
                    Select athletes and ensure they have swing data in the selected date range
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={600}>
                <ComposedChart margin={{ top: 20, right: 20, bottom: 70, left: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    type="number"
                    dataKey={xAxis}
                    name={METRICS.find(m => m.value === xAxis)?.label}
                    stroke="#fff"
                    domain={['dataMin - 5', 'dataMax + 5']}
                    label={{
                      value: METRICS.find(m => m.value === xAxis)?.label,
                      position: 'insideBottom',
                      offset: -50,
                      style: { fill: '#fff', fontSize: 14 }
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey={yAxis}
                    name={METRICS.find(m => m.value === yAxis)?.label}
                    stroke="#fff"
                    domain={['dataMin - 5', 'dataMax + 5']}
                    label={{
                      value: METRICS.find(m => m.value === yAxis)?.label,
                      angle: -90,
                      position: 'insideLeft',
                      offset: -50,
                      style: { fill: '#fff', fontSize: 14 }
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10, 10, 10, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    labelStyle={{ color: '#9BDDFF' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />

                  {/* Scatter plots for each athlete */}
                  {dataByAthlete.map(({ athlete, data, color }) => (
                    data.length > 0 && (
                      <Scatter
                        key={athlete.id}
                        name={`${athlete.first_name} ${athlete.last_name}`}
                        data={data}
                        fill={color}
                        opacity={0.7}
                      />
                    )
                  ))}

                  {/* Regression line */}
                  {regression && showRegression && regressionLineData.length > 0 && (
                    <Line
                      type="monotone"
                      dataKey={yAxis}
                      data={regressionLineData}
                      stroke="#9BDDFF"
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      dot={false}
                      name={`Regression (R² = ${regression.r2.toFixed(3)})`}
                      legendType="line"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* iOS Install Instructions */}
          <div className="mt-12 pt-8 border-t border-white/5">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-xs text-white/30 mb-3">
                💡 Tip: Add this app to your home screen for a better experience
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-white/40">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-white/50">iOS:</span>
                  <span>Tap <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-white/5 rounded text-[10px]">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                    </svg>
                  </span> Share, then "Add to Home Screen"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-white/50">Android:</span>
                  <span>Tap <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-white/5 rounded text-[10px]">⋮</span> Menu, then "Add to Home screen"</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
