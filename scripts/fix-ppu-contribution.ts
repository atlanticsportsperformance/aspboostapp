/**
 * Fix the PPU contribution for Colin Ma
 */

import { createClient } from '@supabase/supabase-js';

async function fixPPUContribution() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔧 Fixing PPU Contribution for Colin Ma...\n');

  // Find Colin Ma
  const { data: colin } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .ilike('first_name', '%colin%')
    .ilike('last_name', '%ma%')
    .single();

  if (!colin) {
    console.error('❌ Could not find Colin Ma');
    return;
  }

  console.log(`✅ Found: ${colin.first_name} ${colin.last_name}`);
  console.log(`   ID: ${colin.id}`);
  console.log(`   Play Level: ${colin.play_level}\n`);

  // Get PPU test
  const { data: ppuTest, error: ppuError } = await supabase
    .from('ppu_tests')
    .select('test_id, recorded_utc')
    .eq('athlete_id', colin.id)
    .order('recorded_utc', { ascending: false })
    .limit(1)
    .single();

  if (ppuError || !ppuTest) {
    console.error('❌ Could not find PPU test:', ppuError);
    return;
  }

  console.log(`✅ Found PPU test:`);
  console.log(`   Test ID: ${ppuTest.test_id}`);
  console.log(`   Date: ${new Date(ppuTest.recorded_utc).toLocaleDateString()}\n`);

  // Insert PPU contribution
  const { data, error } = await supabase
    .from('athlete_percentile_contributions')
    .insert({
      athlete_id: colin.id,
      test_type: 'PPU',
      playing_level: colin.play_level,
      test_id: ppuTest.test_id,
      test_date: ppuTest.recorded_utc,
    })
    .select();

  if (error) {
    console.error('❌ Failed to insert PPU contribution:');
    console.error('   Error:', error);
    console.error('   Message:', error.message);
    console.error('   Details:', error.details);
    console.error('   Hint:', error.hint);
  } else {
    console.log('✅ PPU contribution inserted successfully!\n');
    console.log('   Data:', data);
  }

  // Verify final state
  const { data: finalContributions } = await supabase
    .from('athlete_percentile_contributions')
    .select('test_type')
    .eq('athlete_id', colin.id)
    .order('test_type', { ascending: true });

  console.log(`\n📊 Final Contributions: ${finalContributions?.length || 0}/5`);
  if (finalContributions) {
    finalContributions.forEach(c => {
      console.log(`   ✅ ${c.test_type}`);
    });
  }

  if (finalContributions?.length === 5) {
    console.log('\n🎉 SUCCESS! Colin Ma now has all 5 contributions!');
  } else {
    console.log(`\n⚠️  Still missing ${5 - (finalContributions?.length || 0)} contribution(s)`);
  }
}

fixPPUContribution().catch(console.error);
