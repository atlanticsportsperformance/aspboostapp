// Check why VALD sync is forbidden
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSyncPermissions() {
  console.log('🔍 Checking VALD Sync Permissions\n');

  // Get your user (you need to provide your email)
  const userEmail = process.argv[2];
  if (!userEmail) {
    console.error('❌ Please provide your email as an argument');
    console.log('Usage: npx tsx scripts/check-sync-permissions.ts your@email.com');
    process.exit(1);
  }

  console.log(`Checking permissions for: ${userEmail}\n`);

  // 1. Check auth user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.users?.find(u => u.email === userEmail);

  if (!authUser) {
    console.error(`❌ Auth user not found for ${userEmail}`);
    return;
  }

  console.log(`✅ Auth user found: ${authUser.id}`);

  // 2. Check profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('app_role, org_id')
    .eq('id', authUser.id)
    .single();

  if (profileError || !profile) {
    console.error('❌ Profile not found!', profileError);
    return;
  }

  console.log(`✅ Profile found:`);
  console.log(`   - Role: ${profile.app_role}`);
  console.log(`   - Org ID: ${profile.org_id}`);

  // 3. Check if role has permission
  const allowedRoles = ['coach', 'admin', 'super_admin'];
  const hasPermission = allowedRoles.includes(profile.app_role);

  if (!hasPermission) {
    console.error(`\n❌ PERMISSION ISSUE: Role "${profile.app_role}" is not allowed`);
    console.log(`   Required roles: ${allowedRoles.join(', ')}`);
    console.log(`\n🔧 FIX: Update your profile role with:`);
    console.log(`   UPDATE profiles SET app_role = 'coach' WHERE id = '${authUser.id}';`);
    return;
  }

  console.log(`\n✅ Role "${profile.app_role}" has permission to sync\n`);

  // 4. Check athletes in your org
  const { data: athletes, error: athletesError } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, org_id, vald_profile_id')
    .eq('org_id', profile.org_id);

  if (athletesError) {
    console.error('❌ Error fetching athletes:', athletesError);
    return;
  }

  console.log(`📋 Athletes in your org (${profile.org_id}):\n`);

  if (!athletes || athletes.length === 0) {
    console.log('   No athletes found in your org!');
    console.log('\n🔧 FIX: Athletes need to have matching org_id:');
    console.log(`   UPDATE athletes SET org_id = '${profile.org_id}' WHERE org_id IS NULL;`);
    return;
  }

  athletes.forEach((athlete, i) => {
    console.log(`   ${i + 1}. ${athlete.first_name} ${athlete.last_name}`);
    console.log(`      - ID: ${athlete.id}`);
    console.log(`      - Org ID: ${athlete.org_id}`);
    console.log(`      - VALD Profile: ${athlete.vald_profile_id || 'Not linked'}`);
    console.log('');
  });

  // 5. Check for org_id mismatches
  const { data: orphanAthletes } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, org_id')
    .neq('org_id', profile.org_id);

  if (orphanAthletes && orphanAthletes.length > 0) {
    console.log(`\n⚠️  Found ${orphanAthletes.length} athlete(s) in OTHER orgs:\n`);
    orphanAthletes.forEach((athlete, i) => {
      console.log(`   ${i + 1}. ${athlete.first_name} ${athlete.last_name} (Org: ${athlete.org_id})`);
    });
    console.log('\n   These athletes cannot be synced by you.');
  }

  console.log('\n✅ Permission check complete!');
}

checkSyncPermissions().catch(console.error);
