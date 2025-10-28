/**
 * Check what playing levels exist in driveline_percentiles
 */

import { createClient } from '@supabase/supabase-js';

async function checkDrivelineLevels() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking playing levels in driveline_percentiles...\n');

  // Get unique playing levels
  const { data: levels } = await supabase
    .from('driveline_percentiles')
    .select('playing_level')
    .order('playing_level');

  if (!levels || levels.length === 0) {
    console.error('❌ No data in driveline_percentiles table');
    return;
  }

  const uniqueLevels = [...new Set(levels.map(l => l.playing_level))];

  console.log(`📊 Playing levels in Driveline data:\n`);
  for (const level of uniqueLevels) {
    const { count } = await supabase
      .from('driveline_percentiles')
      .select('*', { count: 'exact', head: true })
      .eq('playing_level', level);

    console.log(`   ${level}: ${count} rows`);
  }

  // Check test types per level
  console.log('\n📋 Test types per playing level:\n');
  for (const level of uniqueLevels) {
    const { data: testTypes } = await supabase
      .from('driveline_percentiles')
      .select('test_type')
      .eq('playing_level', level);

    if (testTypes) {
      const uniqueTestTypes = [...new Set(testTypes.map(t => t.test_type))];
      console.log(`   ${level}:`);
      console.log(`      Test Types: ${uniqueTestTypes.join(', ')}`);
    }
  }

  // Check if High School exists
  console.log('\n🔍 Checking for "High School"...\n');
  const { count: hsCount } = await supabase
    .from('driveline_percentiles')
    .select('*', { count: 'exact', head: true })
    .eq('playing_level', 'High School');

  if (hsCount === 0) {
    console.log('   ❌ No "High School" data found in driveline_percentiles');
    console.log('   💡 This means percentile calculations for High School athletes');
    console.log('      will ONLY use athlete_percentile_contributions data');
  } else {
    console.log(`   ✅ Found ${hsCount} rows for High School`);
  }
}

checkDrivelineLevels().catch(console.error);
