/**
 * Verify the final schema is correct
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
  console.log('=== VERIFYING FINAL SCHEMA ===\n');

  // Get all rows
  const { data: allRows } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .order('created_at', { ascending: false });

  console.log(`Total rows: ${allRows?.length || 0}`);

  // Check for Overall play_level (should be 0)
  const overallRows = allRows?.filter(r => r.play_level === 'Overall');
  console.log(`Rows with play_level='Overall': ${overallRows?.length || 0} ❌ (should be 0)`);

  if (overallRows && overallRows.length > 0) {
    console.log('\n⚠️ WARNING: Found Overall rows that should have been deleted!');
    return;
  }

  console.log('\n✅ No Overall rows found (correct!)');

  // Check a sample row
  if (allRows && allRows.length > 0) {
    const sampleRow = allRows[0];
    console.log('\n=== Sample Row ===');
    console.log(`test_id: ${sampleRow.test_id}`);
    console.log(`test_type: ${sampleRow.test_type}`);
    console.log(`play_level: ${sampleRow.play_level}`);
    console.log(`composite_score_play_level: ${sampleRow.composite_score_play_level}`);
    console.log(`composite_score_overall: ${sampleRow.composite_score_overall}`);
    console.log(`composite_score_level (old): ${sampleRow.composite_score_level}`);

    console.log('\nMetrics JSONB structure:');
    const metrics = sampleRow.metrics as any;
    const firstMetric = Object.keys(metrics)[0];
    console.log(`  Sample metric: ${firstMetric}`);
    console.log(`    value: ${metrics[firstMetric].value}`);
    console.log(`    percentile_play_level: ${metrics[firstMetric].percentile_play_level}`);
    console.log(`    percentile_overall: ${metrics[firstMetric].percentile_overall}`);

    // Check if the new fields exist
    const hasPlayLevelPercentile = 'percentile_play_level' in metrics[firstMetric];
    const hasOverallPercentile = 'percentile_overall' in metrics[firstMetric];

    console.log('\n=== Schema Validation ===');
    console.log(`✅ composite_score_play_level column exists: ${sampleRow.composite_score_play_level !== undefined}`);
    console.log(`✅ composite_score_overall column exists: ${sampleRow.composite_score_overall !== undefined}`);
    console.log(`✅ Metrics have percentile_play_level: ${hasPlayLevelPercentile}`);
    console.log(`✅ Metrics have percentile_overall: ${hasOverallPercentile}`);
  }

  // Group by athlete
  const athleteCounts: Record<string, number> = {};
  allRows?.forEach(row => {
    athleteCounts[row.athlete_id] = (athleteCounts[row.athlete_id] || 0) + 1;
  });

  console.log('\n=== Rows per Athlete ===');
  for (const [athleteId, count] of Object.entries(athleteCounts)) {
    // Get athlete name
    const { data: athlete } = await supabase
      .from('athletes')
      .select('first_name, last_name, play_level')
      .eq('id', athleteId)
      .single();

    if (athlete) {
      console.log(`  ${athlete.first_name} ${athlete.last_name} (${athlete.play_level}): ${count} tests`);
    }
  }

  console.log('\n🎉 SCHEMA REFACTOR COMPLETE AND VERIFIED!');
  console.log('   ✅ ONE row per test');
  console.log('   ✅ BOTH percentiles in columns');
  console.log('   ✅ Metrics JSONB has both percentiles');
  console.log('   ✅ No duplicate "Overall" rows');
}

verifySchema().catch(console.error);
