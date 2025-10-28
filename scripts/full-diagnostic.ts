import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fullDiagnostic() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           FULL DATABASE DIAGNOSTIC                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 1. Check your current session
  console.log('1️⃣  YOUR CURRENT LOGIN:');
  console.log('   Email: info@atlanticperformancetraining.com');
  console.log('   Name: Max DiTondo');
  console.log('   Expected Role: super_admin\n');

  // 2. Check profiles table
  console.log('2️⃣  PROFILES TABLE (admin/coach/super_admin only):');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, app_role')
    .in('app_role', ['admin', 'coach', 'super_admin']);

  if (profiles) {
    profiles.forEach(p => {
      const isYou = p.email === 'info@atlanticperformancetraining.com' ? '⭐ YOU' : '';
      console.log(`   - ${p.email}`);
      console.log(`     Name: ${p.first_name} ${p.last_name}`);
      console.log(`     Role: ${p.app_role}`);
      console.log(`     ID: ${p.id} ${isYou}`);
      console.log('');
    });
  }

  // 3. Check staff table
  console.log('3️⃣  STAFF TABLE (all records):');
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: false });

  console.log(`   Total staff records: ${staff?.length || 0}\n`);
  if (staff) {
    staff.forEach(s => {
      console.log(`   - Staff ID: ${s.id}`);
      console.log(`     User ID: ${s.user_id}`);
      console.log(`     Role: ${s.role}`);
      console.log(`     Active: ${s.is_active}`);
      console.log('');
    });
  }

  // 4. Match profiles to staff
  console.log('4️⃣  MATCHING PROFILES TO STAFF:');
  if (profiles) {
    for (const profile of profiles) {
      const staffRecord = staff?.find(s => s.user_id === profile.id);
      const isYou = profile.email === 'info@atlanticperformancetraining.com' ? '⭐' : ' ';
      if (staffRecord) {
        console.log(`   ${isYou} ✅ ${profile.email} - HAS staff record`);
      } else {
        console.log(`   ${isYou} ❌ ${profile.email} - MISSING staff record (THIS IS THE PROBLEM!)`);
      }
    }
  }

  // 5. Check athletes table
  console.log('\n5️⃣  ATHLETES TABLE:');
  const { data: athletes } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, email, is_active')
    .eq('is_active', true);

  console.log(`   Total active athletes: ${athletes?.length || 0}\n`);
  if (athletes && athletes.length > 0) {
    athletes.forEach(a => {
      console.log(`   - ${a.first_name} ${a.last_name}`);
      console.log(`     Email: ${a.email || 'No email'}`);
      console.log(`     ID: ${a.id}`);
      console.log('');
    });
  } else {
    console.log('   ❌ NO ATHLETES FOUND - This might be the problem!\n');
  }

  // 6. Check staff_permissions table
  console.log('6️⃣  STAFF PERMISSIONS TABLE:');
  const { data: permissions } = await supabase
    .from('staff_permissions')
    .select('staff_id');

  console.log(`   Total permission records: ${permissions?.length || 0}\n`);

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           DIAGNOSTIC COMPLETE                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

fullDiagnostic();
