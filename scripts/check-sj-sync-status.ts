/**
 * Check if SJ tests are syncing to database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkSJStatus() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('\n=== Checking SJ Test Sync Status ===\n');

  // Check if any SJ tests exist for Scott
  const { data: sjTests, error } = await supabase
    .from('sj_tests')
    .select('*')
    .eq('athlete_id', 'e080c1dd-5b2d-47d4-a0cf-8d2e4e5bc8c8')
    .order('recorded_utc', { ascending: false });

  if (error) {
    console.error('❌ Error querying SJ tests:', error.message);
    process.exit(1);
  }

  if (!sjTests || sjTests.length === 0) {
    console.log('❌ NO SJ tests found for Scott in database');
    console.log('   This means sync is still failing or hasn\'t been run since column additions');
  } else {
    console.log(`✅ Found ${sjTests.length} SJ test(s) for Scott`);
    console.log('\nLatest test:');
    const latest = sjTests[0];
    console.log(`   Date: ${latest.recorded_utc}`);
    console.log(`   Power: ${latest.bodymass_relative_takeoff_power_trial_value || 'null'} W/kg`);
    console.log(`   Jump Height: ${latest.jump_height_trial_value || 'null'} cm`);
    console.log(`   Columns present: ${Object.keys(latest).length}`);
  }

  // Check all test types for Scott
  console.log('\n=== All Test Types for Scott ===\n');
  const testTypes = [
    { name: 'CMJ', table: 'cmj_tests' },
    { name: 'SJ', table: 'sj_tests' },
    { name: 'HJ', table: 'hj_tests' },
    { name: 'PPU', table: 'ppu_tests' },
    { name: 'IMTP', table: 'imtp_tests' },
  ];

  for (const { name, table } of testTypes) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', 'e080c1dd-5b2d-47d4-a0cf-8d2e4e5bc8c8');

    console.log(`${name}: ${count || 0} test(s)`);
  }
}

checkSJStatus()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
