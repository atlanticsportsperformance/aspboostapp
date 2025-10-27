/**
 * Backfill missing contributions for Colin Ma
 * He has 2 complete sessions but only IMTP contribution exists
 * Need to add: CMJ, SJ, HJ, PPU
 */

import { createClient } from '@supabase/supabase-js';

async function backfillColinContributions() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔧 Backfilling Colin Ma\'s Missing Contributions...\n');

  // 1. Find Colin Ma
  const { data: colin, error: colinError } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .ilike('first_name', '%colin%')
    .ilike('last_name', '%ma%')
    .single();

  if (colinError || !colin) {
    console.error('❌ Could not find Colin Ma');
    return;
  }

  console.log(`✅ Found: ${colin.first_name} ${colin.last_name}`);
  console.log(`   ID: ${colin.id}`);
  console.log(`   Play Level: ${colin.play_level}\n`);

  const athleteId = colin.id;
  const playLevel = colin.play_level;

  if (!playLevel) {
    console.error('❌ Colin has no play level set');
    return;
  }

  // 2. Check existing contributions
  const { data: existingContributions } = await supabase
    .from('athlete_percentile_contributions')
    .select('test_type')
    .eq('athlete_id', athleteId);

  const existingTypes = new Set(existingContributions?.map(c => c.test_type) || []);

  console.log(`📊 Existing Contributions: ${existingTypes.size}`);
  existingTypes.forEach(type => {
    console.log(`   ✅ ${type}`);
  });
  console.log('');

  // 3. Get the most recent test for each missing type
  const testTypes = [
    { type: 'CMJ', table: 'cmj_tests' },
    { type: 'SJ', table: 'sj_tests' },
    { type: 'HJ', table: 'hj_tests' },
    { type: 'PPU', table: 'ppu_tests' },
    { type: 'IMTP', table: 'imtp_tests' },
  ];

  const contributionsToAdd = [];

  for (const testType of testTypes) {
    if (existingTypes.has(testType.type)) {
      console.log(`⏭️  Skipping ${testType.type} (already exists)`);
      continue;
    }

    // Get the most recent test for this type
    const { data: tests } = await supabase
      .from(testType.table)
      .select('test_id, recorded_utc')
      .eq('athlete_id', athleteId)
      .order('recorded_utc', { ascending: false })
      .limit(1);

    if (tests && tests.length > 0) {
      const test = tests[0];
      contributionsToAdd.push({
        athlete_id: athleteId,
        test_type: testType.type,
        playing_level: playLevel,
        test_id: test.test_id,
        test_date: test.recorded_utc,
      });

      console.log(`✅ Will add ${testType.type} contribution`);
      console.log(`   Test ID: ${test.test_id}`);
      console.log(`   Date: ${new Date(test.recorded_utc).toLocaleDateString()}\n`);
    } else {
      console.log(`⚠️  No ${testType.type} tests found for Colin\n`);
    }
  }

  if (contributionsToAdd.length === 0) {
    console.log('✅ No contributions to add - Colin is already complete!');
    return;
  }

  // 4. Insert the contributions
  console.log(`\n🚀 Inserting ${contributionsToAdd.length} contribution(s)...\n`);

  for (const contribution of contributionsToAdd) {
    const { error } = await supabase
      .from('athlete_percentile_contributions')
      .insert(contribution);

    if (error) {
      console.error(`❌ Failed to insert ${contribution.test_type}:`, error.message);
    } else {
      console.log(`✅ Inserted ${contribution.test_type} contribution`);
    }
  }

  // 5. Verify final state
  console.log('\n🔍 Verifying final contributions...\n');

  const { data: finalContributions } = await supabase
    .from('athlete_percentile_contributions')
    .select('test_type, playing_level, test_date')
    .eq('athlete_id', athleteId)
    .order('test_type', { ascending: true });

  if (finalContributions) {
    console.log(`✅ Colin Ma now has ${finalContributions.length} contribution(s):`);
    finalContributions.forEach(c => {
      console.log(`   - ${c.test_type} (${c.playing_level}) - ${new Date(c.test_date).toLocaleDateString()}`);
    });

    if (finalContributions.length === 5) {
      console.log('\n🎉 SUCCESS! Colin Ma is now fully contributing to all 5 test types!');
    } else {
      console.log(`\n⚠️  Expected 5 contributions, found ${finalContributions.length}`);
    }
  }

  console.log('\n✅ Backfill complete!');
}

backfillColinContributions().catch(console.error);
