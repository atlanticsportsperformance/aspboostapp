'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface HittingProfileTabProps {
  athleteId: string;
  athleteName?: string;
}

interface Swing {
  id: string;
  recorded_date: string;
  recorded_time: string;
  swing_details: string | null;
  bat_speed: number | null;
  attack_angle: number | null;
  vertical_bat_angle: number | null;
  early_connection: number | null;
  connection_at_impact: number | null;
  peak_hand_speed: number | null;
  rotational_acceleration: number | null;
  plane_score: number | null;
  connection_score: number | null;
  rotation_score: number | null;
}

interface PaginationInfo {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

interface OverviewStats {
  last30Days: {
    totalSwings: number;
    percentChangeFromPrevious30: number | null;
  };
  recentSession: {
    date: string;
    avgBatSpeed: number;
    maxBatSpeed: number;
    avgAttackAngle: number;
    avgEarlyConnection: number;
    avgConnectionAtImpact: number;
    avgPeakHandSpeed: number;
    avgRotationalAcceleration: number;
  } | null;
  last30DayAverages: {
    avgBatSpeed: number;
    maxBatSpeed: number;
    avgAttackAngle: number;
    avgEarlyConnection: number;
    avgConnectionAtImpact: number;
    avgPeakHandSpeed: number;
    avgRotationalAcceleration: number;
  } | null;
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
  { value: 'undefined', label: 'Undefined' },
];

const TIME_RANGES = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 3 Months' },
  { value: 'all', label: 'All Time' },
];

export default function HittingProfileTab({ athleteId, athleteName }: HittingProfileTabProps) {
  const [blastPlayerId, setBlastPlayerId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [swingCount, setSwingCount] = useState<number>(0);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Swing data table state
  const [swings, setSwings] = useState<Swing[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [swingTypeFilter, setSwingTypeFilter] = useState<string>('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>('30d');

  // Overview stats
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    fetchBlastStatus();
    fetchSwingCount();
  }, [athleteId]);

  useEffect(() => {
    if (blastPlayerId) {
      fetchSwings();
      fetchOverviewStats();
    }
  }, [athleteId, currentPage, swingTypeFilter, timeRangeFilter, blastPlayerId]);

  async function fetchBlastStatus() {
    const supabase = createClient();
    const { data: athlete } = await supabase
      .from('athletes')
      .select('blast_player_id, blast_synced_at')
      .eq('id', athleteId)
      .single();

    setBlastPlayerId(athlete?.blast_player_id || null);
    setLastSynced(athlete?.blast_synced_at || null);
  }

  async function fetchSwingCount() {
    const supabase = createClient();
    const { count } = await supabase
      .from('blast_swings')
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', athleteId);

    setSwingCount(count || 0);
  }

  async function fetchOverviewStats() {
    const supabase = createClient();
    const now = new Date();

    // Calculate date ranges
    const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30DaysStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const previous30DaysEnd = last30DaysStart;

    // Get ALL swings for this athlete (not just last 30 days) - we'll filter in memory
    let allSwingsQuery = supabase
      .from('blast_swings')
      .select('bat_speed, attack_angle, early_connection, connection_at_impact, peak_hand_speed, rotational_acceleration, recorded_date')
      .eq('athlete_id', athleteId)
      .order('recorded_date', { ascending: false });

    if (swingTypeFilter !== 'all') {
      allSwingsQuery = allSwingsQuery.eq('swing_details', swingTypeFilter);
    }

    const { data: allSwings } = await allSwingsQuery;

    if (!allSwings || allSwings.length === 0) {
      setOverviewStats(null);
      return;
    }

    console.log('First 5 swing dates:', allSwings.slice(0, 5).map(s => s.recorded_date));
    console.log('Unique dates:', [...new Set(allSwings.map(s => s.recorded_date))].sort());

    // Filter for last 30 days
    const last30Swings = allSwings.filter(s => {
      const swingDate = new Date(s.recorded_date);
      return swingDate >= last30DaysStart;
    });

    // Filter for previous 30 days (days 31-60)
    const previous30Swings = allSwings.filter(s => {
      const swingDate = new Date(s.recorded_date);
      return swingDate >= previous30DaysStart && swingDate < previous30DaysEnd;
    });

    // Calculate percent change
    const last30Count = last30Swings.length;
    const previous30Count = previous30Swings.length;
    const percentChange = previous30Count > 0
      ? (last30Count - previous30Count) / previous30Count * 100
      : null;

    // Use last 30 days if we have them, otherwise use all data
    const swingsToUse = last30Swings.length > 0 ? last30Swings : allSwings;

    // Get most recent session date
    const uniqueDates = [...new Set(swingsToUse.map(s => s.recorded_date))].sort().reverse();
    const mostRecentDate = uniqueDates[0];

    // Get most recent session swings
    const recentSessionSwings = swingsToUse.filter(s => s.recorded_date === mostRecentDate);

    // Calculate MAX BAT SPEED for recent session (max from just that day)
    const recentSessionMaxBatSpeed = Math.max(...recentSessionSwings.map(s => s.bat_speed || 0));

    // Calculate recent session stats
    const recentSession = {
      date: mostRecentDate,
      avgBatSpeed: recentSessionSwings.reduce((sum, s) => sum + (s.bat_speed || 0), 0) / recentSessionSwings.filter(s => s.bat_speed).length,
      maxBatSpeed: recentSessionMaxBatSpeed, // Max from RECENT SESSION ONLY
      avgAttackAngle: recentSessionSwings.reduce((sum, s) => sum + (s.attack_angle || 0), 0) / recentSessionSwings.filter(s => s.attack_angle).length,
      avgEarlyConnection: recentSessionSwings.reduce((sum, s) => sum + (s.early_connection || 0), 0) / recentSessionSwings.filter(s => s.early_connection).length,
      avgConnectionAtImpact: recentSessionSwings.reduce((sum, s) => sum + (s.connection_at_impact || 0), 0) / recentSessionSwings.filter(s => s.connection_at_impact).length,
      avgPeakHandSpeed: recentSessionSwings.reduce((sum, s) => sum + (s.peak_hand_speed || 0), 0) / recentSessionSwings.filter(s => s.peak_hand_speed).length,
      avgRotationalAcceleration: recentSessionSwings.reduce((sum, s) => sum + (s.rotational_acceleration || 0), 0) / recentSessionSwings.filter(s => s.rotational_acceleration).length,
    };

    // Calculate 30-day averages EXCLUDING the most recent session (so we're comparing to the baseline)
    const swingsExcludingRecentSession = swingsToUse.filter(s => s.recorded_date !== mostRecentDate);

    // If no other swings, use all swings for comparison
    const averagesData = swingsExcludingRecentSession.length > 0 ? swingsExcludingRecentSession : swingsToUse;

    // For MAX BAT SPEED baseline: calculate average of daily max speeds (not just overall max)
    // Group swings by date and find max for each day
    const dailyMaxSpeeds: number[] = [];
    const datesForAverage = [...new Set(averagesData.map(s => s.recorded_date))];
    datesForAverage.forEach(date => {
      const daySwings = averagesData.filter(s => s.recorded_date === date);
      const dayMax = Math.max(...daySwings.map(s => s.bat_speed || 0));
      if (dayMax > 0) {
        dailyMaxSpeeds.push(dayMax);
      }
    });

    // Average of all daily max speeds over last 30 days (excluding recent session)
    const avgOfDailyMaxBatSpeeds = dailyMaxSpeeds.length > 0
      ? dailyMaxSpeeds.reduce((sum, max) => sum + max, 0) / dailyMaxSpeeds.length
      : 0;

    const last30DayAverages = {
      avgBatSpeed: averagesData.reduce((sum, s) => sum + (s.bat_speed || 0), 0) / averagesData.filter(s => s.bat_speed).length,
      maxBatSpeed: avgOfDailyMaxBatSpeeds, // AVERAGE of daily max bat speeds
      avgAttackAngle: averagesData.reduce((sum, s) => sum + (s.attack_angle || 0), 0) / averagesData.filter(s => s.attack_angle).length,
      avgEarlyConnection: averagesData.reduce((sum, s) => sum + (s.early_connection || 0), 0) / averagesData.filter(s => s.early_connection).length,
      avgConnectionAtImpact: averagesData.reduce((sum, s) => sum + (s.connection_at_impact || 0), 0) / averagesData.filter(s => s.connection_at_impact).length,
      avgPeakHandSpeed: averagesData.reduce((sum, s) => sum + (s.peak_hand_speed || 0), 0) / averagesData.filter(s => s.peak_hand_speed).length,
      avgRotationalAcceleration: averagesData.reduce((sum, s) => sum + (s.rotational_acceleration || 0), 0) / averagesData.filter(s => s.rotational_acceleration).length,
    };

    console.log('=== OVERVIEW STATS DEBUG ===');
    console.log('Last 30 days count:', last30Count);
    console.log('Previous 30 days count:', previous30Count);
    console.log('Percent change:', percentChange);
    console.log('Recent session:', recentSession);
    console.log('30-day averages:', last30DayAverages);
    console.log('Swings excluding recent:', swingsExcludingRecentSession.length);

    setOverviewStats({
      last30Days: {
        totalSwings: last30Count,
        percentChangeFromPrevious30: percentChange,
      },
      recentSession,
      last30DayAverages,
    });
  }

  async function fetchSwings() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '20',
        ...(swingTypeFilter !== 'all' && { swing_type: swingTypeFilter }),
        ...(timeRangeFilter !== 'all' && { time_range: timeRangeFilter }),
      });

      const response = await fetch(`/api/athletes/${athleteId}/blast/swings?${params}`);
      const data = await response.json();

      if (data.success) {
        setSwings(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching swings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync(daysBack: number = 365) {
    if (!blastPlayerId) return;

    try {
      setSyncing(true);

      // Start the sync (this may timeout on client side but continues on server)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      try {
        const response = await fetch(`/api/athletes/${athleteId}/blast/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ daysBack }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.message || 'Sync failed');
        }

        alert(`✅ Success! Synced ${data.results.inserted} new swing(s) from last ${daysBack} days\n(${data.results.skipped} already existed)`);
      } catch (fetchErr) {
        // If fetch times out or fails, the sync is likely still running on the server
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          alert(`⏳ Sync is taking longer than expected but is still running in the background.\n\nRefreshing data in 10 seconds...`);
          // Wait a bit for server to finish, then refresh
          await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
          throw fetchErr;
        }
      }

      // Refresh the data regardless of fetch timeout
      await fetchBlastStatus();
      await fetchSwingCount();
      await fetchSwings();
      await fetchOverviewStats();

      // Show success message after refresh
      alert('✅ Data refreshed! Check the swing count above.');
    } catch (err) {
      console.error('Sync error:', err);
      alert(`❌ Sync failed:\n\n${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  }

  function formatMetric(value: number | null, decimals: number = 1): string {
    if (value === null || isNaN(value)) return '--';
    return value.toFixed(decimals);
  }

  function getSwingTypeBadgeColor(type: string | null): string {
    if (!type) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    const normalized = type.toLowerCase();
    if (normalized.includes('game')) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (normalized.includes('live')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (normalized.includes('machine')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (normalized.includes('tee')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (normalized.includes('toss')) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    if (normalized.includes('assessment')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }

  return (
    <div className="space-y-4">
      {/* Content */}
      {!blastPlayerId ? (
        // Not Linked State
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 sm:p-8 text-center">
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">No Blast Motion Account Linked</h3>
              <p className="text-gray-400 text-sm">
                Link this athlete to their Blast Motion player account in the <strong>Settings</strong> tab to view hitting data.
              </p>
            </div>
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', 'settings');
                window.location.href = url.toString();
              }}
              className="px-4 py-2 bg-[#9BDDFF] text-black rounded-lg hover:bg-[#7BC5F0] transition-colors font-medium text-sm"
            >
              Go to Settings
            </button>
          </div>
        </div>
      ) : swingCount === 0 ? (
        // No Data State
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 sm:p-8 text-center">
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">No Swing Data Yet</h3>
              <p className="text-gray-400 text-sm">
                Go to the <strong>Settings</strong> tab to sync swing data from Blast Motion.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Linked State with Data
        <div className="space-y-4">
          {/* Overview Stats Cards */}
          {overviewStats && overviewStats.recentSession && overviewStats.last30DayAverages && (
            <div className="space-y-1">
              {/* Session Date Header */}
              <div className="text-[9px] text-gray-400">
                Recent: <span className="text-white font-medium">{new Date(overviewStats.recentSession.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {/* Total Swings (Last 30 Days) */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400 mb-1 font-medium">SWINGS</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-bold text-white leading-none">{overviewStats.last30Days.totalSwings}</p>
                    {overviewStats.last30Days.percentChangeFromPrevious30 !== null && (
                      <div className={`flex items-center gap-0.5 ${
                        overviewStats.last30Days.percentChangeFromPrevious30 > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {overviewStats.last30Days.percentChangeFromPrevious30 > 0 ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          )}
                        </svg>
                        <span className="text-[10px] font-bold">{Math.abs(overviewStats.last30Days.percentChangeFromPrevious30).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Avg Bat Speed */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400 mb-1 font-medium">BAT SPD</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-bold text-white leading-none">{formatMetric(overviewStats.recentSession.avgBatSpeed)}</p>
                    {overviewStats.last30DayAverages && (
                      <div className={`flex items-center gap-0.5 ${
                        overviewStats.recentSession.avgBatSpeed > overviewStats.last30DayAverages.avgBatSpeed
                          ? 'text-emerald-400'
                          : overviewStats.recentSession.avgBatSpeed < overviewStats.last30DayAverages.avgBatSpeed
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {overviewStats.recentSession.avgBatSpeed > overviewStats.last30DayAverages.avgBatSpeed ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          )}
                        </svg>
                        <span className="text-[10px] font-bold">{formatMetric(Math.abs(overviewStats.recentSession.avgBatSpeed - overviewStats.last30DayAverages.avgBatSpeed))}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Max Bat Speed */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400 mb-1 font-medium">MAX SPD</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-bold text-white leading-none">{formatMetric(overviewStats.recentSession.maxBatSpeed)}</p>
                    {overviewStats.last30DayAverages && (
                      <div className={`flex items-center gap-0.5 ${
                        overviewStats.recentSession.maxBatSpeed > overviewStats.last30DayAverages.maxBatSpeed
                          ? 'text-emerald-400'
                          : overviewStats.recentSession.maxBatSpeed < overviewStats.last30DayAverages.maxBatSpeed
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {overviewStats.recentSession.maxBatSpeed > overviewStats.last30DayAverages.maxBatSpeed ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          )}
                        </svg>
                        <span className="text-[11px] font-bold">{formatMetric(Math.abs(overviewStats.recentSession.maxBatSpeed - overviewStats.last30DayAverages.maxBatSpeed))}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Avg Attack Angle */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400 mb-1 font-medium">ATTACK</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-bold text-white leading-none">{formatMetric(overviewStats.recentSession.avgAttackAngle)}</p>
                    {overviewStats.last30DayAverages && (
                      <div className="flex items-center gap-0.5 text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {overviewStats.recentSession.avgAttackAngle > overviewStats.last30DayAverages.avgAttackAngle ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          )}
                        </svg>
                        <span className="text-[11px] font-bold">{formatMetric(Math.abs(overviewStats.recentSession.avgAttackAngle - overviewStats.last30DayAverages.avgAttackAngle))}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Early Connection */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400 mb-1 font-medium">EARLY</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-bold text-white leading-none">{formatMetric(overviewStats.recentSession.avgEarlyConnection)}</p>
                    {overviewStats.last30DayAverages && (
                      <div className={`flex items-center gap-0.5 ${
                        overviewStats.recentSession.avgEarlyConnection > overviewStats.last30DayAverages.avgEarlyConnection
                          ? 'text-emerald-400'
                          : overviewStats.recentSession.avgEarlyConnection < overviewStats.last30DayAverages.avgEarlyConnection
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {overviewStats.recentSession.avgEarlyConnection > overviewStats.last30DayAverages.avgEarlyConnection ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          )}
                        </svg>
                        <span className="text-[11px] font-bold">{formatMetric(Math.abs(overviewStats.recentSession.avgEarlyConnection - overviewStats.last30DayAverages.avgEarlyConnection))}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connection at Impact */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400 mb-1 font-medium">CONNECT</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-bold text-white leading-none">{formatMetric(overviewStats.recentSession.avgConnectionAtImpact)}</p>
                    {overviewStats.last30DayAverages && (
                      <div className={`flex items-center gap-0.5 ${
                        overviewStats.recentSession.avgConnectionAtImpact < overviewStats.last30DayAverages.avgConnectionAtImpact
                          ? 'text-emerald-400'
                          : overviewStats.recentSession.avgConnectionAtImpact > overviewStats.last30DayAverages.avgConnectionAtImpact
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {overviewStats.recentSession.avgConnectionAtImpact < overviewStats.last30DayAverages.avgConnectionAtImpact ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          )}
                        </svg>
                        <span className="text-[11px] font-bold">{formatMetric(Math.abs(overviewStats.recentSession.avgConnectionAtImpact - overviewStats.last30DayAverages.avgConnectionAtImpact))}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Peak Hand Speed */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400 mb-1 font-medium">HAND</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-bold text-white leading-none">{formatMetric(overviewStats.recentSession.avgPeakHandSpeed)}</p>
                    {overviewStats.last30DayAverages && (
                      <div className={`flex items-center gap-0.5 ${
                        overviewStats.recentSession.avgPeakHandSpeed > overviewStats.last30DayAverages.avgPeakHandSpeed
                          ? 'text-emerald-400'
                          : overviewStats.recentSession.avgPeakHandSpeed < overviewStats.last30DayAverages.avgPeakHandSpeed
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {overviewStats.recentSession.avgPeakHandSpeed > overviewStats.last30DayAverages.avgPeakHandSpeed ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          )}
                        </svg>
                        <span className="text-[11px] font-bold">{formatMetric(Math.abs(overviewStats.recentSession.avgPeakHandSpeed - overviewStats.last30DayAverages.avgPeakHandSpeed))}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rotational Acceleration */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400 mb-1 font-medium">ROT G</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-bold text-white leading-none">{formatMetric(overviewStats.recentSession.avgRotationalAcceleration)}</p>
                    {overviewStats.last30DayAverages && (
                      <div className={`flex items-center gap-0.5 ${
                        overviewStats.recentSession.avgRotationalAcceleration > overviewStats.last30DayAverages.avgRotationalAcceleration
                          ? 'text-emerald-400'
                          : overviewStats.recentSession.avgRotationalAcceleration < overviewStats.last30DayAverages.avgRotationalAcceleration
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {overviewStats.recentSession.avgRotationalAcceleration > overviewStats.last30DayAverages.avgRotationalAcceleration ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          )}
                        </svg>
                        <span className="text-[11px] font-bold">{formatMetric(Math.abs(overviewStats.recentSession.avgRotationalAcceleration - overviewStats.last30DayAverages.avgRotationalAcceleration))}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters + Swing Data Table */}
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            {/* Filter Bar */}
            <div className="p-3 sm:p-4 border-b border-white/10 space-y-3">
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
                {/* Time Range Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">Time:</span>
                  <select
                    value={timeRangeFilter}
                    onChange={(e) => {
                      setTimeRangeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-[#9BDDFF]/50"
                  >
                    {TIME_RANGES.map(range => (
                      <option key={range.value} value={range.value}>{range.label}</option>
                    ))}
                  </select>
                </div>

                {/* Swing Type Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">Type:</span>
                  <select
                    value={swingTypeFilter}
                    onChange={(e) => {
                      setSwingTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-[#9BDDFF]/50"
                  >
                    {SWING_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Result Count */}
              {pagination && (
                <div className="text-xs sm:text-sm text-gray-400">
                  Showing {((pagination.page - 1) * pagination.per_page) + 1}-{Math.min(pagination.page * pagination.per_page, pagination.total_count)} of {pagination.total_count} swings
                </div>
              )}
            </div>

            {/* Table - All Screen Sizes with Horizontal Scroll on Mobile */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/40 border-b border-white/10">
                  <tr>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider sticky left-0 bg-black/40">Date</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Bat Speed<span className="block text-[10px] font-normal text-gray-500">mph</span></th>
                    <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Attack<span className="block text-[10px] font-normal text-gray-500">deg</span></th>
                    <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Vert Bat<span className="block text-[10px] font-normal text-gray-500">deg</span></th>
                    <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Early Conn<span className="block text-[10px] font-normal text-gray-500">deg</span></th>
                    <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Conn Impact<span className="block text-[10px] font-normal text-gray-500">deg</span></th>
                    <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Peak Hand<span className="block text-[10px] font-normal text-gray-500">mph</span></th>
                    <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Rot Accel<span className="block text-[10px] font-normal text-gray-500">g</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-400">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                          <span className="text-xs md:text-sm">Loading swings...</span>
                        </div>
                      </td>
                    </tr>
                  ) : swings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-xs md:text-sm text-gray-400">
                        No swings found for selected filters
                      </td>
                    </tr>
                  ) : (
                    swings.map((swing) => (
                      <tr key={swing.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-3 md:px-4 py-3 whitespace-nowrap sticky left-0 bg-black/20 backdrop-blur-sm">
                          <div className="text-xs md:text-sm text-white font-medium">{new Date(swing.recorded_date).toLocaleDateString()}</div>
                          <div className="text-[10px] md:text-xs text-gray-500">{swing.recorded_time}</div>
                        </td>
                        <td className="px-3 md:px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-md text-[10px] md:text-xs font-medium border ${getSwingTypeBadgeColor(swing.swing_details)}`}>
                            {swing.swing_details || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-3 text-center">
                          <span className="text-xs md:text-sm font-semibold text-[#9BDDFF]">{formatMetric(swing.bat_speed)}</span>
                        </td>
                        <td className="px-3 md:px-4 py-3 text-center">
                          <span className="text-xs md:text-sm text-white">{formatMetric(swing.attack_angle)}</span>
                        </td>
                        <td className="px-3 md:px-4 py-3 text-center">
                          <span className="text-xs md:text-sm text-white">{formatMetric(swing.vertical_bat_angle)}</span>
                        </td>
                        <td className="px-3 md:px-4 py-3 text-center">
                          <span className="text-xs md:text-sm text-white">{formatMetric(swing.early_connection)}</span>
                        </td>
                        <td className="px-3 md:px-4 py-3 text-center">
                          <span className="text-xs md:text-sm text-white">{formatMetric(swing.connection_at_impact)}</span>
                        </td>
                        <td className="px-3 md:px-4 py-3 text-center">
                          <span className="text-xs md:text-sm text-white">{formatMetric(swing.peak_hand_speed)}</span>
                        </td>
                        <td className="px-3 md:px-4 py-3 text-center">
                          <span className="text-xs md:text-sm text-white">{formatMetric(swing.rotational_acceleration)}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="p-3 sm:p-4 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={!pagination.has_prev_page || loading}
                  className="px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs sm:text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-400">
                    Page {pagination.page} of {pagination.total_pages}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!pagination.has_next_page || loading}
                  className="px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs sm:text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
