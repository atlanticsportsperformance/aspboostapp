/**
 * Check database functions related to percentiles
 */

import { createClient } from '@supabase/supabase-js';

async function checkFunctions() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking database functions...\n');

  // Query pg_catalog to get function definitions
  const { data: functions, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT
        n.nspname as schema,
        p.proname as function_name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname LIKE '%percentile%'
      ORDER BY p.proname;
    `
  });

  if (error) {
    console.error('❌ Error querying functions:', error.message);
    console.log('\n💡 Trying alternative method...\n');

    // Try getting function list
    const { data: funcList, error: funcError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT routine_name, routine_type
        FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND routine_name LIKE '%percentile%';
      `
    });

    if (funcError) {
      console.error('❌ Alternative method failed:', funcError.message);
      return;
    }

    if (funcList && funcList.length > 0) {
      console.log('📋 Found percentile-related functions:\n');
      funcList.forEach((func: any) => {
        console.log(`   ${func.routine_type}: ${func.routine_name}`);
      });
    }
    return;
  }

  if (!functions || functions.length === 0) {
    console.log('⚠️  No percentile-related functions found');
    return;
  }

  console.log(`✅ Found ${functions.length} percentile-related functions:\n`);

  functions.forEach((func: any) => {
    console.log(`${'='.repeat(80)}`);
    console.log(`Function: ${func.function_name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(func.definition);
    console.log('\n');
  });
}

checkFunctions().catch(console.error);
