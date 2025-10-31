/**
 * Calculate and save Overall Force Profile Composite Score
 *
 * This creates ONE additional row in athlete_percentile_history with test_type='FORCE_PROFILE'
 * that averages the percentile rankings from the 6 specific composite metrics
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface CompositeResult {
  success: boolean;
  error?: string;
  composite?: {
    percentile_play_level: number;
    percentile_overall: number;
  };
}

/**
 * Calculate Overall Force Profile Composite Score and save as a special row
 *
 * @param supabase - Supabase client (service role)
 * @param athleteId - Athlete UUID
 * @param playLevel - Athlete's play level
 * @param recentTests - Optional recent tests array (not currently used)
 */
export async function calculateForceProfileComposite(
  supabase: SupabaseClient,
  athleteId: string,
  playLevel: string,
  recentTests?: any[]
): Promise<CompositeResult> {
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
      // Get most recent row for this specific metric AT THE CURRENT PLAY LEVEL
      const { data: metricRow } = await supabase
        .from('athlete_percentile_history')
        .select('test_date, percentile_play_level, percentile_overall')
        .eq('athlete_id', athleteId)
        .eq('test_type', test_type)
        .eq('metric_name', metric_name)
        .eq('play_level', playLevel) // IMPORTANT: Filter by current play level
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

    // Require BOTH play_level and overall to have the SAME number of metrics
    // This ensures they're averaging the same set of metrics (no inconsistency)
    if (playLevelPercentiles.length !== overallPercentiles.length) {
      console.log(`  ⚠️  Cannot create Force Profile: Inconsistent metric counts`);
      console.log(`    Play level percentiles: ${playLevelPercentiles.length}/6`);
      console.log(`    Overall percentiles: ${overallPercentiles.length}/6`);
      return {
        success: false,
        error: `Inconsistent metrics: ${playLevelPercentiles.length} play level vs ${overallPercentiles.length} overall`
      };
    }

    // Require ALL 6 metrics for complete Force Profile
    if (playLevelPercentiles.length < 6) {
      console.log(`  ⚠️  Cannot create Force Profile: Incomplete metrics (${playLevelPercentiles.length}/6)`);
      console.log(`    Need all 6 metrics for accurate Force Profile`);
      return {
        success: false,
        error: `Insufficient metrics: ${playLevelPercentiles.length}/6 (need all 6)`
      };
    }

    // Calculate averages of the INDIVIDUAL composite metric percentiles
    // Both arrays have the same length now (guaranteed by checks above)
    const avgPlayLevel = playLevelPercentiles.reduce((sum, p) => sum + p, 0) / playLevelPercentiles.length;
    const avgOverall = overallPercentiles.reduce((sum, p) => sum + p, 0) / overallPercentiles.length;

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
      return { success: false, error: error.message || 'Failed to save composite' };
    }

    console.log(`✅ Saved Force Profile composite row`);
    return {
      success: true,
      composite: {
        percentile_play_level: avgPlayLevel || 0,
        percentile_overall: avgOverall || 0,
      }
    };
  } catch (err) {
    console.error('[calculateForceProfileComposite] Exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
