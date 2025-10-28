/**
 * Check ALL of Colin's contribution rows to see which metrics are populated
 */

import { createClient } from '@supabase/supabase-js';

async function checkAllMetrics() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking ALL contribution metrics for Colin Ma...\n');

  // Find Colin Ma
  const { data: colin } = await supabase
    .from('athletes')
    .select('id, first_name, last_name')
    .ilike('first_name', '%colin%')
    .ilike('last_name', '%ma%')
    .single();

  if (!colin) {
    console.error('❌ Could not find Colin Ma');
    return;
  }

  console.log(`✅ Found: ${colin.first_name} ${colin.last_name}\n`);

  // Get ALL contributions
  const { data: contributions } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('athlete_id', colin.id);

  if (!contributions || contributions.length === 0) {
    console.error('❌ No contributions found');
    return;
  }

  console.log(`📊 Found ${contributions.length} contributions:\n`);

  contributions.forEach(contrib => {
    console.log(`\n${contrib.test_type}:`);
    console.log(`   Test ID: ${contrib.test_id}`);
    console.log(`   Test Date: ${contrib.test_date}`);

    // Show ALL non-null metric values
    const metricKeys = Object.keys(contrib).filter(
      key => !['id', 'athlete_id', 'test_type', 'playing_level', 'test_id', 'test_date', 'contributed_at'].includes(key)
    );

    const populatedMetrics = metricKeys.filter(key => contrib[key] !== null);

    console.log(`   Populated metrics: ${populatedMetrics.length}/${metricKeys.length}`);

    if (populatedMetrics.length > 0) {
      console.log('   Values:');
      populatedMetrics.forEach(key => {
        console.log(`      ${key}: ${contrib[key]}`);
      });
    } else {
      console.log('   ❌ NO METRICS POPULATED');
    }
  });
}

checkAllMetrics().catch(console.error);
