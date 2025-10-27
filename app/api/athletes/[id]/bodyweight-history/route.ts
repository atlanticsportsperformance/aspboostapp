/**
 * API endpoint to get bodyweight history from CMJ tests
 * Returns bodyweight measurements over time
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // Get athlete info
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('first_name, last_name, weight_lbs')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    // Get bodyweight history from CMJ tests
    const { data: cmjTests, error: cmjError } = await serviceSupabase
      .from('cmj_tests')
      .select('body_weight_trial_value, recorded_utc, test_id')
      .eq('athlete_id', athleteId)
      .not('body_weight_trial_value', 'is', null)
      .order('recorded_utc', { ascending: true });

    if (cmjError) {
      console.error('Error fetching CMJ tests:', cmjError);
      return NextResponse.json(
        { error: 'Failed to fetch bodyweight history' },
        { status: 500 }
      );
    }

    // Convert kg to lbs and format data
    const history = (cmjTests || []).map(test => ({
      date: test.recorded_utc,
      weight_kg: Math.round(test.body_weight_trial_value * 10) / 10,
      weight_lbs: Math.round(test.body_weight_trial_value * 2.20462 * 10) / 10,
      test_id: test.test_id,
    }));

    // Calculate stats
    const weights = history.map(h => h.weight_lbs);
    const avgWeight = weights.length > 0
      ? weights.reduce((sum, w) => sum + w, 0) / weights.length
      : null;
    const minWeight = weights.length > 0 ? Math.min(...weights) : null;
    const maxWeight = weights.length > 0 ? Math.max(...weights) : null;

    return NextResponse.json({
      athlete: {
        id: athleteId,
        name: `${athlete.first_name} ${athlete.last_name}`,
        current_weight_lbs: athlete.weight_lbs,
      },
      history,
      stats: {
        total_measurements: history.length,
        avg_weight_lbs: avgWeight ? Math.round(avgWeight * 10) / 10 : null,
        min_weight_lbs: minWeight,
        max_weight_lbs: maxWeight,
        weight_change_lbs: (minWeight && maxWeight) ? Math.round((maxWeight - minWeight) * 10) / 10 : null,
      },
    });
  } catch (err) {
    console.error('Error fetching bodyweight history:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
