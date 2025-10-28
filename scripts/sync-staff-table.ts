import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function syncStaffTable() {
  console.log('=== SYNCING STAFF TABLE ===\n');

  // Get all admin and coach profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, app_role')
    .in('app_role', ['admin', 'coach', 'super_admin']);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    return;
  }

  console.log(`Found ${profiles?.length || 0} admin/coach/super_admin profiles\n`);

  // Get all existing staff records
  const { data: existingStaff } = await supabase
    .from('staff')
    .select('user_id');

  const existingUserIds = new Set(existingStaff?.map(s => s.user_id) || []);

  // Find profiles without staff records
  const missingStaff = profiles?.filter(p => !existingUserIds.has(p.id)) || [];

  if (missingStaff.length === 0) {
    console.log('✓ All profiles already have staff records!');
    return;
  }

  console.log(`Found ${missingStaff.length} profiles missing staff records:\n`);
  missingStaff.forEach(p => {
    console.log(`- ${p.email} (${p.first_name} ${p.last_name}) - ${p.app_role}`);
  });

  console.log('\n=== ADDING MISSING STAFF RECORDS ===\n');

  for (const profile of missingStaff) {
    // Map super_admin to admin for staff table (since staff table doesn't have super_admin enum)
    const staffRole = profile.app_role === 'super_admin' ? 'admin' : profile.app_role as 'admin' | 'coach';

    const { error: insertError } = await supabase
      .from('staff')
      .insert({
        user_id: profile.id,
        role: staffRole,
        is_active: true
      });

    if (insertError) {
      console.error(`✗ Failed to add ${profile.email}:`, insertError);
    } else {
      console.log(`✓ Added ${profile.email} to staff table (role: ${staffRole})`);
    }
  }

  // Create default permissions for new staff
  console.log('\n=== CREATING DEFAULT PERMISSIONS ===\n');

  const { data: newStaff } = await supabase
    .from('staff')
    .select('id, user_id')
    .in('user_id', missingStaff.map(p => p.id));

  if (newStaff) {
    for (const staff of newStaff) {
      const profile = missingStaff.find(p => p.id === staff.user_id);
      if (!profile) continue;

      // Check if permissions already exist
      const { data: existingPerms } = await supabase
        .from('staff_permissions')
        .select('id')
        .eq('staff_id', staff.id)
        .single();

      if (existingPerms) {
        console.log(`- Permissions already exist for ${profile.email}`);
        continue;
      }

      // Create default permissions based on role
      const isSuperAdmin = profile.app_role === 'super_admin';
      const isAdmin = profile.app_role === 'admin';

      const { error: permsError } = await supabase
        .from('staff_permissions')
        .insert({
          staff_id: staff.id,
          // Content creation
          can_create_exercises: true,
          can_create_workouts: true,
          can_create_routines: true,
          can_create_plans: true,
          // Content editing
          can_edit_own_exercises: true,
          can_edit_own_workouts: true,
          can_edit_own_routines: true,
          can_edit_own_plans: true,
          can_edit_all_exercises: isSuperAdmin || isAdmin,
          can_edit_all_workouts: isSuperAdmin || isAdmin,
          can_edit_all_routines: isSuperAdmin || isAdmin,
          can_edit_all_plans: isSuperAdmin || isAdmin,
          // Content deletion
          can_delete_own_exercises: true,
          can_delete_own_workouts: true,
          can_delete_own_routines: true,
          can_delete_own_plans: true,
          can_delete_all_exercises: isSuperAdmin || isAdmin,
          can_delete_all_workouts: isSuperAdmin || isAdmin,
          can_delete_all_routines: isSuperAdmin || isAdmin,
          can_delete_all_plans: isSuperAdmin || isAdmin,
          // Visibility
          exercises_visibility: isSuperAdmin || isAdmin ? 'all' : 'own_and_admin',
          workouts_visibility: isSuperAdmin || isAdmin ? 'all' : 'own_and_admin',
          routines_visibility: isSuperAdmin || isAdmin ? 'all' : 'own_and_admin',
          plans_visibility: isSuperAdmin || isAdmin ? 'all' : 'own_and_admin',
          athlete_visibility: isSuperAdmin || isAdmin ? 'all' : 'assigned'
        });

      if (permsError) {
        console.error(`✗ Failed to create permissions for ${profile.email}:`, permsError);
      } else {
        console.log(`✓ Created permissions for ${profile.email}`);
      }
    }
  }

  console.log('\n=== SYNC COMPLETE ===');
}

syncStaffTable();
