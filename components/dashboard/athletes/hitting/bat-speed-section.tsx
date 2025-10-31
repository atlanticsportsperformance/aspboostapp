'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface BatSpeedSectionProps {
  athleteId: string;
}

interface SwingSession {
  date: string;
  avgBatSpeed: number;
  maxBatSpeed: number;
  swingCount: number;
}

export default function BatSpeedSection({ athleteId }: BatSpeedSectionProps) {
  const [sessions, setSessions] = useState<SwingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    fetchBatSpeedData();
  }, [athleteId, timeRange]);

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
        .select('bat_speed, recorded_date')
        .eq('athlete_id', athleteId)
        .not('bat_speed', 'is', null)
        .order('recorded_date', { ascending: false });

      if (startDate) {
        query = query.gte('recorded_date', startDate.toISOString().split('T')[0]);
      }

      const { data: swings } = await query;

      if (!swings || swings.length === 0) {
        setSessions([]);
        return;
      }

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

      // Convert to array and calculate averages
      const sessionsArray: SwingSession[] = Object.entries(sessionsMap)
        .map(([date, data]) => ({
          date,
          avgBatSpeed: data.speeds.reduce((sum, speed) => sum + speed, 0) / data.speeds.length,
          maxBatSpeed: Math.max(...data.speeds),
          swingCount: data.count,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

  return (
    <div className="space-y-4">
      {/* Header with Time Range Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Bat Speed Analysis</h3>
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
