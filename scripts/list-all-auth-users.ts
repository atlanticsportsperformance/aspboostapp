import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function listAllAuthUsers() {
  console.log('Fetching all auth users...\n');

  // Get all auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers();

  if (!authUsers || authUsers.users.length === 0) {
    console.log('No auth users found');
    return;
  }

  console.log(`Found ${authUsers.users.length} auth users:\n`);

  for (const user of authUsers.users) {
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Created: ${user.created_at}`);

    // Check if profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      console.log('⚠️  NO PROFILE - ORPHANED AUTH USER');
    } else {
      console.log(`Profile: ${profile.app_role}`);

      // Check if linked to athlete/staff
      if (profile.app_role === 'athlete') {
        const { data: athlete } = await supabase
          .from('athletes')
          .select('id, first_name, last_name')
          .eq('user_id', user.id)
          .single();

        if (!athlete) {
          console.log('⚠️  Athlete profile exists but NO ATHLETE RECORD - ORPHANED');
        } else {
          console.log(`Athlete: ${athlete.first_name} ${athlete.last_name}`);
        }
      } else if (['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
        const { data: staff } = await supabase
          .from('staff')
          .select('id, role')
          .eq('user_id', user.id)
          .single();

        if (!staff) {
          console.log(`⚠️  ${profile.app_role.toUpperCase()} profile exists but NO STAFF RECORD - ORPHANED`);
        } else {
          console.log(`Staff: ${staff.role}`);
        }
      }
    }

    console.log('---\n');
  }
}

listAllAuthUsers().catch(console.error);
