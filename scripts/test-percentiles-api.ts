/**
 * Test the percentiles API to see what data it's returning
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

async function testPercentilesAPI() {
  // Get first athlete with VALD data
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: athletes } = await supabase
    .from('athletes')
    .select('id, first_name, last_name')
    .not('vald_profile_id', 'is', null)
    .limit(1);

  if (!athletes || athletes.length === 0) {
    console.log('No athletes with VALD profiles found');
    return;
  }

  const athlete = athletes[0];
  console.log(`Testing with athlete: ${athlete.first_name} ${athlete.last_name} (${athlete.id})\n`);

  // Fetch percentiles via HTTP (simulating frontend call)
  const response = await fetch(`http://localhost:3000/api/athletes/${athlete.id}/vald/percentiles`);

  if (!response.ok) {
    console.error('API Error:', await response.text());
    return;
  }

  const data = await response.json();

  console.log('='.repeat(70));
  console.log('PERCENTILES API RESPONSE');
  console.log('='.repeat(70));
  console.log('\nPlay Level:', data.play_level);
  console.log('Average Percentile:', data.average_percentile);
  console.log('\nTest Scores:\n');

  for (const score of data.test_scores) {
    console.log(`\n${score.test_name} (${score.test_type}):`);
    console.log('─'.repeat(50));
    console.log(`  Latest Percentile: ${score.latest_percentile}`);
    console.log(`  Secondary Percentile: ${score.secondary_percentile}`);
    console.log(`  Test Count: ${score.test_count}`);
    console.log(`  Trend: ${score.trend}`);

    if (score.metric_values) {
      console.log('\n  Metric Values:');
      Object.entries(score.metric_values).forEach(([key, value]) => {
        console.log(`    ${key}: ${value}`);
      });
    }

    if (score.metric_percentiles) {
      console.log('\n  Metric Percentiles:');
      Object.entries(score.metric_percentiles).forEach(([key, value]) => {
        console.log(`    ${key}: ${value}`);
      });
    }
  }

  console.log('\n' + '='.repeat(70));
}

testPercentilesAPI().catch(console.error);
