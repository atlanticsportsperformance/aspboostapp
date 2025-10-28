/**
 * Check what app_roles are currently in use
 */

import { createClient } from '@supabase/supabase-js';

async function checkRoles() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Current Roles in System\n');

  // Check profiles.app_role
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, app_role, org_id');

  if (profiles) {
    console.log('📋 Profiles (app_role):\n');
    profiles.forEach(p => {
      console.log(`   ${p.email?.padEnd(30)} → ${p.app_role || 'NULL'} ${p.first_name ? `(${p.first_name} ${p.last_name})` : ''}`);
    });

    const uniqueRoles = [...new Set(profiles.map(p => p.app_role).filter(r => r))];
    console.log(`\n   Unique app_roles: ${uniqueRoles.join(', ') || 'None set'}\n`);
  }

  // Check staff.role
  const { data: staff } = await supabase
    .from('staff')
    .select('user_id, role, title, is_active');

  if (staff) {
    console.log('📋 Staff (role):\n');
    for (const s of staff) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', s.user_id)
        .single();

      console.log(`   ${profile?.email?.padEnd(30)} → ${s.role} (${s.title})`);
    }

    const uniqueStaffRoles = [...new Set(staff.map(s => s.role))];
    console.log(`\n   Unique staff roles: ${uniqueStaffRoles.join(', ')}\n`);
  }

  // Check athletes
  const { data: athletes } = await supabase
    .from('athletes')
    .select('user_id, first_name, last_name, email, is_active');

  if (athletes) {
    console.log('📋 Athletes:\n');
    athletes.forEach(a => {
      console.log(`   ${a.email?.padEnd(30)} → athlete (${a.first_name} ${a.last_name})`);
    });
    console.log('');
  }
}

checkRoles().catch(console.error);
