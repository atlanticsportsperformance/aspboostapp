/**
 * Check exercises, plans, workouts, routines tables
 */

import { createClient } from '@supabase/supabase-js';

async function checkContentTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking content tables...\n');

  const tablesToCheck = [
    'exercises',
    'workout_plans',
    'workouts',
    'routines',
    'programs',
  ];

  for (const table of tablesToCheck) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ ${table}: Does not exist`);
    } else {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      console.log(`✅ ${table}: Exists (${count} rows)`);

      if (data && data.length > 0) {
        console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
      }
      console.log('');
    }
  }
}

checkContentTables().catch(console.error);
