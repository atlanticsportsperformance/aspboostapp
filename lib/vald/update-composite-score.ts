/**
 * Update the composite_score_overall for all recent percentile history entries
 *
 * composite_score_overall = average of latest percentile from each test type
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Calculate and update composite_score_overall for an athlete
 *
 * This gets the latest percentile for each test type and averages them.
 *
 * @param supabase - Supabase client
 * @param athleteId - Athlete UUID
 */
export async function updateCompositeScoreOverall(
  supabase: SupabaseClient,
  athleteId: string
): Promise<number | null> {
  try {
    const testTypes = ['CMJ', 'SJ', 'HJ', 'PPU', 'IMTP'];

    // Get athlete's play level
    const { data: athlete } = await supabase
      .from('athletes')
      .select('play_level')
      .eq('id', athleteId)
      .single();

    if (!athlete?.play_level) {
      console.log(`Athlete ${athleteId} has no play level set`);
      return null;
    }

    // Get the most recent FORCE_PROFILE row to know which tests have been used
    const { data: lastForceProfile } = await supabase
      .from('athlete_percentile_history')
      .select('test_date')
      .eq('athlete_id', athleteId)
      .eq('test_type', 'FORCE_PROFILE')
      .eq('play_level', athlete.play_level)
      .order('test_date', { ascending: false })
      .limit(1)
      .single();

    // Only consider tests AFTER the last FORCE_PROFILE was created
    const afterDate = lastForceProfile?.test_date || '1970-01-01';

    // Get the latest test for each test type (only tests after last FORCE_PROFILE)
    const testData: Record<string, { percentile: number; date: Date; testId: string }> = {};

    for (const testType of testTypes) {
      const { data: latestEntry } = await supabase
        .from('athlete_percentile_history')
        .select('percentile_play_level, test_date, test_id')
        .eq('athlete_id', athleteId)
        .eq('test_type', testType)
        .eq('play_level', athlete.play_level)
        .gt('test_date', afterDate)
        .order('test_date', { ascending: false })
        .limit(1)
        .single();

      if (latestEntry?.percentile_play_level !== null && latestEntry?.percentile_play_level !== undefined && latestEntry.test_id) {
        testData[testType] = {
          percentile: latestEntry.percentile_play_level,
          date: new Date(latestEntry.test_date),
          testId: latestEntry.test_id,
        };
      }
    }

    // CHECK: Do we have all 5 tests?
    const completedTests = Object.keys(testData);
    if (completedTests.length < 5) {
      console.log(`Athlete ${athleteId} has only ${completedTests.length}/5 tests since last FORCE_PROFILE. Missing: ${testTypes.filter(t => !completedTests.includes(t)).join(', ')}`);
      return null;
    }

    // Calculate composite score (average of all 5 test percentiles)
    const percentiles = Object.values(testData).map(t => t.percentile);
    const compositeScoreOverall = percentiles.reduce((sum, p) => sum + p, 0) / percentiles.length;

    // Use the most recent test date as the FORCE_PROFILE date
    const latestTestDate = new Date(Math.max(...Object.values(testData).map(t => t.date.getTime())));

    console.log(`✅ Athlete ${athleteId} completed all 5 tests! Creating FORCE_PROFILE with composite score ${compositeScoreOverall.toFixed(1)}`);

    // Insert new FORCE_PROFILE row (never update - always create new)
    const { error } = await supabase
      .from('athlete_percentile_history')
      .insert({
        athlete_id: athleteId,
        test_type: 'FORCE_PROFILE',
        test_date: latestTestDate.toISOString(),
        test_id: null,
        play_level: athlete.play_level,
        metric_name: null,
        value: null,
        percentile_play_level: null,
        percentile_overall: compositeScoreOverall,
      });

    if (error) {
      console.error('Error inserting FORCE_PROFILE row:', error);
      return null;
    }

    console.log(`✅ Created FORCE_PROFILE row with composite score ${compositeScoreOverall.toFixed(1)} for athlete ${athleteId} (based on tests after ${afterDate})`);

    // Also update the athlete's vald_composite_score field
    await supabase
      .from('athletes')
      .update({ vald_composite_score: compositeScoreOverall })
      .eq('id', athleteId);

    return compositeScoreOverall;
  } catch (err) {
    console.error('Error in updateCompositeScoreOverall:', err);
    return null;
  }
}

/**
 * Update composite_score_overall immediately after syncing new tests
 *
 * @param supabase - Supabase client
 * @param athleteId - Athlete UUID
 */
export async function updateCompositeScoreAfterSync(
  supabase: SupabaseClient,
  athleteId: string
): Promise<void> {
  console.log(`Calculating composite score for athlete ${athleteId}...`);
  await updateCompositeScoreOverall(supabase, athleteId);
}
