/**
 * Fix the athlete_percentile_history play_level constraint to include 'Overall'
 *
 * This script uses raw SQL execution through Supabase's postgres connection
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixConstraint() {
  console.log('🔧 Fixing athlete_percentile_history constraint to include "Overall"...\n');

  // Since we can't execute DDL through the REST API, we'll verify the issue
  // and provide manual SQL for the user to run in Supabase SQL Editor

  console.log('⚠️  The constraint needs to be fixed manually in Supabase SQL Editor.');
  console.log('\n📋 Please run this SQL in your Supabase SQL Editor:\n');
  console.log('─'.repeat(70));
  console.log(`
-- Fix the play_level constraint to include 'Overall'
ALTER TABLE athlete_percentile_history
DROP CONSTRAINT IF EXISTS athlete_percentile_history_play_level_check;

ALTER TABLE athlete_percentile_history
ADD CONSTRAINT athlete_percentile_history_play_level_check
CHECK (play_level IN ('Youth', 'High School', 'College', 'Pro', 'Overall'));
  `.trim());
  console.log('─'.repeat(70));

  console.log('\n🔍 Verifying current state...\n');

  // Test if we can insert with 'Overall'
  const { error: testError } = await supabase
    .from('athlete_percentile_history')
    .insert({
      athlete_id: '00000000-0000-0000-0000-000000000000',
      test_type: 'CMJ',
      test_date: new Date().toISOString(),
      test_id: 'test-overall-check-' + Date.now(),
      play_level: 'Overall',
      metrics: { test: { value: 100, percentile: 50 } },
      composite_score_level: 50,
      composite_score_overall: null,
    });

  if (testError) {
    if (testError.code === '23514') {
      console.log('❌ Constraint still blocking "Overall" - SQL needs to be run');
      console.log('   Error:', testError.message);
    } else {
      console.error('❌ Unexpected error:', testError);
    }
  } else {
    console.log('✅ Constraint is already fixed! "Overall" is allowed.');

    // Clean up test record
    await supabase
      .from('athlete_percentile_history')
      .delete()
      .eq('test_id', 'test-overall-check-' + Date.now());
  }

  console.log('\n📊 Current row count:', await getRowCount());
}

async function getRowCount(): Promise<number> {
  const { count } = await supabase
    .from('athlete_percentile_history')
    .select('*', { count: 'exact', head: true });

  return count || 0;
}

fixConstraint().catch(console.error);
