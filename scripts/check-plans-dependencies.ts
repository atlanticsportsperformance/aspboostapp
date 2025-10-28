/**
 * Check dependencies on the old plans table
 */

import { createClient } from '@supabase/supabase-js';

async function checkDependencies() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if any table references the old plans table
  const tablesToCheck = [
    'plan_assignments',
    'program_days',
    'plan_tags',
    'athlete_plan_history'
  ];

  console.log('🔍 Checking which tables might reference the old plans table...\n');

  for (const table of tablesToCheck) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ ${table}: Does not exist or no access`);
    } else {
      console.log(`✅ ${table}: Exists`);
      if (data && data.length > 0) {
        console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
        if ('plan_id' in data[0]) {
          console.log(`   ⚠️  Has plan_id column - need to check which table it references`);
        }
      } else {
        console.log(`   (empty table)`);
      }
    }
  }

  // Count rows in old plans table
  const { data: oldPlans, error: oldError } = await supabase
    .from('plans')
    .select('id, name, created_at');

  console.log(`\n📊 OLD PLANS TABLE:`);
  console.log(`   Rows: ${oldPlans?.length || 0}`);
  if (oldPlans && oldPlans.length > 0) {
    console.log(`   Data:`);
    oldPlans.forEach(p => {
      console.log(`     - ${p.name} (created: ${p.created_at})`);
    });
  }
}

checkDependencies().catch(console.error);
