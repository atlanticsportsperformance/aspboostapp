/**
 * POST /api/athletes/[id]/vald/recalculate-force-profile
 *
 * Recalculates Force Profile composite score using current play level
 *
 * Triggered when:
 * - User changes athlete's play level in profile editor
 * - Grabs last 5 tests (most recent of each type)
 * - Uses same raw values but recalculates percentiles with new play level
 * - Updates athlete_percentile_contributions table
 *
 * Does NOT change:
 * - athlete_percentile_history (historical snapshots stay locked)
 * - vald_tests (raw measurements never change)
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { calculateForceProfileComposite } from '@/lib/vald/calculate-force-profile-composite';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: athleteId } = await context.params;

  try {
    console.log(`[recalculate-force-profile] Starting recalculation for athlete ${athleteId}`);

    const supabase = await createClient();

    // 1. Get athlete's current play level
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, play_level')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      console.error('[recalculate-force-profile] Athlete not found:', athleteError);
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    if (!athlete.play_level) {
      console.error('[recalculate-force-profile] Athlete has no play level set');
      return NextResponse.json(
        { error: 'Athlete has no play level set' },
        { status: 400 }
      );
    }

    console.log(`[recalculate-force-profile] Athlete: ${athlete.first_name} ${athlete.last_name}`);
    console.log(`[recalculate-force-profile] Current play level: ${athlete.play_level}`);

    // 2. Get most recent test of each type (including CMJ for percentile history)
    const testConfigs = [
      { type: 'CMJ' as const, table: 'cmj_tests' },
      { type: 'SJ' as const, table: 'sj_tests' },
      { type: 'HJ' as const, table: 'hj_tests' },
      { type: 'PPU' as const, table: 'ppu_tests' },
      { type: 'IMTP' as const, table: 'imtp_tests' },
    ];
    const recentTests: any[] = [];

    for (const config of testConfigs) {
      const { data: tests, error: testError } = await supabase
        .from(config.table)
        .select('*')
        .eq('athlete_id', athleteId)
        .order('recorded_utc', { ascending: false })
        .limit(1);

      if (testError) {
        console.error(`[recalculate-force-profile] Error fetching ${config.type} test:`, testError);
        continue;
      }

      if (tests && tests.length > 0) {
        // Add test_type and normalize field names for compatibility
        const test = {
          ...tests[0],
          test_type: config.type,
          vald_test_id: tests[0].test_id,
          test_date: tests[0].recorded_utc
        };
        recentTests.push(test);
        console.log(`[recalculate-force-profile] Found ${config.type} test from ${new Date(tests[0].recorded_utc).toLocaleDateString()}`);
      } else {
        console.log(`[recalculate-force-profile] No ${config.type} test found - skipping`);
      }
    }

    if (recentTests.length === 0) {
      console.log('[recalculate-force-profile] No VALD tests found - nothing to recalculate');
      return NextResponse.json(
        {
          success: true,
          message: 'No VALD tests found to recalculate',
          tests_processed: 0
        },
        { status: 200 }
      );
    }

    console.log(`[recalculate-force-profile] Found ${recentTests.length} tests to recalculate`);

    // 3. Re-process each test with new play level to create NEW athlete_percentile_history rows
    // This triggers saveTestPercentileHistory which creates new rows with current play level
    const { saveTestPercentileHistory } = await import('@/lib/vald/save-percentile-history');

    let processedCount = 0;
    for (const test of recentTests) {
      const success = await saveTestPercentileHistory(
        supabase,
        athleteId,
        test.test_type,
        test.vald_test_id,
        test, // Full test data object
        new Date(test.test_date),
        athlete.play_level // NEW play level
      );

      if (success) {
        processedCount++;
        console.log(`[recalculate-force-profile] ✅ Recalculated ${test.test_type} test with new play level`);
      } else {
        console.warn(`[recalculate-force-profile] ⚠️ Failed to recalculate ${test.test_type} test`);
      }
    }

    // 4. Calculate Force Profile composite using current play level
    // This will create a new FORCE_PROFILE row in athlete_percentile_history
    const compositeResult = await calculateForceProfileComposite(
      supabase,
      athleteId,
      athlete.play_level,
      recentTests
    );

    if (!compositeResult.success) {
      console.error('[recalculate-force-profile] Failed to calculate composite:', compositeResult.error);
      return NextResponse.json(
        { error: compositeResult.error || 'Failed to calculate Force Profile composite' },
        { status: 500 }
      );
    }

    console.log('[recalculate-force-profile] ✅ Successfully recalculated Force Profile composite');
    console.log(`[recalculate-force-profile] New composite score: ${compositeResult.composite?.percentile_play_level}th percentile`);

    return NextResponse.json({
      success: true,
      message: 'Force Profile recalculated with new play level',
      tests_processed: processedCount,
      play_level: athlete.play_level,
      composite_score: compositeResult.composite?.percentile_play_level || null,
      composite_overall: compositeResult.composite?.percentile_overall || null,
    });

  } catch (err) {
    console.error('[recalculate-force-profile] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
