/**
 * Calculate Force Profile composites for EACH test date
 *
 * When syncing multiple tests from different dates, we want to create
 * a Force Profile entry for EACH date that has a complete set of tests
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface ForceProfileByDate {
  testDate: string;
  percentile_play_level: number | null;
  percentile_overall: number | null;
  metricsCount: number;
}

/**
 * Calculate Force Profile composites for each unique test date
 *
 * @param supabase - Supabase service role client
 * @param athleteId - Athlete UUID
 * @param playLevel - Athlete's current play level
 * @returns Array of Force Profile results by date
 */
export async function calculateForceProfilesByDate(
  supabase: SupabaseClient,
  athleteId: string,
  playLevel: string
): Promise<{ success: boolean; profiles: ForceProfileByDate[]; error?: string }> {
  try {
    console.log(`\n[calculateForceProfilesByDate] Calculating for athlete ${athleteId}`);

    // The 6 composite metrics (NO CMJ)
    const metricsToFetch: Array<{ test_type: string; metric_name: string }> = [
      { test_type: 'SJ', metric_name: 'Peak Power (W)' },
      { test_type: 'SJ', metric_name: 'Peak Power / BM (W/kg)' },
      { test_type: 'HJ', metric_name: 'Reactive Strength Index' },
      { test_type: 'PPU', metric_name: 'Peak Takeoff Force (N)' },
      { test_type: 'IMTP', metric_name: 'Net Peak Force (N)' },
      { test_type: 'IMTP', metric_name: 'Relative Strength' },
    ];

    // Get all percentile history for these metrics at current play level
    const { data: historyRows, error: historyError } = await supabase
      .from('athlete_percentile_history')
      .select('test_date, test_type, metric_name, percentile_play_level, percentile_overall')
      .eq('athlete_id', athleteId)
      .eq('play_level', playLevel)
      .in('test_type', ['SJ', 'HJ', 'PPU', 'IMTP']);

    if (historyError) {
      console.error('Error fetching history:', historyError);
      return { success: false, profiles: [], error: historyError.message };
    }

    if (!historyRows || historyRows.length === 0) {
      console.log('  No composite metrics found');
      return { success: false, profiles: [], error: 'No composite metrics found' };
    }

    // Group by test date
    const byDate: Record<string, any[]> = {};

    for (const row of historyRows) {
      const dateKey = row.test_date.split('T')[0]; // Use date only (YYYY-MM-DD)

      if (!byDate[dateKey]) {
        byDate[dateKey] = [];
      }

      byDate[dateKey].push(row);
    }

    console.log(`  Found metrics across ${Object.keys(byDate).length} different test dates`);

    // Calculate Force Profile for each date
    const profiles: ForceProfileByDate[] = [];

    for (const [dateKey, rows] of Object.entries(byDate)) {
      // Check which metrics we have for this date
      const metricsPresent = new Set(rows.map(r => `${r.test_type}-${r.metric_name}`));
      const metricsRequired = new Set(metricsToFetch.map(m => `${m.test_type}-${m.metric_name}`));

      const metricsCount = rows.length;

      // Calculate average percentiles from whatever metrics we have
      const playLevelPercentiles = rows
        .filter(r => r.percentile_play_level !== null)
        .map(r => r.percentile_play_level);

      const overallPercentiles = rows
        .filter(r => r.percentile_overall !== null)
        .map(r => r.percentile_overall);

      // Require BOTH play_level and overall to have the SAME number of metrics
      if (playLevelPercentiles.length !== overallPercentiles.length) {
        console.log(`  ${dateKey}: Inconsistent metric counts (play_level=${playLevelPercentiles.length}, overall=${overallPercentiles.length}), skipping`);
        continue;
      }

      // Require ALL 6 metrics for complete Force Profile
      if (playLevelPercentiles.length < 6) {
        console.log(`  ${dateKey}: Incomplete metrics (${playLevelPercentiles.length}/6), need all 6, skipping`);
        continue;
      }

      const avgPlayLevel = playLevelPercentiles.reduce((sum, p) => sum + p, 0) / playLevelPercentiles.length;
      const avgOverall = overallPercentiles.reduce((sum, p) => sum + p, 0) / overallPercentiles.length;

      console.log(`  ${dateKey}: ${metricsCount}/6 metrics, play_level=${avgPlayLevel.toFixed(1)}, overall=${avgOverall.toFixed(1)}`);

      // Check if we already have a FORCE_PROFILE entry for this date
      const { data: existing } = await supabase
        .from('athlete_percentile_history')
        .select('id')
        .eq('athlete_id', athleteId)
        .eq('test_type', 'FORCE_PROFILE')
        .eq('play_level', playLevel)
        .gte('test_date', `${dateKey}T00:00:00`)
        .lt('test_date', `${dateKey}T23:59:59`)
        .single();

      if (existing) {
        console.log(`    ⏭️  Force Profile already exists for ${dateKey}, skipping`);
        continue;
      }

      // Insert Force Profile for this date
      const testDateTime = `${dateKey}T12:00:00.000Z`; // Use noon as midpoint

      const { error: insertError } = await supabase
        .from('athlete_percentile_history')
        .insert({
          athlete_id: athleteId,
          test_type: 'FORCE_PROFILE',
          test_date: testDateTime,
          test_id: null,
          play_level: playLevel,
          metric_name: null,
          value: null,
          percentile_play_level: avgPlayLevel,
          percentile_overall: avgOverall,
        });

      if (insertError) {
        console.error(`    ❌ Error saving Force Profile for ${dateKey}:`, insertError);
      } else {
        console.log(`    ✅ Saved Force Profile for ${dateKey}`);
        profiles.push({
          testDate: testDateTime,
          percentile_play_level: avgPlayLevel,
          percentile_overall: avgOverall,
          metricsCount,
        });
      }
    }

    return {
      success: true,
      profiles,
    };
  } catch (err) {
    console.error('[calculateForceProfilesByDate] Exception:', err);
    return {
      success: false,
      profiles: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
