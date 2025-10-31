/**
 * Check Force Profile entries across all athletes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkForceProfiles() {
  console.log('\n📊 Checking Force Profile Entries\n');
  console.log('='.repeat(80));

  // Get all Force Profile entries grouped by athlete
  const { data: forceProfiles, error } = await supabase
    .from('athlete_percentile_history')
    .select(`
      athlete_id,
      test_date,
      play_level,
      percentile_play_level,
      percentile_overall,
      athletes (
        first_name,
        last_name
      )
    `)
    .eq('test_type', 'FORCE_PROFILE')
    .order('athlete_id')
    .order('test_date', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\nTotal Force Profile entries: ${forceProfiles.length}\n`);

  // Group by athlete
  const byAthlete = {};
  for (const fp of forceProfiles) {
    if (!byAthlete[fp.athlete_id]) {
      byAthlete[fp.athlete_id] = [];
    }
    byAthlete[fp.athlete_id].push(fp);
  }

  // Display by athlete
  for (const [athleteId, profiles] of Object.entries(byAthlete)) {
    const athlete = profiles[0].athletes;
    const name = athlete ? `${athlete.first_name} ${athlete.last_name}` : 'Unknown';

    console.log(`\n${name} (${athleteId}):`);
    console.log(`  Play Level: ${profiles[0].play_level}`);
    console.log(`  Force Profile Count: ${profiles.length}`);

    if (profiles.length === 0) {
      console.log('  ❌ No Force Profile entries');
    } else if (profiles.length === 1) {
      console.log('  ⚠️  Only 1 Force Profile entry (need 2 for comparison)');
      console.log(`     Date: ${new Date(profiles[0].test_date).toLocaleDateString()}`);
      console.log(`     Percentile: ${profiles[0].percentile_play_level}`);
    } else {
      console.log('  ✅ Multiple Force Profile entries:');
      for (const profile of profiles) {
        console.log(`     ${new Date(profile.test_date).toLocaleDateString()}: ${profile.percentile_play_level}th percentile`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
}

checkForceProfiles().catch(console.error);
