// Script to clean up orphaned auth users (auth accounts with no athlete/staff record)
// Run with: npx tsx scripts/cleanup-orphaned-auth-users.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanupOrphanedAuthUsers() {
  console.log('🔍 Finding orphaned auth users...\n');

  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      throw new Error(`Failed to list auth users: ${authError.message}`);
    }

    console.log(`Found ${authUsers.users.length} total auth users\n`);

    const orphanedUsers: Array<{ id: string; email: string; role: string }> = [];

    // Check each auth user
    for (const user of authUsers.users) {
      const userId = user.id;
      const email = user.email || 'no-email';

      // Check if user exists in profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('app_role')
        .eq('id', userId)
        .single();

      if (!profile) {
        orphanedUsers.push({ id: userId, email, role: 'no-profile' });
        continue;
      }

      // Check based on role
      if (profile.app_role === 'athlete') {
        // Check if athlete record exists
        const { data: athlete } = await supabase
          .from('athletes')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!athlete) {
          orphanedUsers.push({ id: userId, email, role: 'athlete-missing' });
        }
      } else if (['coach', 'admin', 'owner', 'super_admin'].includes(profile.app_role)) {
        // Check if staff record exists
        const { data: staff } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!staff) {
          orphanedUsers.push({ id: userId, email, role: `${profile.app_role}-missing` });
        }
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`Total auth users: ${authUsers.users.length}`);
    console.log(`Orphaned users: ${orphanedUsers.length}\n`);

    if (orphanedUsers.length === 0) {
      console.log('✅ No orphaned auth users found! Database is clean.');
      return;
    }

    console.log('🗑️  Orphaned auth users found:\n');
    orphanedUsers.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email} (${user.role})`);
    });

    console.log('\n⚠️  These auth users have no corresponding athlete/staff records.');
    console.log('\n🔧 To delete them, run this script with --delete flag:');
    console.log('   npx tsx scripts/cleanup-orphaned-auth-users.ts --delete\n');

    // Check if --delete flag is passed
    if (process.argv.includes('--delete')) {
      console.log('\n🗑️  Deleting orphaned users...\n');

      for (const user of orphanedUsers) {
        try {
          // Delete from profiles first
          await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id);

          // Delete from auth
          const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

          if (deleteError) {
            console.log(`❌ Failed to delete ${user.email}: ${deleteError.message}`);
          } else {
            console.log(`✅ Deleted: ${user.email}`);
          }
        } catch (err) {
          console.error(`❌ Error deleting ${user.email}:`, err);
        }
      }

      console.log(`\n✅ Cleanup complete! Deleted ${orphanedUsers.length} orphaned auth users.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupOrphanedAuthUsers();
