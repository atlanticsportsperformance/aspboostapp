import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkReferences() {
  const email = process.argv[2] || 'max@atlanticsportsperformance.com';

  // Get all auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const user = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.log('User not found:', email);
    return;
  }

  console.log('Found user:', user.id, user.email);
  console.log('\nChecking references in database tables:\n');

  // Check all tables that might reference this user
  const tablesToCheck = [
    { table: 'profiles', column: 'id' },
    { table: 'athletes', column: 'user_id' },
    { table: 'staff', column: 'user_id' },
    { table: 'coach_athletes', column: 'coach_id' },
    { table: 'athlete_percentile_contributions', column: 'athlete_id' },
    { table: 'athlete_workout_instances', column: 'athlete_id' },
    { table: 'workout_logs', column: 'athlete_id' },
  ];

  for (const { table, column } of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .eq(column, user.id);

      if (error) {
        console.log(`X ${table}.${column}: Error - ${error.message}`);
      } else {
        console.log(`✓ ${table}.${column}: ${count || 0} records`);
        if (count && count > 0 && data && data.length > 0) {
          console.log('   Sample:', JSON.stringify(data[0], null, 2));
        }
      }
    } catch (e: any) {
      console.log(`! ${table}.${column}: ${e.message}`);
    }
  }
}

checkReferences().catch(console.error);
