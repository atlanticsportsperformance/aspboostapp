/**
 * Check what user/profile/role tables exist
 */

import { createClient } from '@supabase/supabase-js';

async function checkUserTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking user/profile/role tables...\n');

  const tablesToCheck = [
    'profiles',
    'users',
    'user_roles',
    'roles',
    'staff',
    'coaches',
    'athletes'
  ];

  for (const table of tablesToCheck) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ ${table}: Does not exist or no access`);
    } else {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      console.log(`✅ ${table}: Exists (${count} rows)`);

      if (data && data.length > 0) {
        console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
      }
    }
  }

  // Check Supabase auth.users
  console.log('\n🔍 Checking Supabase Auth users...\n');

  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.log('❌ Cannot access auth.users:', authError.message);
  } else {
    console.log(`✅ Supabase Auth: ${authData.users.length} users`);
    if (authData.users.length > 0) {
      console.log(`   Sample user: ${authData.users[0].email}`);
    }
  }
}

checkUserTables().catch(console.error);
