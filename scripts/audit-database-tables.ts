/**
 * Audit all tables in the database to see what we have and what we need
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Auditing Database Tables\n');
  console.log('='.repeat(80) + '\n');

  // List of tables we expect/need for percentile system
  const percentileTables = [
    'driveline_seed_data',
    'athlete_percentile_contributions',
    'athlete_percentile_history',
    'percentile_metric_mappings',
    'percentile_lookup',
    'percentile_pool', // OLD - should be dropped
  ];

  // Test tables
  const testTables = [
    'cmj_tests',
    'sj_tests',
    'hj_tests',
    'ppu_tests',
    'imtp_tests',
  ];

  // Core tables
  const coreTables = [
    'athletes',
    'profiles',
    'organizations',
  ];

  // VALD sync tables
  const valdTables = [
    'vald_profile_queue',
  ];

  console.log('📊 PERCENTILE SYSTEM TABLES:\n');

  for (const table of percentileTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`  ❌ ${table.padEnd(40)} DOES NOT EXIST`);
    } else {
      const status = table === 'percentile_pool' ? '⚠️  SHOULD DROP' : '✅';
      console.log(`  ${status} ${table.padEnd(40)} ${count} rows`);
    }
  }

  console.log('\n📋 TEST DATA TABLES:\n');

  for (const table of testTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`  ❌ ${table.padEnd(40)} DOES NOT EXIST`);
    } else {
      console.log(`  ✅ ${table.padEnd(40)} ${count} rows`);
    }
  }

  console.log('\n👥 CORE TABLES:\n');

  for (const table of coreTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`  ❌ ${table.padEnd(40)} DOES NOT EXIST`);
    } else {
      console.log(`  ✅ ${table.padEnd(40)} ${count} rows`);
    }
  }

  console.log('\n🔗 VALD SYNC TABLES:\n');

  for (const table of valdTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`  ❌ ${table.padEnd(40)} DOES NOT EXIST`);
    } else {
      console.log(`  ✅ ${table.padEnd(40)} ${count} rows`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  console.log('📝 RECOMMENDATIONS:\n');

  // Check if percentile_pool exists
  const { error: poolError } = await supabase
    .from('percentile_pool')
    .select('*', { count: 'exact', head: true });

  if (!poolError) {
    console.log('  🗑️  DROP TABLE: percentile_pool');
    console.log('     Reason: Old approach with 57k individual metric values');
    console.log('     We use: driveline_seed_data + athlete_percentile_contributions instead\n');
  }

  // Check if we have the old calculate_percentile function
  console.log('  🧹 CLEANUP: Drop old calculate_percentile() function');
  console.log('     Reason: We use lookup_percentile() with pre-calculated values now\n');

  console.log('✅ TABLES WE NEED (Keep These):\n');
  console.log('  - driveline_seed_data (1,934 baseline athlete records)');
  console.log('  - athlete_percentile_contributions (2nd test contributions)');
  console.log('  - athlete_percentile_history (historical percentile tracking)');
  console.log('  - percentile_metric_mappings (6 composite metrics config)');
  console.log('  - percentile_lookup (12,110 pre-calculated percentiles)');
  console.log('  - cmj_tests, sj_tests, hj_tests, ppu_tests, imtp_tests (VALD test data)');
  console.log('  - athletes, profiles, organizations (core data)');
  console.log('  - vald_profile_queue (VALD sync queue)\n');
}

main().catch(console.error);
