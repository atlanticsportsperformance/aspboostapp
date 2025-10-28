import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runPhase3A() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   PHASE 3A: Add Staff Management Permissions               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Add the columns
  console.log('1️⃣  Adding staff management permission columns...');

  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE staff_permissions
      ADD COLUMN IF NOT EXISTS can_view_staff BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS can_manage_staff BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS can_view_all_staff BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS can_assign_permissions BOOLEAN DEFAULT false;
    `
  });

  if (alterError) {
    console.log('   ⚠️  Could not add columns via RPC, they may already exist');
    console.log('   Error:', alterError.message);
  } else {
    console.log('   ✅ Columns added successfully');
  }

  // Update super admin permissions
  console.log('\n2️⃣  Setting permissions for super_admin (Max DiTondo)...');

  const { data: superAdminProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('app_role', 'super_admin')
    .single();

  if (superAdminProfile) {
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', superAdminProfile.id)
      .single();

    if (staffRecord) {
      const { error: updateError } = await supabase
        .from('staff_permissions')
        .update({
          can_view_staff: true,
          can_manage_staff: true,
          can_view_all_staff: true,
          can_assign_permissions: true
        })
        .eq('staff_id', staffRecord.id);

      if (updateError) {
        console.log('   ❌ Error:', updateError.message);
      } else {
        console.log('   ✅ Super admin permissions set');
      }
    }
  }

  // Verify
  console.log('\n3️⃣  VERIFICATION:\n');

  const { data: verification } = await supabase
    .from('staff_permissions')
    .select(`
      staff_id,
      can_view_staff,
      can_manage_staff,
      can_view_all_staff,
      can_assign_permissions
    `);

  if (verification && verification.length > 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, app_role')
      .eq('id', 'ead4ed71-fc1e-47f7-bf7c-f29387dcea2f')
      .single();

    const perms = verification[0];
    console.log(`   User: ${profile?.first_name} ${profile?.last_name} (${profile?.email})`);
    console.log(`   Role: ${profile?.app_role}`);
    console.log(`   can_view_staff: ${perms.can_view_staff}`);
    console.log(`   can_manage_staff: ${perms.can_manage_staff}`);
    console.log(`   can_view_all_staff: ${perms.can_view_all_staff}`);
    console.log(`   can_assign_permissions: ${perms.can_assign_permissions}`);
  }

  console.log('\n✅ PHASE 3A COMPLETE\n');
}

runPhase3A();
