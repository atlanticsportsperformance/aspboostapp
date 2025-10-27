/**
 * Check if the trigger system exists for auto-contribution
 */

import { createClient } from '@supabase/supabase-js';

async function checkTriggerSystem() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking for auto-contribution trigger system...\n');

  // Check for trigger function
  const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        routine_name,
        routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND (routine_name LIKE '%contribution%' OR routine_name LIKE '%percentile%')
      ORDER BY routine_name;
    `
  }) as any;

  if (!funcError && functions) {
    console.log('📦 Functions found:');
    console.log(functions);
  } else {
    // Try a different approach
    const { data: altFunctions } = await supabase
      .from('pg_proc')
      .select('proname')
      .like('proname', '%contribution%') as any;

    console.log('📦 Searching for functions with "contribution" in name...');
    if (altFunctions && altFunctions.length > 0) {
      console.log('   Found:', altFunctions);
    } else {
      console.log('   ❌ No functions found');
    }
  }

  console.log('');

  // Check for triggers on test tables
  const testTables = ['cmj_tests', 'sj_tests', 'hj_tests', 'ppu_tests', 'imtp_tests'];

  console.log('🔧 Checking for triggers on test tables:\n');

  for (const table of testTables) {
    const { data: triggers } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          trigger_name,
          event_manipulation,
          action_timing
        FROM information_schema.triggers
        WHERE event_object_table = '${table}'
        AND event_object_schema = 'public';
      `
    }) as any;

    if (triggers && triggers.length > 0) {
      console.log(`✅ ${table}:`);
      triggers.forEach((t: any) => {
        console.log(`   - ${t.trigger_name} (${t.action_timing} ${t.event_manipulation})`);
      });
    } else {
      console.log(`❌ ${table}: No triggers found`);
    }
  }

  console.log('\n📊 Summary:');
  console.log('If you see ❌ above, the trigger system is MISSING and needs to be created');
  console.log('If you see ✅ above, the triggers exist but may not be working correctly');
}

checkTriggerSystem().catch(console.error);
