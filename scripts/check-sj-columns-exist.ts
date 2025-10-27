/**
 * Check if SJ columns actually exist in the database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkSJColumns() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('\n=== Checking SJ Table Columns ===\n');

  // Try to insert a test row with known columns to see what's available
  // First, let's try to select from an empty result to see the schema
  const { data, error } = await supabase
    .from('sj_tests')
    .select('*')
    .limit(0);

  if (error) {
    console.error('❌ Error querying sj_tests:', error.message);

    // Try using RPC to query information_schema
    console.log('\nTrying alternative method...\n');

    const { data: columns, error: colError } = await supabase.rpc('get_table_columns', {
      table_name: 'sj_tests'
    });

    if (colError) {
      console.error('❌ RPC error:', colError.message);
    } else {
      console.log('✅ Columns:', columns);
    }
  } else {
    console.log('✅ SJ table structure is accessible');
    console.log(`   Can query table (returned ${data?.length || 0} rows)`);
  }

  // Try a simple insert to test if basic columns work
  console.log('\n=== Testing Insert with Basic Columns ===\n');

  const testData = {
    athlete_id: 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f', // Scott's ID
    test_id: 'test_' + Date.now(),
    recorded_utc: new Date().toISOString(),
    recorded_timezone: 'UTC',
    jump_height_trial_value: 50.0,
    jump_height_trial_unit: 'cm',
  };

  console.log('Attempting to insert test row...');
  const { data: insertData, error: insertError } = await supabase
    .from('sj_tests')
    .insert([testData])
    .select();

  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    console.error('   Code:', insertError.code);
    console.error('   Details:', insertError.details);
  } else {
    console.log('✅ Insert successful!');
    console.log('   Inserted ID:', insertData?.[0]?.id);

    // Clean up - delete the test row
    if (insertData?.[0]?.id) {
      await supabase.from('sj_tests').delete().eq('id', insertData[0].id);
      console.log('   Cleaned up test row');
    }
  }

  // Try inserting with one of the "missing" columns
  console.log('\n=== Testing with Previously Missing Column ===\n');

  const testData2 = {
    ...testData,
    test_id: 'test_' + Date.now() + '_2',
    bm_rel_abs_con_impulse_trial_value: 1.5,
    bm_rel_abs_con_impulse_trial_unit: 'N·s/kg',
  };

  console.log('Attempting to insert with bm_rel_abs_con_impulse...');
  const { data: insertData2, error: insertError2 } = await supabase
    .from('sj_tests')
    .insert([testData2])
    .select();

  if (insertError2) {
    console.error('❌ Insert failed:', insertError2.message);
    console.error('   This column might not exist yet or schema cache needs refresh');
  } else {
    console.log('✅ Insert with bm_rel_abs_con_impulse successful!');

    // Clean up
    if (insertData2?.[0]?.id) {
      await supabase.from('sj_tests').delete().eq('id', insertData2[0].id);
      console.log('   Cleaned up test row');
    }
  }
}

checkSJColumns()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
