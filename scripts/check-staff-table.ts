import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// Load .env.local
config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStaffTable() {
  console.log('=== CHECKING STAFF TABLE ===\n');

  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: false });

  console.log('Staff count:', staff?.length || 0);
  if (staffError) {
    console.log('Error:', staffError);
  }

  if (staff && staff.length > 0) {
    staff.forEach(s => {
      console.log(`- Staff ID: ${s.id}`);
      console.log(`  User ID: ${s.user_id}`);
      console.log(`  Role: ${s.role}`);
      console.log(`  Active: ${s.is_active}`);
      console.log(`  Created: ${s.created_at}`);
      console.log('');
    });
  }

  console.log('\n=== CHECKING PROFILES (admin/coach/super_admin) ===\n');

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, app_role')
    .in('app_role', ['admin', 'coach', 'super_admin', 'owner']);

  console.log('Admin/Coach/Owner profiles:', profiles?.length || 0);
  if (profilesError) {
    console.log('Error:', profilesError);
  }

  if (profiles && profiles.length > 0) {
    profiles.forEach(p => {
      console.log(`- ${p.email}`);
      console.log(`  Name: ${p.first_name} ${p.last_name}`);
      console.log(`  Role: ${p.app_role}`);
      console.log(`  ID: ${p.id}`);
      console.log('');
    });
  }

  // Check if profiles have matching staff records
  console.log('\n=== MATCHING PROFILES TO STAFF ===\n');
  if (profiles && profiles.length > 0) {
    for (const profile of profiles) {
      const staffRecord = staff?.find(s => s.user_id === profile.id);
      if (staffRecord) {
        console.log(`✓ ${profile.email} - HAS staff record (staff_id: ${staffRecord.id})`);
      } else {
        console.log(`✗ ${profile.email} - MISSING staff record!`);
      }
    }
  }
}

checkStaffTable();
