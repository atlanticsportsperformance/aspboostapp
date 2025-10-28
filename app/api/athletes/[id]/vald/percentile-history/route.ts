/**
 * API endpoint to get percentile history over time for charting
 *
 * Returns all historical percentile data for an athlete from athlete_percentile_history table
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getMetricColumnName } from '@/lib/vald/metric-column-mapping';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    const { searchParams } = new URL(request.url);
    const testTypeFilter = searchParams.get('test_type'); // Optional filter by test type

    const supabase = await createClient();

    // Use service role client for percentile history access (bypasses RLS)
    const serviceSupabase = createServiceRoleClient();

    // Get athlete's play level
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('play_level, first_name, last_name')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    if (!athlete.play_level) {
      return NextResponse.json(
        { error: 'Athlete has no play level set' },
        { status: 400 }
      );
    }

    const playLevel = athlete.play_level;

    // Build query - IMPORTANT: Filter by current play level to show only relevant percentiles
    let query = serviceSupabase
      .from('athlete_percentile_history')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('play_level', playLevel); // Only show percentiles for current play level

    // Filter by test type if provided
    if (testTypeFilter) {
      query = query.eq('test_type', testTypeFilter);
    }

    query = query.order('test_date', { ascending: true });

    // Get all percentile history for this athlete
    const { data: history, error: historyError } = await query;

    if (historyError) {
      console.error('Error fetching percentile history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch percentile history' },
        { status: 500 }
      );
    }

    // If test_type filter is provided, flatten metrics for individual test view
    if (testTypeFilter && history) {
      const flattenedMetrics: any[] = [];

      for (const entry of history) {
        // entry.metric_name, entry.value, entry.percentile_play_level, entry.percentile_overall
        flattenedMetrics.push({
          metric_name: entry.metric_name,
          display_name: entry.metric_name, // Can enhance this later with proper display names
          test_date: entry.test_date,
          value: entry.value,
          percentile_play_level: entry.percentile_play_level,
          percentile_overall: entry.percentile_overall,
          test_id: entry.test_id,
        });
      }

      // Get 75th percentile VALUE and calculate standard deviation for each metric
      // Using percentile_lookup table which has pre-calculated percentiles by play level
      const eliteThresholds: Record<string, number> = {};
      const eliteStdDev: Record<string, number> = {};

      // Get unique metrics from the flattened data
      const uniqueMetrics = Array.from(new Set(flattenedMetrics.map(m => m.metric_name)));

      for (const metricName of uniqueMetrics) {
        // Map display name to metric_column name in percentile_lookup table
        const metricColumn = getMetricColumnName(testTypeFilter!, metricName);

        if (!metricColumn) {
          console.warn(`No metric column mapping for ${testTypeFilter}:${metricName}`);
          continue;
        }

        // Get 75th percentile value from percentile_lookup table
        const { data: p75Data } = await serviceSupabase
          .from('percentile_lookup')
          .select('value')
          .eq('metric_column', metricColumn)
          .eq('play_level', playLevel)
          .eq('percentile', 75)
          .single();

        if (p75Data && p75Data.value !== null) {
          eliteThresholds[metricName] = p75Data.value;

          // Calculate standard deviation from percentile distribution
          // Get values at key percentiles (25th, 50th, 75th, 90th) to estimate spread
          const { data: percentileValues } = await serviceSupabase
            .from('percentile_lookup')
            .select('value, percentile')
            .eq('metric_column', metricColumn)
            .eq('play_level', playLevel)
            .in('percentile', [25, 50, 75, 90])
            .order('percentile');

          if (percentileValues && percentileValues.length >= 2) {
            // Estimate standard deviation from interquartile range (IQR)
            // IQR = Q3 - Q1, and for normal distribution: σ ≈ IQR / 1.35
            const q1 = percentileValues.find(p => p.percentile === 25)?.value;
            const q3 = percentileValues.find(p => p.percentile === 75)?.value;

            if (q1 !== undefined && q3 !== undefined && q1 !== null && q3 !== null) {
              const iqr = q3 - q1;
              eliteStdDev[metricName] = iqr / 1.35;
            }
          }
        }
      }

      return NextResponse.json({
        athlete: {
          id: athleteId,
          name: `${athlete.first_name} ${athlete.last_name}`,
          play_level: playLevel,
        },
        test_type: testTypeFilter,
        metrics: flattenedMetrics,
        elite_thresholds: eliteThresholds,
        elite_std_dev: eliteStdDev,
        total_tests: flattenedMetrics.length,
      });
    }

    // Otherwise, group by test type for overview
    const groupedByTestType: Record<string, any[]> = {
      CMJ: [],
      SJ: [],
      HJ: [],
      PPU: [],
      IMTP: [],
    };

    // Process each history entry
    for (const entry of history || []) {
      const testType = entry.test_type;

      if (!groupedByTestType[testType]) {
        groupedByTestType[testType] = [];
      }

      groupedByTestType[testType].push({
        test_id: entry.test_id,
        test_date: entry.test_date,
        metric_name: entry.metric_name,
        value: entry.value,
        percentile_play_level: entry.percentile_play_level,
        percentile_overall: entry.percentile_overall,
      });
    }

    return NextResponse.json({
      athlete: {
        id: athleteId,
        name: `${athlete.first_name} ${athlete.last_name}`,
        play_level: playLevel,
      },
      history_by_test_type: groupedByTestType,
      total_tests: history?.length || 0,
    });
  } catch (err) {
    console.error('Error in percentile history endpoint:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
