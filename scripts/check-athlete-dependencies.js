/**
 * Check what tables reference athletes to understand deletion impact
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAthleteDependencies() {
  console.log('\n📊 Checking Athlete Data Dependencies\n');
  console.log('='.repeat(80));

  // List of tables that likely reference athletes
  const tablesToCheck = [
    'cmj_tests',
    'sj_tests',
    'hj_tests',
    'ppu_tests',
    'imtp_tests',
    'athlete_percentile_history',
    'athlete_percentile_contributions',
    'blast_swings',
    'trackman_sessions',
    'rapsodo_sessions',
    'exercise_logs',
    'body_measurements',
    'vald_profile_links',
  ];

  const sampleAthleteId = 'fc6ad90a-0db4-459d-b34a-9e9a68f00b8e'; // Cameron

  console.log(`\nUsing sample athlete: ${sampleAthleteId}\n`);

  const results = [];

  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('athlete_id', sampleAthleteId);

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`⚠️  ${table}: Table doesn't exist`);
        } else {
          console.log(`❌ ${table}: Error - ${error.message}`);
        }
      } else {
        const recordCount = count || 0;
        results.push({ table, count: recordCount });
        console.log(`${recordCount > 0 ? '✅' : '⬜'} ${table}: ${recordCount} records`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Summary:\n');

  const tablesWithData = results.filter(r => r.count > 0);
  const totalRecords = results.reduce((sum, r) => sum + r.count, 0);

  console.log(`Tables with athlete data: ${tablesWithData.length}`);
  console.log(`Total records referencing athletes: ${totalRecords}`);

  console.log('\n⚠️  DELETION IMPACT:');
  console.log('\nDeleting an athlete will DELETE or ORPHAN records in:');
  for (const result of tablesWithData) {
    console.log(`  - ${result.table} (${result.count} records)`);
  }

  console.log('\n💡 RECOMMENDATION:');
  console.log('\nInstead of deleting athletes:');
  console.log('  1. Add "deleted_at" timestamp column to athletes table');
  console.log('  2. Soft delete athletes (set deleted_at = NOW())');
  console.log('  3. Filter out deleted athletes in queries');
  console.log('  4. Keeps historical data intact for reporting');

  console.log('\nOR if you want fresh start:');
  console.log('  1. Delete from child tables FIRST (tests, history, contributions)');
  console.log('  2. Then delete from athletes table LAST');
  console.log('  3. Run recalculation scripts to rebuild percentile_lookup');

  console.log('\n' + '='.repeat(80));
}

checkAthleteDependencies().catch(console.error);
