/**
 * Calculate and save Overall Force Profile Composite Score
 *
 * This creates ONE additional row in athlete_percentile_history with test_type='FORCE_PROFILE'
 * that averages the percentile rankings from the 6 specific composite metrics
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Calculate Overall Force Profile Composite Score and save as a special row
 *
 * @param supabase - Supabase client (service role)
 * @param athleteId - Athlete UUID
 * @param playLevel - Athlete's play level
 */
export async function calculateForceProfileComposite(
  supabase: SupabaseClient,
  athleteId: string,
  playLevel: string
): Promise<boolean> {
  try {
    console.log(`\n[calculateForceProfileComposite] Calculating for athlete ${athleteId}`);

    // Get the 6 specific composite metrics from most recent tests (NO CMJ)
    // SJ: Peak Power, Power/BM
    // HJ: Reactive Strength Index
    // PPU: Peak Takeoff Force
    // IMTP: Net Peak Force, Relative Strength

    const metricsToFetch: Array<{ test_type: string; metric_name: string }> = [
      { test_type: 'SJ', metric_name: 'Peak Power (W)' },
      { test_type: 'SJ', metric_name: 'Peak Power / BM (W/kg)' },
      { test_type: 'HJ', metric_name: 'Reactive Strength Index' },
      { test_type: 'PPU', metric_name: 'Peak Takeoff Force (N)' },
      { test_type: 'IMTP', metric_name: 'Net Peak Force (N)' },
      { test_type: 'IMTP', metric_name: 'Relative Strength' },
    ];

    const playLevelPercentiles: number[] = [];
    const overallPercentiles: number[] = [];
    let mostRecentDate: Date | null = null;

    for (const { test_type, metric_name } of metricsToFetch) {
      // Get most recent row for this specific metric
      const { data: metricRow } = await supabase
        .from('athlete_percentile_history')
        .select('test_date, percentile_play_level, percentile_overall')
        .eq('athlete_id', athleteId)
        .eq('test_type', test_type)
        .eq('metric_name', metric_name)
        .order('test_date', { ascending: false })
        .limit(1)
        .single();

      if (metricRow) {
        if (metricRow.percentile_play_level !== null) {
          playLevelPercentiles.push(metricRow.percentile_play_level);
        }
        if (metricRow.percentile_overall !== null) {
          overallPercentiles.push(metricRow.percentile_overall);
        }

        const testDate = new Date(metricRow.test_date);
        if (!mostRecentDate || testDate > mostRecentDate) {
          mostRecentDate = testDate;
        }

        console.log(`  ${test_type} - ${metric_name}: play_level=${metricRow.percentile_play_level}, overall=${metricRow.percentile_overall}`);
      } else {
        console.log(`  ${test_type} - ${metric_name}: no data found`);
      }
    }

    // Only skip if NO metrics found at all
    if (playLevelPercentiles.length === 0 && overallPercentiles.length === 0) {
      console.log('  No composite metrics found for Force Profile calculation');
      return false;
    }

    // Warn if we don't have all 6 metrics (but still create FORCE_PROFILE with what we have)
    if (playLevelPercentiles.length < 6) {
      console.log(`  ⚠️  Warning: Only found ${playLevelPercentiles.length}/6 metrics. Some test types may be missing.`);
    }

    // Calculate averages of the 6 INDIVIDUAL composite metric percentiles
    const avgPlayLevel = playLevelPercentiles.length > 0
      ? playLevelPercentiles.reduce((sum, p) => sum + p, 0) / playLevelPercentiles.length
      : null;

    const avgOverall = overallPercentiles.length > 0
      ? overallPercentiles.reduce((sum, p) => sum + p, 0) / overallPercentiles.length
      : null;

    console.log(`\n  Force Profile Composite (average of ${playLevelPercentiles.length} metrics):`);
    console.log(`    play_level=${avgPlayLevel?.toFixed(1)}`);
    console.log(`    overall=${avgOverall?.toFixed(1)}`);

    // ALWAYS insert a new FORCE_PROFILE row (we want historical tracking)
    const { error } = await supabase
      .from('athlete_percentile_history')
      .insert({
        athlete_id: athleteId,
        test_type: 'FORCE_PROFILE',
        test_date: mostRecentDate?.toISOString(),
        test_id: null, // No specific test ID for composite
        play_level: playLevel,
        metric_name: null, // No specific metric name for composite
        value: null, // No specific value for composite
        percentile_play_level: avgPlayLevel,
        percentile_overall: avgOverall,
      });

    if (error) {
      console.error(`[calculateForceProfileComposite] Error saving:`, error);
      return false;
    }

    console.log(`✅ Saved Force Profile composite row`);
    return true;
  } catch (err) {
    console.error('[calculateForceProfileComposite] Exception:', err);
    return false;
  }
}
