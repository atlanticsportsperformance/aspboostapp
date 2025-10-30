const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkValdProfile() {
  const profileId = 'b341abcb-3ecb-408f-b7c1-027b542c008f';

  console.log('🔍 Checking VALD profile:', profileId);
  console.log('');

  // Check vald_profiles table
  const { data: valdProfile, error: valdError } = await supabase
    .from('vald_profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (valdError) {
    console.log('❌ Error fetching VALD profile:', valdError.message);
  } else if (valdProfile) {
    console.log('✅ VALD Profile found:');
    console.log(JSON.stringify(valdProfile, null, 2));
  } else {
    console.log('❌ No VALD profile found with this ID');
  }

  console.log('');
  console.log('---');
  console.log('');

  // Check if this profile is linked to any athlete
  const { data: linkedAthlete, error: athleteError } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, email, vald_profile_id')
    .eq('vald_profile_id', profileId)
    .single();

  if (linkedAthlete) {
    console.log('👤 Linked to athlete:');
    console.log(JSON.stringify(linkedAthlete, null, 2));
  } else {
    console.log('ℹ️  Not linked to any athlete');
  }

  console.log('');
  console.log('---');
  console.log('');

  // Search for "Lincoln Beliveau" in vald_profiles
  const { data: lincolnProfiles, error: searchError } = await supabase
    .from('vald_profiles')
    .select('*')
    .or('first_name.ilike.%Lincoln%,last_name.ilike.%Beliveau%');

  if (lincolnProfiles && lincolnProfiles.length > 0) {
    console.log(`🔍 Found ${lincolnProfiles.length} VALD profile(s) matching "Lincoln Beliveau":`);
    lincolnProfiles.forEach((profile, idx) => {
      console.log(`\n[${idx + 1}]`);
      console.log(JSON.stringify(profile, null, 2));
    });
  } else {
    console.log('❌ No VALD profiles found matching "Lincoln Beliveau"');
  }

  console.log('');
  console.log('---');
  console.log('');

  // Search for athletes named Lincoln Beliveau
  const { data: lincolnAthletes } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, email, vald_profile_id')
    .or('first_name.ilike.%Lincoln%,last_name.ilike.%Beliveau%');

  if (lincolnAthletes && lincolnAthletes.length > 0) {
    console.log(`👥 Found ${lincolnAthletes.length} athlete(s) matching "Lincoln Beliveau":`);
    lincolnAthletes.forEach((athlete, idx) => {
      console.log(`\n[${idx + 1}]`);
      console.log(JSON.stringify(athlete, null, 2));
    });
  } else {
    console.log('❌ No athletes found matching "Lincoln Beliveau"');
  }
}

checkValdProfile().catch(console.error);
