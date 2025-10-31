'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import BatSpeedSection from './hitting/bat-speed-section';
import PairedDataSection from './hitting/paired-data-section';

interface HittingProfileTabProps {
  athleteId: string;
  athleteName?: string;
}

type ViewMode = 'overview' | 'batspeed' | 'paireddata';

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
  totalSwingsAllTime: number;
  totalSwingsLast30Days: number;
  qualifiedSwingsLast30Days: number;
  highestBatSpeedPR: number;
  avgBatSpeedLast30Days: number;
  avgBatSpeedPrevious30Days: number;
  avgAttackAngleLast30Days: number;
  avgAttackAnglePrevious30Days: number;
  percentSwingsInOptimalRange: number;
  avgEarlyConnectionLast30Days: number;
  avgEarlyConnectionPrevious30Days: number;
  avgConnectionAtImpactLast30Days: number;
  avgConnectionAtImpactPrevious30Days: number;
  avgPeakHandSpeedLast30Days: number;
  avgPeakHandSpeedPrevious30Days: number;
  avgTimeToContactLast30Days: number;
  avgTimeToContactPrevious30Days: number;
  avgSwingEfficiencyLast30Days: number;
  avgSwingEfficiencyPrevious30Days: number;
  avgRotationalAccelerationLast30Days: number;
  avgRotationalAccelerationPrevious30Days: number;
  // HitTrax metrics
  hittraxTotalSwingsAllTime: number;
  hittraxTotalSwingsLast30Days: number;
  hittraxMaxExitVelocity: number | null;
  hittraxAvgExitVelocityLast30Days: number | null;
  hittraxMaxDistance: number | null;
  hittraxAvgDistanceLast30Days: number | null;
  hittraxAvgLaunchAngleLast30Days: number | null;
  hittraxPercentSwingsInOptimalLaunchAngle: number;
  hittraxAvgPoiYLast30Days: number | null; // Point of Impact depth (Y coordinate)
  hittraxPercentSwingsOutOfZone: number;
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
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
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

    // ========== BLAST MOTION DATA ==========

    // Get total count of all swings for this athlete
    const { count: totalSwingsAllTime } = await supabase
      .from('blast_swings')
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', athleteId);

    // Get swings for last 60 days (for 30-day comparisons)
    const { data: last60DaysSwings } = await supabase
      .from('blast_swings')
      .select('bat_speed, attack_angle, swing_details, recorded_date, early_connection, connection_at_impact, peak_hand_speed, time_to_contact, on_plane_efficiency, rotational_acceleration')
      .eq('athlete_id', athleteId)
      .gte('recorded_date', previous30DaysStart.toISOString().split('T')[0])
      .order('recorded_date', { ascending: false })
      .limit(10000);

    // Get ALL swings for all-time metrics (PR bat speed)
    const { data: allTimeSwings } = await supabase
      .from('blast_swings')
      .select('bat_speed')
      .eq('athlete_id', athleteId)
      .not('bat_speed', 'is', null)
      .order('bat_speed', { ascending: false })
      .limit(1);

    // ========== HITTRAX DATA ==========

    // Get all HitTrax swings for this athlete (through sessions)
    const { data: hittraxSessions } = await supabase
      .from('hittrax_sessions')
      .select('id, session_date')
      .eq('athlete_id', athleteId)
      .order('session_date', { ascending: false });

    const sessionIds = hittraxSessions?.map(s => s.id) || [];

    let hittraxTotalSwingsAllTime = 0;
    let hittraxTotalSwingsLast30Days = 0;
    let hittraxMaxExitVelocity = null;
    let hittraxAvgExitVelocityLast30Days = null;
    let hittraxMaxDistance = null;
    let hittraxAvgDistanceLast30Days = null;
    let hittraxAvgLaunchAngleLast30Days = null;
    let hittraxPercentSwingsInOptimalLaunchAngle = 0;
    let hittraxAvgPoiYLast30Days = null;
    let hittraxPercentSwingsOutOfZone = 0;

    if (sessionIds.length > 0) {
      // Get all HitTrax swings for these sessions
      const { count: hittraxAllTimeCount } = await supabase
        .from('hittrax_swings')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds);

      hittraxTotalSwingsAllTime = hittraxAllTimeCount || 0;

      // Get swings from last 30 days with all needed fields
      const sessionIdsLast30 = hittraxSessions
        ?.filter(s => new Date(s.session_date) >= last30DaysStart)
        .map(s => s.id) || [];

      if (sessionIdsLast30.length > 0) {
        const { data: hittraxLast30Swings } = await supabase
          .from('hittrax_swings')
          .select('exit_velocity, launch_angle, distance, poi_y, strike_zone')
          .in('session_id', sessionIdsLast30)
          .order('created_at', { ascending: false });

        hittraxTotalSwingsLast30Days = hittraxLast30Swings?.length || 0;

        if (hittraxLast30Swings && hittraxLast30Swings.length > 0) {
          // Filter for contact swings (exit velocity > 0)
          const contactSwings = hittraxLast30Swings.filter(s => s.exit_velocity && s.exit_velocity > 0);

          if (contactSwings.length > 0) {
            // Exit velocity stats
            const exitVelocities = contactSwings.map(s => s.exit_velocity!).filter(v => v !== null);
            hittraxMaxExitVelocity = Math.max(...exitVelocities);
            hittraxAvgExitVelocityLast30Days = exitVelocities.reduce((sum, v) => sum + v, 0) / exitVelocities.length;

            // Distance stats
            const distances = contactSwings.map(s => s.distance).filter((d): d is number => d !== null && d > 0);
            if (distances.length > 0) {
              hittraxMaxDistance = Math.max(...distances);
              hittraxAvgDistanceLast30Days = distances.reduce((sum, d) => sum + d, 0) / distances.length;
            }

            // Launch angle stats
            const launchAngles = contactSwings.map(s => s.launch_angle).filter((a): a is number => a !== null);
            if (launchAngles.length > 0) {
              hittraxAvgLaunchAngleLast30Days = launchAngles.reduce((sum, a) => sum + a, 0) / launchAngles.length;

              // Optimal launch angle range: 7-22 degrees
              const swingsInOptimalLaunchAngle = launchAngles.filter(a => a >= 7 && a <= 22).length;
              hittraxPercentSwingsInOptimalLaunchAngle = (swingsInOptimalLaunchAngle / launchAngles.length) * 100;
            }

            // Point of Impact Y (depth) - average for all contact swings
            const poiYValues = contactSwings.map(s => s.poi_y).filter((y): y is number => y !== null);
            if (poiYValues.length > 0) {
              hittraxAvgPoiYLast30Days = poiYValues.reduce((sum, y) => sum + y, 0) / poiYValues.length;
            }

            // Swings out of strike zone (strike_zone null or 0 typically means out of zone)
            // Note: This is a rough approximation - HitTrax strike zones 1-13 are in zone
            const totalSwingsWithStrikeZoneData = hittraxLast30Swings.filter(s => s.strike_zone !== null && s.strike_zone !== undefined);
            if (totalSwingsWithStrikeZoneData.length > 0) {
              const outOfZoneSwings = totalSwingsWithStrikeZoneData.filter(s => s.strike_zone === 0 || s.strike_zone === null).length;
              hittraxPercentSwingsOutOfZone = (outOfZoneSwings / totalSwingsWithStrikeZoneData.length) * 100;
            }
          }
        }
      }
    }

    if (!last60DaysSwings || last60DaysSwings.length === 0) {
      // If no Blast data but we have HitTrax data, still show HitTrax stats
      if (hittraxTotalSwingsAllTime > 0) {
        setOverviewStats({
          totalSwingsAllTime: 0,
          totalSwingsLast30Days: 0,
          qualifiedSwingsLast30Days: 0,
          highestBatSpeedPR: 0,
          avgBatSpeedLast30Days: 0,
          avgBatSpeedPrevious30Days: 0,
          avgAttackAngleLast30Days: 0,
          avgAttackAnglePrevious30Days: 0,
          percentSwingsInOptimalRange: 0,
          avgEarlyConnectionLast30Days: 0,
          avgEarlyConnectionPrevious30Days: 0,
          avgConnectionAtImpactLast30Days: 0,
          avgConnectionAtImpactPrevious30Days: 0,
          avgPeakHandSpeedLast30Days: 0,
          avgPeakHandSpeedPrevious30Days: 0,
          avgTimeToContactLast30Days: 0,
          avgTimeToContactPrevious30Days: 0,
          avgSwingEfficiencyLast30Days: 0,
          avgSwingEfficiencyPrevious30Days: 0,
          avgRotationalAccelerationLast30Days: 0,
          avgRotationalAccelerationPrevious30Days: 0,
          hittraxTotalSwingsAllTime,
          hittraxTotalSwingsLast30Days,
          hittraxMaxExitVelocity,
          hittraxAvgExitVelocityLast30Days,
          hittraxMaxDistance,
          hittraxAvgDistanceLast30Days,
          hittraxAvgLaunchAngleLast30Days,
          hittraxPercentSwingsInOptimalLaunchAngle,
          hittraxAvgPoiYLast30Days,
          hittraxPercentSwingsOutOfZone,
        });
      } else {
        setOverviewStats(null);
      }
      return;
    }

    // Filter for last 30 days
    const last30Swings = last60DaysSwings.filter(s => {
      const swingDate = new Date(s.recorded_date);
      return swingDate >= last30DaysStart;
    });

    // Filter for previous 30 days (days 31-60)
    const previous30Swings = last60DaysSwings.filter(s => {
      const swingDate = new Date(s.recorded_date);
      return swingDate >= previous30DaysStart && swingDate < previous30DaysEnd;
    });

    const totalSwingsLast30Days = last30Swings.length;

    // Qualified swings: Pitching Machine, Front Toss - Overhand, In Game, Live Pitch
    const qualifiedTypes = ['pitching machine', 'front toss - overhand', 'in game', 'live pitch'];
    const qualifiedSwingsLast30Days = last30Swings.filter(s =>
      s.swing_details && qualifiedTypes.includes(s.swing_details.toLowerCase())
    ).length;

    // Highest bat speed (Personal Record) - all time
    const highestBatSpeedPR = allTimeSwings && allTimeSwings.length > 0 ? allTimeSwings[0].bat_speed || 0 : 0;

    // Average bat speed last 30 days
    const batSpeedsLast30 = last30Swings.filter(s => s.bat_speed !== null).map(s => s.bat_speed!);
    const avgBatSpeedLast30Days = batSpeedsLast30.length > 0
      ? batSpeedsLast30.reduce((sum, speed) => sum + speed, 0) / batSpeedsLast30.length
      : 0;

    // Average bat speed previous 30 days
    const batSpeedsPrevious30 = previous30Swings.filter(s => s.bat_speed !== null).map(s => s.bat_speed!);
    const avgBatSpeedPrevious30Days = batSpeedsPrevious30.length > 0
      ? batSpeedsPrevious30.reduce((sum, speed) => sum + speed, 0) / batSpeedsPrevious30.length
      : 0;

    // Average attack angle last 30 days
    const attackAnglesLast30 = last30Swings.filter(s => s.attack_angle !== null).map(s => s.attack_angle!);
    const avgAttackAngleLast30Days = attackAnglesLast30.length > 0
      ? attackAnglesLast30.reduce((sum, angle) => sum + angle, 0) / attackAnglesLast30.length
      : 0;

    // Average attack angle previous 30 days
    const attackAnglesPrevious30 = previous30Swings.filter(s => s.attack_angle !== null).map(s => s.attack_angle!);
    const avgAttackAnglePrevious30Days = attackAnglesPrevious30.length > 0
      ? attackAnglesPrevious30.reduce((sum, angle) => sum + angle, 0) / attackAnglesPrevious30.length
      : 0;

    // Percent of swings in optimal attack angle range (5-20 degrees)
    const swingsInOptimalRange = attackAnglesLast30.filter(angle => angle >= 5 && angle <= 20).length;
    const percentSwingsInOptimalRange = attackAnglesLast30.length > 0
      ? (swingsInOptimalRange / attackAnglesLast30.length) * 100
      : 0;

    // Average early connection last 30 days
    const earlyConnectionLast30 = last30Swings.filter(s => s.early_connection !== null).map(s => s.early_connection!);
    const avgEarlyConnectionLast30Days = earlyConnectionLast30.length > 0
      ? earlyConnectionLast30.reduce((sum, val) => sum + val, 0) / earlyConnectionLast30.length
      : 0;

    // Average early connection previous 30 days
    const earlyConnectionPrevious30 = previous30Swings.filter(s => s.early_connection !== null).map(s => s.early_connection!);
    const avgEarlyConnectionPrevious30Days = earlyConnectionPrevious30.length > 0
      ? earlyConnectionPrevious30.reduce((sum, val) => sum + val, 0) / earlyConnectionPrevious30.length
      : 0;

    // Average connection at impact last 30 days
    const connectionAtImpactLast30 = last30Swings.filter(s => s.connection_at_impact !== null).map(s => s.connection_at_impact!);
    const avgConnectionAtImpactLast30Days = connectionAtImpactLast30.length > 0
      ? connectionAtImpactLast30.reduce((sum, val) => sum + val, 0) / connectionAtImpactLast30.length
      : 0;

    // Average connection at impact previous 30 days
    const connectionAtImpactPrevious30 = previous30Swings.filter(s => s.connection_at_impact !== null).map(s => s.connection_at_impact!);
    const avgConnectionAtImpactPrevious30Days = connectionAtImpactPrevious30.length > 0
      ? connectionAtImpactPrevious30.reduce((sum, val) => sum + val, 0) / connectionAtImpactPrevious30.length
      : 0;

    // Average peak hand speed last 30 days
    const peakHandSpeedLast30 = last30Swings.filter(s => s.peak_hand_speed !== null).map(s => s.peak_hand_speed!);
    const avgPeakHandSpeedLast30Days = peakHandSpeedLast30.length > 0
      ? peakHandSpeedLast30.reduce((sum, val) => sum + val, 0) / peakHandSpeedLast30.length
      : 0;

    // Average peak hand speed previous 30 days
    const peakHandSpeedPrevious30 = previous30Swings.filter(s => s.peak_hand_speed !== null).map(s => s.peak_hand_speed!);
    const avgPeakHandSpeedPrevious30Days = peakHandSpeedPrevious30.length > 0
      ? peakHandSpeedPrevious30.reduce((sum, val) => sum + val, 0) / peakHandSpeedPrevious30.length
      : 0;

    // Average time to contact last 30 days
    const timeToContactLast30 = last30Swings.filter(s => s.time_to_contact !== null).map(s => s.time_to_contact!);
    const avgTimeToContactLast30Days = timeToContactLast30.length > 0
      ? timeToContactLast30.reduce((sum, val) => sum + val, 0) / timeToContactLast30.length
      : 0;

    // Average time to contact previous 30 days
    const timeToContactPrevious30 = previous30Swings.filter(s => s.time_to_contact !== null).map(s => s.time_to_contact!);
    const avgTimeToContactPrevious30Days = timeToContactPrevious30.length > 0
      ? timeToContactPrevious30.reduce((sum, val) => sum + val, 0) / timeToContactPrevious30.length
      : 0;

    // Average swing efficiency last 30 days
    const swingEfficiencyLast30 = last30Swings.filter(s => s.on_plane_efficiency !== null).map(s => s.on_plane_efficiency!);
    const avgSwingEfficiencyLast30Days = swingEfficiencyLast30.length > 0
      ? swingEfficiencyLast30.reduce((sum, val) => sum + val, 0) / swingEfficiencyLast30.length
      : 0;

    // Average swing efficiency previous 30 days
    const swingEfficiencyPrevious30 = previous30Swings.filter(s => s.on_plane_efficiency !== null).map(s => s.on_plane_efficiency!);
    const avgSwingEfficiencyPrevious30Days = swingEfficiencyPrevious30.length > 0
      ? swingEfficiencyPrevious30.reduce((sum, val) => sum + val, 0) / swingEfficiencyPrevious30.length
      : 0;

    // Average rotational acceleration last 30 days
    const rotationalAccelerationLast30 = last30Swings.filter(s => s.rotational_acceleration !== null).map(s => s.rotational_acceleration!);
    const avgRotationalAccelerationLast30Days = rotationalAccelerationLast30.length > 0
      ? rotationalAccelerationLast30.reduce((sum, val) => sum + val, 0) / rotationalAccelerationLast30.length
      : 0;

    // Average rotational acceleration previous 30 days
    const rotationalAccelerationPrevious30 = previous30Swings.filter(s => s.rotational_acceleration !== null).map(s => s.rotational_acceleration!);
    const avgRotationalAccelerationPrevious30Days = rotationalAccelerationPrevious30.length > 0
      ? rotationalAccelerationPrevious30.reduce((sum, val) => sum + val, 0) / rotationalAccelerationPrevious30.length
      : 0;

    setOverviewStats({
      totalSwingsAllTime: totalSwingsAllTime || 0,
      totalSwingsLast30Days,
      qualifiedSwingsLast30Days,
      highestBatSpeedPR,
      avgBatSpeedLast30Days,
      avgBatSpeedPrevious30Days,
      avgAttackAngleLast30Days,
      avgAttackAnglePrevious30Days,
      percentSwingsInOptimalRange,
      avgEarlyConnectionLast30Days,
      avgEarlyConnectionPrevious30Days,
      avgConnectionAtImpactLast30Days,
      avgConnectionAtImpactPrevious30Days,
      avgPeakHandSpeedLast30Days,
      avgPeakHandSpeedPrevious30Days,
      avgTimeToContactLast30Days,
      avgTimeToContactPrevious30Days,
      avgSwingEfficiencyLast30Days,
      avgSwingEfficiencyPrevious30Days,
      avgRotationalAccelerationLast30Days,
      avgRotationalAccelerationPrevious30Days,
      hittraxTotalSwingsAllTime,
      hittraxTotalSwingsLast30Days,
      hittraxMaxExitVelocity,
      hittraxAvgExitVelocityLast30Days,
      hittraxMaxDistance,
      hittraxAvgDistanceLast30Days,
      hittraxAvgLaunchAngleLast30Days,
      hittraxPercentSwingsInOptimalLaunchAngle,
      hittraxAvgPoiYLast30Days,
      hittraxPercentSwingsOutOfZone,
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
      {/* Header with Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
        {/* Left: Title */}
        <div className="flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Hitting Profile</h2>
        </div>

        {/* Right: Tab Navigation */}
        <div className="w-full md:w-auto">
          {/* Desktop: Horizontal Tabs */}
          <div className="hidden md:flex gap-1 bg-black/40 rounded-lg p-1">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
                viewMode === 'overview'
                  ? 'bg-[#9BDDFF] text-black'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('batspeed')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
                viewMode === 'batspeed'
                  ? 'bg-[#9BDDFF] text-black'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Bat Speed
            </button>
            <button
              onClick={() => setViewMode('paireddata')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
                viewMode === 'paireddata'
                  ? 'bg-[#9BDDFF] text-black'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Paired Data
            </button>
          </div>

          {/* Mobile: Dropdown */}
          <div className="md:hidden">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]/50"
            >
              <option value="overview">Overview</option>
              <option value="batspeed">Bat Speed</option>
              <option value="paireddata">Paired Data</option>
            </select>
          </div>
        </div>
      </div>

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
              <h3 className="text-sm sm:text-lg font-semibold text-white mb-2">No Blast Motion Account Linked</h3>
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
              <h3 className="text-sm sm:text-lg font-semibold text-white mb-2">No Swing Data Yet</h3>
              <p className="text-gray-400 text-sm">
                Go to the <strong>Settings</strong> tab to sync swing data from Blast Motion.
              </p>
            </div>
          </div>
        </div>
      ) : viewMode === 'batspeed' ? (
        // Bat Speed Tab
        <BatSpeedSection athleteId={athleteId} />
      ) : viewMode === 'paireddata' ? (
        // Paired Data Tab
        <PairedDataSection athleteId={athleteId} />
      ) : (
        // Linked State with Data - Overview Tab
        <div className="space-y-4">
          {/* Overview Stats Cards */}
          {overviewStats && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {/* Card 1: Blast / HitTrax Swings */}
              <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-lg p-3 sm:p-4 backdrop-blur-sm shadow-lg">
                <h4 className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 sm:mb-3">BLAST / HITTRAX SWINGS</h4>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {/* Left: Blast Motion */}
                  <div className="space-y-2 sm:space-y-3">
                    <div>
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">Blast All Time</p>
                      <p className="text-base sm:text-xl font-bold text-white">{overviewStats.totalSwingsAllTime.toLocaleString()}</p>
                    </div>
                    <div className="pt-1.5 sm:pt-2 border-t border-white/10">
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">Blast Last 30 Days</p>
                      <p className="text-sm sm:text-base font-semibold text-white">{overviewStats.totalSwingsLast30Days.toLocaleString()}</p>
                      <p className="text-[7px] sm:text-[8px] text-gray-500 mt-0.5 sm:mt-1">Qualified: {overviewStats.qualifiedSwingsLast30Days}</p>
                    </div>
                  </div>
                  {/* Right: HitTrax */}
                  <div className="space-y-2 sm:space-y-3 border-l border-white/10 pl-2 sm:pl-3">
                    <div>
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">HitTrax All Time</p>
                      <p className="text-base sm:text-xl font-bold text-white">{overviewStats.hittraxTotalSwingsAllTime.toLocaleString()}</p>
                    </div>
                    <div className="pt-1.5 sm:pt-2 border-t border-white/10">
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">HitTrax Last 30 Days</p>
                      <p className="text-sm sm:text-base font-semibold text-white">{overviewStats.hittraxTotalSwingsLast30Days.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Bat Speed / Exit Velocity / Distance */}
              <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-lg p-3 sm:p-4 backdrop-blur-sm shadow-lg">
                <h4 className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 sm:mb-3">BAT SPEED / EXIT VELO / DISTANCE</h4>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {/* Column 1: Blast Bat Speed */}
                  <div className="space-y-2 sm:space-y-3">
                    <div>
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">Blast Best</p>
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                        <p className="text-sm sm:text-base font-bold text-white">{formatMetric(overviewStats.highestBatSpeedPR)}</p>
                      </div>
                      <p className="text-[7px] sm:text-[8px] text-gray-500">mph</p>
                    </div>
                    <div className="pt-1.5 sm:pt-2 border-t border-white/10">
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">Avg (30d)</p>
                      <p className="text-xs sm:text-sm font-semibold text-white">{formatMetric(overviewStats.avgBatSpeedLast30Days)} mph</p>
                    </div>
                  </div>

                  {/* Column 2: HitTrax Exit Velocity */}
                  <div className="space-y-2 sm:space-y-3 border-l border-white/10 pl-2 sm:pl-3">
                    <div>
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">HTX Best</p>
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                        <p className="text-sm sm:text-base font-bold text-white">{formatMetric(overviewStats.hittraxMaxExitVelocity)}</p>
                      </div>
                      <p className="text-[7px] sm:text-[8px] text-gray-500">mph EV</p>
                    </div>
                    <div className="pt-1.5 sm:pt-2 border-t border-white/10">
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">Avg (30d)</p>
                      <p className="text-xs sm:text-sm font-semibold text-white">{formatMetric(overviewStats.hittraxAvgExitVelocityLast30Days)} mph</p>
                    </div>
                  </div>

                  {/* Column 3: HitTrax Distance */}
                  <div className="space-y-2 sm:space-y-3 border-l border-white/10 pl-2 sm:pl-3">
                    <div>
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">HTX Best</p>
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                        <p className="text-sm sm:text-base font-bold text-white">{formatMetric(overviewStats.hittraxMaxDistance)}</p>
                      </div>
                      <p className="text-[7px] sm:text-[8px] text-gray-500">feet</p>
                    </div>
                    <div className="pt-1.5 sm:pt-2 border-t border-white/10">
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">Avg (30d)</p>
                      <p className="text-xs sm:text-sm font-semibold text-white">{formatMetric(overviewStats.hittraxAvgDistanceLast30Days)} ft</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Attack Angle / Launch Angle */}
              <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-lg p-3 sm:p-4 backdrop-blur-sm shadow-lg">
                <h4 className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 sm:mb-3">ATTACK ANGLE / LAUNCH ANGLE</h4>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {/* Left: Blast Attack Angle */}
                  <div className="space-y-2 sm:space-y-3">
                    <div>
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">Blast Avg (30d)</p>
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        <p className="text-base sm:text-xl font-bold text-white">{formatMetric(overviewStats.avgAttackAngleLast30Days)}°</p>
                        {(() => {
                          const change = overviewStats.avgAttackAngleLast30Days - overviewStats.avgAttackAnglePrevious30Days;
                          const percentChange = overviewStats.avgAttackAnglePrevious30Days !== 0
                            ? (change / Math.abs(overviewStats.avgAttackAnglePrevious30Days)) * 100
                            : 0;
                          return (
                            <div className={`flex items-center gap-0.5 sm:gap-1 ${
                              change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-gray-400'
                            }`}>
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                {change > 0 ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                )}
                              </svg>
                              <span className="text-[10px] sm:text-xs font-bold">{Math.abs(percentChange).toFixed(1)}%</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="pt-1.5 sm:pt-2 border-t border-white/10">
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">% in Optimal (5-20°)</p>
                      <p className="text-sm sm:text-base font-semibold text-white">{formatMetric(overviewStats.percentSwingsInOptimalRange)}%</p>
                    </div>
                  </div>
                  {/* Right: HitTrax Launch Angle */}
                  <div className="space-y-2 sm:space-y-3 border-l border-white/10 pl-2 sm:pl-3">
                    <div>
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">HitTrax Avg (30d)</p>
                      <p className="text-base sm:text-xl font-bold text-white">{formatMetric(overviewStats.hittraxAvgLaunchAngleLast30Days)}°</p>
                    </div>
                    <div className="pt-1.5 sm:pt-2 border-t border-white/10">
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">% in Optimal (7-22°)</p>
                      <p className="text-sm sm:text-base font-semibold text-white">{formatMetric(overviewStats.hittraxPercentSwingsInOptimalLaunchAngle)}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Connection / Point of Contact */}
              <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-lg p-3 sm:p-4 backdrop-blur-sm shadow-lg">
                <h4 className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 sm:mb-3">CONNECTION / POINT OF CONTACT</h4>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {/* Left: Blast Connection */}
                  <div className="space-y-2 sm:space-y-3">
                    <div>
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">Blast Early Conn (30d)</p>
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        <p className="text-sm sm:text-base font-semibold text-white">{formatMetric(overviewStats.avgEarlyConnectionLast30Days)}°</p>
                        {(() => {
                          const change = overviewStats.avgEarlyConnectionLast30Days - overviewStats.avgEarlyConnectionPrevious30Days;
                          const percentChange = overviewStats.avgEarlyConnectionPrevious30Days !== 0
                            ? (change / Math.abs(overviewStats.avgEarlyConnectionPrevious30Days)) * 100
                            : 0;
                          // Closer to 90 is better (inverted logic)
                          const dist = Math.abs(overviewStats.avgEarlyConnectionLast30Days - 90);
                          const prevDist = Math.abs(overviewStats.avgEarlyConnectionPrevious30Days - 90);
                          const isImproving = dist < prevDist;
                          return (
                            <div className={`flex items-center gap-0.5 sm:gap-1 ${
                              isImproving ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                {isImproving ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                )}
                              </svg>
                              <span className="text-[10px] sm:text-xs font-bold">{Math.abs(percentChange).toFixed(1)}%</span>
                            </div>
                          );
                        })()}
                      </div>
                      <p className="text-[7px] sm:text-[8px] text-gray-500 mt-0.5">Target: 90°</p>
                    </div>
                    <div className="pt-1.5 sm:pt-2 border-t border-white/10">
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">Blast At Impact (30d)</p>
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        <p className="text-sm sm:text-base font-semibold text-white">{formatMetric(overviewStats.avgConnectionAtImpactLast30Days)}°</p>
                        {(() => {
                          const change = overviewStats.avgConnectionAtImpactLast30Days - overviewStats.avgConnectionAtImpactPrevious30Days;
                          const percentChange = overviewStats.avgConnectionAtImpactPrevious30Days !== 0
                            ? (change / Math.abs(overviewStats.avgConnectionAtImpactPrevious30Days)) * 100
                            : 0;
                          // Closer to 90 is better (inverted logic)
                          const dist = Math.abs(overviewStats.avgConnectionAtImpactLast30Days - 90);
                          const prevDist = Math.abs(overviewStats.avgConnectionAtImpactPrevious30Days - 90);
                          const isImproving = dist < prevDist;
                          return (
                            <div className={`flex items-center gap-0.5 sm:gap-1 ${
                              isImproving ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                {isImproving ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                )}
                              </svg>
                              <span className="text-[10px] sm:text-xs font-bold">{Math.abs(percentChange).toFixed(1)}%</span>
                            </div>
                          );
                        })()}
                      </div>
                      <p className="text-[7px] sm:text-[8px] text-gray-500 mt-0.5">Target: 90°</p>
                    </div>
                  </div>
                  {/* Right: HitTrax Point of Contact */}
                  <div className="space-y-2 sm:space-y-3 border-l border-white/10 pl-2 sm:pl-3">
                    <div>
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">HitTrax Avg POI Depth</p>
                      <p className="text-base sm:text-xl font-bold text-white">{formatMetric(overviewStats.hittraxAvgPoiYLast30Days)}"</p>
                      <p className="text-[7px] sm:text-[8px] text-gray-500 mt-0.5">(Last 30 Days)</p>
                    </div>
                    <div className="pt-1.5 sm:pt-2 border-t border-white/10">
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">% Swings Out of Zone</p>
                      <p className="text-sm sm:text-base font-semibold text-white">{formatMetric(overviewStats.hittraxPercentSwingsOutOfZone)}%</p>
                      <p className="text-[7px] sm:text-[8px] text-gray-500 mt-0.5">(Last 30 Days)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 5: Peak Hand Speed */}
              <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-lg p-3 sm:p-4 backdrop-blur-sm shadow-lg">
                <h4 className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 sm:mb-3">PEAK HAND SPEED</h4>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">Avg Last 30 Days</p>
                    <div className="flex items-baseline gap-2 sm:gap-3">
                      <p className="text-lg sm:text-2xl font-bold text-white">{formatMetric(overviewStats.avgPeakHandSpeedLast30Days)} mph</p>
                      {(() => {
                        const change = overviewStats.avgPeakHandSpeedLast30Days - overviewStats.avgPeakHandSpeedPrevious30Days;
                        const percentChange = overviewStats.avgPeakHandSpeedPrevious30Days > 0
                          ? (change / overviewStats.avgPeakHandSpeedPrevious30Days) * 100
                          : 0;
                        return (
                          <div className={`flex items-center gap-1 sm:gap-2 ${
                            change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            <svg className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              {change > 0 ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                              )}
                            </svg>
                            <span className="text-sm sm:text-lg font-bold">{Math.abs(percentChange).toFixed(1)}%</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 6: Time to Contact */}
              <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-lg p-3 sm:p-4 backdrop-blur-sm shadow-lg">
                <h4 className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 sm:mb-3">TIME TO CONTACT</h4>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">Avg Last 30 Days</p>
                    <div className="flex items-baseline gap-2 sm:gap-3">
                      <p className="text-lg sm:text-2xl font-bold text-white">{formatMetric(overviewStats.avgTimeToContactLast30Days, 2)} s</p>
                      {(() => {
                        const change = overviewStats.avgTimeToContactLast30Days - overviewStats.avgTimeToContactPrevious30Days;
                        const percentChange = overviewStats.avgTimeToContactPrevious30Days > 0
                          ? (change / overviewStats.avgTimeToContactPrevious30Days) * 100
                          : 0;
                        // Lower is better for time to contact
                        return (
                          <div className={`flex items-center gap-1 sm:gap-2 ${
                            change < 0 ? 'text-emerald-400' : change > 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            <svg className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              {change < 0 ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                              )}
                            </svg>
                            <span className="text-sm sm:text-lg font-bold">{Math.abs(percentChange).toFixed(1)}%</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 7: Swing Efficiency */}
              <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-lg p-3 sm:p-4 backdrop-blur-sm shadow-lg">
                <h4 className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 sm:mb-3">SWING EFFICIENCY</h4>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">Avg Last 30 Days</p>
                    <div className="flex items-baseline gap-2 sm:gap-3">
                      <p className="text-lg sm:text-2xl font-bold text-white">{formatMetric(overviewStats.avgSwingEfficiencyLast30Days)}%</p>
                      {(() => {
                        const change = overviewStats.avgSwingEfficiencyLast30Days - overviewStats.avgSwingEfficiencyPrevious30Days;
                        const percentChange = overviewStats.avgSwingEfficiencyPrevious30Days > 0
                          ? (change / overviewStats.avgSwingEfficiencyPrevious30Days) * 100
                          : 0;
                        return (
                          <div className={`flex items-center gap-1 sm:gap-2 ${
                            change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            <svg className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              {change > 0 ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                              )}
                            </svg>
                            <span className="text-sm sm:text-lg font-bold">{Math.abs(percentChange).toFixed(1)}%</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 8: Rotational Acceleration */}
              <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-lg p-3 sm:p-4 backdrop-blur-sm shadow-lg">
                <h4 className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 sm:mb-3">ROTATIONAL ACCEL</h4>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <p className="text-[8px] sm:text-[9px] text-gray-500 mb-0.5 sm:mb-1">Avg Last 30 Days</p>
                    <div className="flex items-baseline gap-2 sm:gap-3">
                      <p className="text-lg sm:text-2xl font-bold text-white">{formatMetric(overviewStats.avgRotationalAccelerationLast30Days)} g</p>
                      {(() => {
                        const change = overviewStats.avgRotationalAccelerationLast30Days - overviewStats.avgRotationalAccelerationPrevious30Days;
                        const percentChange = overviewStats.avgRotationalAccelerationPrevious30Days > 0
                          ? (change / overviewStats.avgRotationalAccelerationPrevious30Days) * 100
                          : 0;
                        return (
                          <div className={`flex items-center gap-1 sm:gap-2 ${
                            change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            <svg className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              {change > 0 ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                              )}
                            </svg>
                            <span className="text-sm sm:text-lg font-bold">{Math.abs(percentChange).toFixed(1)}%</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
