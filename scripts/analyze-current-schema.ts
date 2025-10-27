/**
 * Analyze current athlete_percentile_history schema to understand what needs to change
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeSchema() {
  console.log('=== Current Schema Analysis ===\n');

  // Get a sample row to see structure
  const { data: sampleRow } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .limit(1)
    .single();

  if (sampleRow) {
    console.log('Current columns:');
    Object.keys(sampleRow).forEach(key => {
      console.log(`  - ${key}: ${typeof sampleRow[key]}`);
    });

    console.log('\nSample metrics JSONB structure:');
    console.log(JSON.stringify(sampleRow.metrics, null, 2));
  }

  // Count rows by play_level
  const { data: counts } = await supabase
    .from('athlete_percentile_history')
    .select('play_level');

  const playLevelCounts: Record<string, number> = {};
  counts?.forEach(row => {
    playLevelCounts[row.play_level] = (playLevelCounts[row.play_level] || 0) + 1;
  });

  console.log('\nRow counts by play_level:');
  Object.entries(playLevelCounts).forEach(([level, count]) => {
    console.log(`  ${level}: ${count} rows`);
  });

  console.log(`\nTotal rows: ${counts?.length || 0}`);

  // Check for duplicate test_ids (should have 2 per test if using old approach)
  const { data: allRows } = await supabase
    .from('athlete_percentile_history')
    .select('test_id, play_level')
    .order('test_id');

  const testIdCounts: Record<string, string[]> = {};
  allRows?.forEach(row => {
    if (!testIdCounts[row.test_id]) {
      testIdCounts[row.test_id] = [];
    }
    testIdCounts[row.test_id].push(row.play_level);
  });

  console.log('\n=== Test ID Analysis ===');
  const duplicates = Object.entries(testIdCounts).filter(([_, levels]) => levels.length > 1);
  console.log(`Tests with multiple rows (should become 1 row): ${duplicates.length}`);
  console.log(`Tests with single row (already correct): ${Object.keys(testIdCounts).length - duplicates.length}`);

  if (duplicates.length > 0) {
    console.log('\nSample duplicate test (first 3):');
    duplicates.slice(0, 3).forEach(([testId, levels]) => {
      console.log(`  test_id: ${testId}`);
      console.log(`    play_levels: ${levels.join(', ')}`);
    });
  }

  console.log('\n=== Migration Strategy ===');
  console.log('1. Add column: composite_score_play_level (copy from composite_score_level)');
  console.log('2. Update composite_score_overall for all rows (calculate from Overall rows)');
  console.log('3. Delete all rows where play_level = "Overall"');
  console.log('4. Update metrics JSONB to include both play_level and overall percentiles');
  console.log('5. Rename composite_score_level → composite_score_play_level (optional)');
}

analyzeSchema().catch(console.error);
