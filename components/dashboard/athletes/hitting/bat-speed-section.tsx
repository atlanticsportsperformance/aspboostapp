'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface BatSpeedSectionProps {
  athleteId: string;
}

interface SwingSession {
  date: string;
  avgBatSpeed: number;
  maxBatSpeed: number;
  swingCount: number;
  above90Percent: number;
  above90PercentOfAthleteMax: number;
}

const SWING_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'tee', label: 'Tee' },
  { value: 'soft toss', label: 'Soft Toss' },
  { value: 'front toss - overhand', label: 'Front Toss - Overhand' },
  { value: 'front toss - underhand', label: 'Front Toss - Underhand' },
  { value: 'live pitch', label: 'Live Pitch' },
  { value: 'pitching machine', label: 'Pitching Machine' },
  { value: 'in game', label: 'In Game' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'general practice', label: 'General Practice' },
];

export default function BatSpeedSection({ athleteId }: BatSpeedSectionProps) {
  const [sessions, setSessions] = useState<SwingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');

  useEffect(() => {
    fetchBatSpeedData();
  }, [athleteId, timeRange, environmentFilter]);

  async function fetchBatSpeedData() {
    try {
      setLoading(true);
      const supabase = createClient();

      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;

      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = null;
          break;
      }

      // Get swings
      let query = supabase
        .from('blast_swings')
        .select('bat_speed, recorded_date, swing_details')
        .eq('athlete_id', athleteId)
        .not('bat_speed', 'is', null)
        .order('recorded_date', { ascending: false });

      if (startDate) {
        query = query.gte('recorded_date', startDate.toISOString().split('T')[0]);
      }

      if (environmentFilter !== 'all') {
        query = query.eq('swing_details', environmentFilter);
      }

      const { data: swings } = await query;

      if (!swings || swings.length === 0) {
        setSessions([]);
        return;
      }

      // Calculate athlete's overall max bat speed (for consistency metric)
      const athleteMaxBatSpeed = Math.max(...swings.map(s => s.bat_speed || 0));
      const athleteMax90Percent = athleteMaxBatSpeed * 0.9;

      // Group by date and calculate stats
      const sessionsMap: Record<string, { speeds: number[]; count: number }> = {};

      swings.forEach(swing => {
        const date = swing.recorded_date;
        if (!sessionsMap[date]) {
          sessionsMap[date] = { speeds: [], count: 0 };
        }
        if (swing.bat_speed !== null) {
          sessionsMap[date].speeds.push(swing.bat_speed);
          sessionsMap[date].count++;
        }
      });

      // Convert to array and calculate averages + consistency metrics
      const sessionsArray: SwingSession[] = Object.entries(sessionsMap)
        .map(([date, data]) => {
          const sessionMaxBatSpeed = Math.max(...data.speeds);
          const sessionMax90Percent = sessionMaxBatSpeed * 0.9;

          // Calculate % of swings above 90% of session max
          const above90PercentSession = (data.speeds.filter(s => s >= sessionMax90Percent).length / data.speeds.length) * 100;

          // Calculate % of swings above 90% of athlete's all-time max
          const above90PercentAthlete = (data.speeds.filter(s => s >= athleteMax90Percent).length / data.speeds.length) * 100;

          return {
            date,
            avgBatSpeed: data.speeds.reduce((sum, speed) => sum + speed, 0) / data.speeds.length,
            maxBatSpeed: sessionMaxBatSpeed,
            swingCount: data.count,
            above90Percent: above90PercentSession,
            above90PercentOfAthleteMax: above90PercentAthlete,
          };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort ascending for charts

      setSessions(sessionsArray);
    } catch (error) {
      console.error('Error fetching bat speed data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate overall stats
  const allSpeeds = sessions.flatMap(s => [s.avgBatSpeed]);
  const overallAvg = allSpeeds.length > 0
    ? allSpeeds.reduce((sum, speed) => sum + speed, 0) / allSpeeds.length
    : 0;
  const overallMax = sessions.length > 0
    ? Math.max(...sessions.map(s => s.maxBatSpeed))
    : 0;
  const totalSwings = sessions.reduce((sum, s) => sum + s.swingCount, 0);

  // Find trend (compare first half to second half)
  const midPoint = Math.floor(sessions.length / 2);
  const recentHalf = sessions.slice(0, midPoint);
  const olderHalf = sessions.slice(midPoint);

  const recentAvg = recentHalf.length > 0
    ? recentHalf.reduce((sum, s) => sum + s.avgBatSpeed, 0) / recentHalf.length
    : 0;
  const olderAvg = olderHalf.length > 0
    ? olderHalf.reduce((sum, s) => sum + s.avgBatSpeed, 0) / olderHalf.length
    : 0;

  const trendPercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : null;

  // Format chart data
  const chartData = sessions.map(s => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    avg: Number(s.avgBatSpeed.toFixed(1)),
    max: Number(s.maxBatSpeed.toFixed(1)),
    sessionConsistency: Number(s.above90Percent.toFixed(1)),
    athleteConsistency: Number(s.above90PercentOfAthleteMax.toFixed(1)),
  }));

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Bat Speed Analysis</h3>
        <div className="flex flex-wrap gap-2">
          {/* Environment Filter */}
          <select
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value)}
            className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#9BDDFF]/50"
          >
            {SWING_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          {/* Time Range Filter */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#9BDDFF]/50"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 3 Months</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-12 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
            <span>Loading bat speed data...</span>
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
          <p className="text-gray-400">No bat speed data available for this time range</p>
        </div>
      ) : (
        <>
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-4">
              <p className="text-xs text-blue-400/80 mb-1 font-medium">AVG BAT SPEED</p>
              <p className="text-2xl font-bold text-white">{overallAvg.toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-1">mph</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-lg p-4">
              <p className="text-xs text-emerald-400/80 mb-1 font-medium">MAX BAT SPEED</p>
              <p className="text-2xl font-bold text-white">{overallMax.toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-1">mph</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg p-4">
              <p className="text-xs text-purple-400/80 mb-1 font-medium">TOTAL SWINGS</p>
              <p className="text-2xl font-bold text-white">{totalSwings}</p>
              <p className="text-xs text-gray-400 mt-1">swings</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-lg p-4">
              <p className="text-xs text-amber-400/80 mb-1 font-medium">TREND</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-white">
                  {trendPercent !== null ? `${trendPercent > 0 ? '+' : ''}${trendPercent.toFixed(1)}%` : 'N/A'}
                </p>
                {trendPercent !== null && trendPercent !== 0 && (
                  <div className={`${trendPercent > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      {trendPercent > 0 ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      )}
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">vs {sessions.length > 1 ? 'earlier period' : 'baseline'}</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Chart: Bat Speed Trend */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-4">Bat Speed Trend</h4>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'mph', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="max"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMax)"
                    name="Max Speed"
                  />
                  <Area
                    type="monotone"
                    dataKey="avg"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAvg)"
                    name="Avg Speed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Right Chart: Consistency */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-4">Consistency Metrics</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    label={{ value: '% Above 90%', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value: any) => [`${value}%`, '']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sessionConsistency"
                    stroke="#a855f7"
                    strokeWidth={3}
                    dot={{ fill: '#a855f7', r: 4 }}
                    name="% Above Session Max"
                  />
                  <Line
                    type="monotone"
                    dataKey="athleteConsistency"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', r: 4 }}
                    name="% Above Athlete Max"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Session History Table */}
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h4 className="text-sm font-semibold text-white">Session History</h4>
              <p className="text-xs text-gray-400 mt-1">
                Showing {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/40 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Swings
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Avg Speed<span className="block text-[10px] font-normal text-gray-500">mph</span>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Max Speed<span className="block text-[10px] font-normal text-gray-500">mph</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sessions.map((session) => (
                    <tr key={session.date} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-white font-medium">
                          {new Date(session.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-300">{session.swingCount}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold text-blue-400">
                          {session.avgBatSpeed.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold text-emerald-400">
                          {session.maxBatSpeed.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
