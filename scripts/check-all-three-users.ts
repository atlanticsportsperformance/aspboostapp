import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAllThreeUsers() {
  const userIds = [
    { id: 'b7cc4843-7506-462a-8bc7-da5057845a92', email: 'coach1@elitebaseball.com' },
    { id: '41850383-10b6-4efe-a2e7-63a606f0885f', email: 'admin@elitebaseball.com' },
    { id: '13eb2baf-1a27-463c-9294-7cf700e06071', email: 'owner@elitebaseball.com' },
  ];

  console.log('Checking status of all 3 orphaned users...\n');

  const { data: authUsers } = await supabase.auth.admin.listUsers();

  for (const user of userIds) {
    const authUser = authUsers.users.find(u => u.id === user.id);

    if (authUser) {
      console.log(`❌ ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Status: STILL EXISTS in auth.users`);

      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('app_role')
        .eq('id', user.id)
        .single();

      if (profile) {
        console.log(`   Profile: EXISTS (${profile.app_role})`);
      } else {
        console.log(`   Profile: DELETED`);
      }
    } else {
      console.log(`✓ ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Status: SUCCESSFULLY DELETED`);
    }
    console.log('');
  }

  const remainingOrphans = authUsers.users.filter(u =>
    userIds.some(user => user.id === u.id)
  );

  console.log('=== SUMMARY ===');
  console.log(`${3 - remainingOrphans.length} of 3 users deleted`);
  console.log(`${remainingOrphans.length} still remaining`);
}

checkAllThreeUsers().catch(console.error);
