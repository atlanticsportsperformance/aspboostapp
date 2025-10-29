/**
 * API endpoint for Force Profile Radar Chart
 * Returns current + previous test data for the 6 composite metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface MetricData {
  name: string;
  displayName: string;
  unit: string;
  current: {
    percentile: number;
    value: number;
    date: string;
  } | null;
  previous: {
    percentile: number;
    value: number;
    date: string;
  } | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    const supabase = createServiceRoleClient();

    // Get athlete's play level
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('play_level')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete?.play_level) {
      return NextResponse.json(
        { error: 'Athlete not found or play level not set' },
        { status: 404 }
      );
    }

    // The 6 composite metrics (excluding CMJ)
    const metrics = [
      { test_type: 'SJ', metric_name: 'Peak Power (W)', displayName: 'SJ Peak Power' },
      { test_type: 'SJ', metric_name: 'Peak Power / BM (W/kg)', displayName: 'SJ Power/BM' },
      { test_type: 'HJ', metric_name: 'Reactive Strength Index', displayName: 'HJ RSI' },
      { test_type: 'PPU', metric_name: 'Peak Takeoff Force (N)', displayName: 'PPU Force' },
      { test_type: 'IMTP', metric_name: 'Net Peak Force (N)', displayName: 'IMTP Net Peak' },
      { test_type: 'IMTP', metric_name: 'Relative Strength', displayName: 'IMTP Rel Strength' },
    ];

    // OPTIMIZATION: Fetch all metrics in ONE query instead of 6 separate queries
    const metricCombinations = metrics.map(m => `${m.test_type}|${m.metric_name}`);

    const { data: allTests, error: testsError } = await supabase
      .from('athlete_percentile_history')
      .select('test_type, metric_name, test_date, value, percentile_play_level, percentile_overall')
      .eq('athlete_id', athleteId)
      .eq('play_level', athlete.play_level)
      .order('test_date', { ascending: false });

    if (testsError) {
      console.error('Error fetching tests:', testsError);
      return NextResponse.json(
        { error: 'Failed to fetch test data' },
        { status: 500 }
      );
    }

    const radarData: MetricData[] = [];

    // Process each metric from the single query result
    for (const metric of metrics) {
      // Filter tests for this specific metric
      const metricTests = (allTests || [])
        .filter(t => t.test_type === metric.test_type && t.metric_name === metric.metric_name)
        .slice(0, 2); // Get the 2 most recent

      const current = metricTests.length > 0 ? {
        percentile: metricTests[0].percentile_play_level || 0,
        value: metricTests[0].value || 0,
        date: metricTests[0].test_date,
      } : null;

      const previous = metricTests.length > 1 ? {
        percentile: metricTests[1].percentile_play_level || 0,
        value: metricTests[1].value || 0,
        date: metricTests[1].test_date,
      } : null;

      radarData.push({
        name: metric.metric_name,
        displayName: metric.displayName,
        unit: '', // Add unit if needed
        current,
        previous,
      });
    }

    // Get Force Profile composite score (most recent 2 AT THE CURRENT PLAY LEVEL)
    const { data: forceProfiles } = await supabase
      .from('athlete_percentile_history')
      .select('test_date, percentile_play_level, percentile_overall')
      .eq('athlete_id', athleteId)
      .eq('test_type', 'FORCE_PROFILE')
      .eq('play_level', athlete.play_level) // IMPORTANT: Filter by current play level
      .order('test_date', { ascending: false })
      .limit(2);

    const compositeScore = {
      current: forceProfiles && forceProfiles.length > 0 ? {
        percentile: forceProfiles[0].percentile_play_level || 0,
        date: forceProfiles[0].test_date,
      } : null,
      previous: forceProfiles && forceProfiles.length > 1 ? {
        percentile: forceProfiles[1].percentile_play_level || 0,
        date: forceProfiles[1].test_date,
      } : null,
    };

    return NextResponse.json({
      metrics: radarData,
      compositeScore,
      playLevel: athlete.play_level,
    });
  } catch (err) {
    console.error('Error fetching radar data:', err);
    return NextResponse.json(
      { error: 'Failed to fetch radar chart data' },
      { status: 500 }
    );
  }
}
