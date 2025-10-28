import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugUserDeletion() {
  const userId = '41850383-10b6-4efe-a2e7-63a606f0885f'; // admin user

  console.log('Checking why user deletion might have failed...\n');
  console.log(`User ID: ${userId}\n`);

  // Check if profile still exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  console.log('1. Profile:', profile ? 'STILL EXISTS' : 'DELETED');
  if (profile) console.log('   Data:', profile);

  // Check if staff still exists
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('*')
    .eq('user_id', userId);

  console.log('2. Staff records:', staff?.length || 0);

  // Check if athlete still exists
  const { data: athlete } = await supabase
    .from('athletes')
    .select('*')
    .eq('user_id', userId);

  console.log('3. Athlete records:', athlete?.length || 0);

  // Check auth.identities
  const { data: identities } = await supabase
    .from('identities')
    .select('*')
    .eq('user_id', userId);

  console.log('4. Auth identities:', identities?.length || 'Cannot check (RLS)');

  // Try to check if auth user still exists via admin API
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(u => u.id === userId);

  console.log('5. Auth user:', authUser ? 'STILL EXISTS ❌' : 'DELETED ✓');
  if (authUser) {
    console.log('   Email:', authUser.email);
    console.log('   Created:', authUser.created_at);
  }

  console.log('\n=== CONCLUSION ===');
  if (authUser && !profile) {
    console.log('The profile was deleted but the auth user remains.');
    console.log('This suggests the DELETE FROM auth.users failed silently.');
  }
}

debugUserDeletion().catch(console.error);
