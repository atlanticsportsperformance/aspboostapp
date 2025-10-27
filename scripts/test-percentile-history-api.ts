/**
 * Test the percentile history API endpoint with the new schema
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAPI() {
  // Get Thomas Daly's ID
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, first_name, last_name')
    .eq('first_name', 'Thomas')
    .eq('last_name', 'Daly')
    .single();

  if (!athlete) {
    console.error('Thomas Daly not found');
    return;
  }

  console.log(`Testing API for: ${athlete.first_name} ${athlete.last_name}`);
  console.log(`Athlete ID: ${athlete.id}\n`);

  // Call the API endpoint
  const response = await fetch(`http://localhost:3000/api/athletes/${athlete.id}/vald/percentile-history`);

  if (!response.ok) {
    console.error(`API returned ${response.status}`);
    const text = await response.text();
    console.error(text);
    return;
  }

  const data = await response.json();

  console.log('=== API Response ===\n');
  console.log(`Athlete: ${data.athlete.name}`);
  console.log(`Play Level: ${data.athlete.play_level}`);
  console.log(`Total Tests: ${data.total_tests}\n`);

  console.log('Tests by Type:');
  for (const [testType, tests] of Object.entries(data.history_by_test_type)) {
    if ((tests as any[]).length > 0) {
      console.log(`\n  ${testType}: ${(tests as any[]).length} tests`);

      // Show first test details
      const firstTest = (tests as any[])[0];
      console.log(`    Sample test:`);
      console.log(`      test_id: ${firstTest.test_id}`);
      console.log(`      test_date: ${firstTest.test_date}`);
      console.log(`      play_level: ${firstTest.play_level}`);
      console.log(`      composite_score_play_level: ${firstTest.composite_score_play_level}`);
      console.log(`      composite_score_overall: ${firstTest.composite_score_overall}`);

      console.log(`      metrics:`);
      Object.entries(firstTest.metrics).forEach(([metricName, metricData]: [string, any]) => {
        console.log(`        ${metricName}:`);
        console.log(`          value: ${metricData.value}`);
        console.log(`          percentile_play_level: ${metricData.percentile_play_level}`);
        console.log(`          percentile_overall: ${metricData.percentile_overall}`);
      });
    }
  }

  console.log('\n✅ API working correctly with new schema!');
}

testAPI().catch(console.error);
