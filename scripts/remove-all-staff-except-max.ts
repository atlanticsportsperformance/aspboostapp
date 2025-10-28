import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function removeAllStaffExceptMax() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   REMOVING ALL STAFF EXCEPT MAX DITONDO                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get Max's profile ID
  const { data: maxProfile } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .eq('email', 'info@atlanticperformancetraining.com')
    .single();

  if (!maxProfile) {
    console.error('❌ Could not find Max DiTondo profile!');
    return;
  }

  console.log('✅ Found Max DiTondo:');
  console.log(`   Email: ${maxProfile.email}`);
  console.log(`   ID: ${maxProfile.id}\n`);

  // Get all staff EXCEPT Max
  const { data: otherStaff } = await supabase
    .from('staff')
    .select('id, user_id')
    .neq('user_id', maxProfile.id);

  console.log(`Found ${otherStaff?.length || 0} other staff members to remove:\n`);

  if (otherStaff && otherStaff.length > 0) {
    for (const staff of otherStaff) {
      // Get profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', staff.user_id)
        .single();

      console.log(`Removing: ${profile?.email} (${profile?.first_name} ${profile?.last_name})`);

      // Delete staff_permissions first (foreign key constraint)
      const { error: permsError } = await supabase
        .from('staff_permissions')
        .delete()
        .eq('staff_id', staff.id);

      if (permsError) {
        console.log(`  ⚠️  Could not delete permissions: ${permsError.message}`);
      } else {
        console.log('  ✓ Deleted permissions');
      }

      // Delete staff record
      const { error: staffError } = await supabase
        .from('staff')
        .delete()
        .eq('id', staff.id);

      if (staffError) {
        console.log(`  ❌ Could not delete staff: ${staffError.message}`);
      } else {
        console.log('  ✓ Deleted staff record');
      }

      // Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(staff.user_id);

      if (authError) {
        console.log(`  ⚠️  Could not delete auth user: ${authError.message}`);
      } else {
        console.log('  ✓ Deleted auth user');
      }

      console.log('');
    }
  }

  // Verify only Max remains
  console.log('═══════════════════════════════════════════════════════════');
  const { data: remainingStaff } = await supabase
    .from('staff')
    .select('id, user_id');

  console.log(`\n✅ CLEANUP COMPLETE`);
  console.log(`   Remaining staff: ${remainingStaff?.length || 0}`);

  if (remainingStaff?.length === 1) {
    console.log('   ✓ Only Max DiTondo remains!\n');
  }
}

removeAllStaffExceptMax();
