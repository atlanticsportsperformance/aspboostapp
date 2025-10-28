import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAthleteAuth() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         ATHLETE AUTHENTICATION CHECK                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check if any athletes have user_id (linked to auth accounts)
  const { data: athletesWithAuth } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, email, user_id')
    .not('user_id', 'is', null);

  console.log('1️⃣  Athletes with auth accounts:', athletesWithAuth?.length || 0);
  if (athletesWithAuth && athletesWithAuth.length > 0) {
    athletesWithAuth.forEach(a => {
      console.log(`   - ${a.first_name} ${a.last_name}`);
      console.log(`     Email: ${a.email}`);
      console.log(`     User ID: ${a.user_id}`);
      console.log('');
    });
  }

  // Check profiles with athlete role
  const { data: athleteProfiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, app_role')
    .eq('app_role', 'athlete');

  console.log('\n2️⃣  Profiles with athlete role:', athleteProfiles?.length || 0);
  if (athleteProfiles && athleteProfiles.length > 0) {
    athleteProfiles.forEach(p => {
      console.log(`   - ${p.email}`);
      console.log(`     Name: ${p.first_name} ${p.last_name}`);
      console.log('');
    });
  }

  // Check all athletes
  const { data: allAthletes } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, email, user_id');

  const athletesWithoutAuth = allAthletes?.filter(a => !a.user_id) || [];

  console.log('\n3️⃣  SUMMARY:');
  console.log(`   Total athletes: ${allAthletes?.length || 0}`);
  console.log(`   With auth accounts: ${athletesWithAuth?.length || 0}`);
  console.log(`   WITHOUT auth accounts: ${athletesWithoutAuth.length}`);

  if (athletesWithoutAuth.length > 0) {
    console.log('\n   Athletes without login access:');
    athletesWithoutAuth.forEach(a => {
      console.log(`   - ${a.first_name} ${a.last_name} (${a.email})`);
    });
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         CONCLUSION                                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (athletesWithAuth && athletesWithAuth.length > 0) {
    console.log('\n✅ Athletes CAN log in (some have auth accounts)');
  } else {
    console.log('\n❌ Athletes CANNOT log in (no auth accounts exist)');
    console.log('   Athletes are just database records, not user accounts');
  }
}

checkAthleteAuth();
