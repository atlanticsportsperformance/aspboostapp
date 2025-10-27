import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableSchema() {
  console.log('Checking athlete_percentile_history table...\n');

  // Check if table exists
  const { data, error } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error querying table:', error);
    console.log('\nTable might not exist or has a schema/permission issue.');
    return;
  }

  console.log('✅ Table exists and is queryable');
  console.log('Sample data:', JSON.stringify(data, null, 2));

  // Try to get row count
  const { count, error: countError } = await supabase
    .from('athlete_percentile_history')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting rows:', countError);
  } else {
    console.log(`\n📊 Total rows in athlete_percentile_history: ${count}`);
  }

  // Try to insert a test record with 'Overall' play level
  console.log('\n🧪 Testing insert with Overall play level...');

  const { error: insertError } = await supabase
    .from('athlete_percentile_history')
    .insert({
      athlete_id: '00000000-0000-0000-0000-000000000000', // Fake ID
      test_type: 'CMJ',
      test_date: new Date().toISOString(),
      test_id: 'test-overall-check',
      play_level: 'Overall',
      metrics: { test: { value: 100, percentile: 50 } },
      composite_score_level: 50,
      composite_score_overall: null,
    });

  if (insertError) {
    console.error('❌ Insert with Overall failed:', insertError);
    console.log('\n⚠️  This confirms the issue: play_level constraint does NOT include "Overall"');
  } else {
    console.log('✅ Insert with Overall succeeded');

    // Clean up test record
    await supabase
      .from('athlete_percentile_history')
      .delete()
      .eq('test_id', 'test-overall-check');
  }
}

checkTableSchema().catch(console.error);
