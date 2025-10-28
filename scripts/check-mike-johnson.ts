import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkMikeJohnson() {
  console.log('=== CHECKING FOR MIKE JOHNSON ===\n');

  // Check by email
  const { data: byEmail } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'owner@elitebaseball.com')
    .single();

  console.log('Profile by email (owner@elitebaseball.com):');
  console.log(JSON.stringify(byEmail, null, 2));

  if (byEmail) {
    // Check if there's a staff record
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', byEmail.id);

    console.log('\nStaff record for Mike Johnson:');
    console.log(JSON.stringify(staffRecord, null, 2));
  }

  // Show all profiles
  console.log('\n=== ALL PROFILES ===\n');
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, app_role')
    .order('created_at', { ascending: false })
    .limit(10);

  allProfiles?.forEach(p => {
    console.log(`- ${p.email} (${p.first_name} ${p.last_name}) - ${p.app_role}`);
  });
}

checkMikeJohnson();
