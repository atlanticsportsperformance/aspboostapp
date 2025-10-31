const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContributions() {
  console.log('=== CHECKING ACTUAL CONTRIBUTIONS IN DATABASE ===\n');

  // Get all Youth contributions
  const { data: contributions, error } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('playing_level', 'Youth')
    .order('athlete_id', { ascending: true })
    .order('test_type', { ascending: true });

  if (error) {
    console.error('Error fetching contributions:', error);
    return;
  }

  console.log(`Total Youth contributions in database: ${contributions?.length || 0}\n`);

  if (!contributions || contributions.length === 0) {
    console.log('❌ NO YOUTH CONTRIBUTIONS FOUND!\n');
    console.log('This means the backfill script either:');
    console.log('1. Has not been run yet');
    console.log('2. Failed to execute');
    console.log('3. Had an error during execution\n');
    return;
  }

  // Group by athlete
  const byAthlete = {};
  contributions.forEach(c => {
    if (!byAthlete[c.athlete_id]) {
      byAthlete[c.athlete_id] = [];
    }
    byAthlete[c.athlete_id].push(c);
  });

  console.log('CONTRIBUTIONS BY ATHLETE:\n');

  Object.entries(byAthlete).forEach(([athleteId, contribs], idx) => {
    console.log(`Athlete ${idx + 1}: ${athleteId.substring(0, 8)}...`);
    contribs.forEach(c => {
      console.log(`   ${c.test_type} - Test Date: ${c.test_date} - Test ID: ${c.test_id?.substring(0, 8)}...`);
    });
    console.log('');
  });

  // Expected vs Actual
  console.log('=== EXPECTED VS ACTUAL ===\n');
  console.log('EXPECTED (from analysis):');
  console.log('   8 total contributions');
  console.log('   - Athlete cb209d13... (Emmitt): CMJ, SJ, HJ, IMTP (4 contributions)');
  console.log('   - Athlete 90ae7b7b... : CMJ, SJ, HJ, PPU (4 contributions)');
  console.log('');
  console.log(`ACTUAL (from database): ${contributions.length} contributions`);
  console.log('');

  if (contributions.length === 8) {
    console.log('✅ CORRECT! All expected contributions are present.');
  } else if (contributions.length < 8) {
    console.log(`❌ MISSING ${8 - contributions.length} contributions!`);
    console.log('');
    console.log('LIKELY CAUSES:');
    console.log('1. Backfill script has not been run');
    console.log('2. SQL triggers are not deployed yet');
    console.log('3. Some tests were inserted before triggers were created');
  } else {
    console.log(`⚠️  MORE than expected! Found ${contributions.length} instead of 8.`);
    console.log('This could mean duplicate entries or incorrect filtering.');
  }

  console.log('');
  console.log('=== NEXT STEPS ===\n');

  if (contributions.length < 8) {
    console.log('TO FIX:');
    console.log('1. Run the backfill script: scripts/backfill-contributions.sql');
    console.log('2. Verify it completes without errors');
    console.log('3. Run this script again to verify');
  } else if (contributions.length === 8) {
    console.log('CONTRIBUTIONS ARE CORRECT!');
    console.log('');
    console.log('Now you need to calculate Youth percentiles:');
    console.log('1. Open Supabase SQL Editor');
    console.log('2. Run: scripts/calculate-youth-percentiles.sql');
    console.log('3. Verify with: node -r dotenv/config scripts/check-percentile-lookup.js dotenv_config_path=.env.local');
  }
}

checkContributions().catch(console.error);
