/**
 * Check if VALD test tables are connected to percentile system
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Checking VALD → Percentile System Connection\n');
  console.log('='.repeat(80) + '\n');

  // 1. Check if test tables exist
  console.log('STEP 1: Checking Test Tables\n');

  const testTables = ['cmj_tests', 'sj_tests', 'hj_tests', 'ppu_tests', 'imtp_tests'];

  for (const table of testTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`  ❌ ${table}: Does not exist - ${error.message}`);
    } else {
      console.log(`  ✅ ${table}: Exists (${count} rows)`);
    }
  }

  // 2. Check if athlete_percentile_contributions table exists
  console.log('\n\nSTEP 2: Checking Percentile Contribution Table\n');

  const { count: contribCount, error: contribError } = await supabase
    .from('athlete_percentile_contributions')
    .select('*', { count: 'exact', head: true });

  if (contribError) {
    console.log(`  ❌ athlete_percentile_contributions: Does not exist`);
    console.log(`     Error: ${contribError.message}\n`);
  } else {
    console.log(`  ✅ athlete_percentile_contributions: Exists (${contribCount} rows)\n`);
  }

  // 3. Check for triggers on test tables
  console.log('\nSTEP 3: Checking for Auto-Contribution Triggers\n');

  // Query triggers using a simpler approach that doesn't require exec_sql
  const { data: triggers, error: triggerError } = await supabase
    .from('information_schema.triggers' as any)
    .select('event_object_table, trigger_name')
    .in('event_object_table', ['cmj_tests', 'sj_tests', 'hj_tests', 'ppu_tests', 'imtp_tests'])
    .eq('event_object_schema', 'public');

  if (triggerError) {
    console.log('  ⚠️  Cannot query triggers (might need exec_sql function)\n');
    console.log('  Manual check needed in Supabase dashboard\n');
  } else if (!triggers || triggers.length === 0) {
    console.log('  ❌ NO TRIGGERS FOUND on test tables!\n');
    console.log('  This means VALD test data will NOT automatically contribute to percentiles!\n');
  } else {
    console.log(`  ✅ Found ${triggers.length} trigger(s):\n`);
    triggers.forEach((t: any) => {
      console.log(`    - ${t.table_name}: ${t.trigger_name}`);
    });
  }

  // 4. Check for duplicate prevention
  console.log('\n\nSTEP 4: Checking Duplicate Prevention\n');

  const { data: constraints } = await supabase
    .from('information_schema.table_constraints' as any)
    .select('table_name, constraint_name, constraint_type')
    .in('table_name', ['cmj_tests', 'sj_tests', 'hj_tests', 'ppu_tests', 'imtp_tests'])
    .in('constraint_type', ['UNIQUE', 'PRIMARY KEY'])
    .eq('table_schema', 'public');

  if (constraints && constraints.length > 0) {
    console.log('  Constraints found:\n');
    constraints.forEach((c: any) => {
      console.log(`    ${c.table_name}: ${c.constraint_type} (${c.constraint_name})`);
    });
  } else {
    console.log('  ⚠️  No unique constraints found - duplicate prevention unclear\n');
  }

  // 5. Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📋 SUMMARY\n');

  const hasTestTables = testTables.every(async (table) => {
    const { error } = await supabase.from(table).select('*', { head: true });
    return !error;
  });

  const hasContribTable = !contribError;
  const hasTriggers = triggers && triggers.length > 0;

  if (hasContribTable && hasTriggers) {
    console.log('✅ System is connected!\n');
    console.log('  - Test tables exist');
    console.log('  - Contribution table exists');
    console.log('  - Triggers are set up\n');
  } else {
    console.log('❌ System is NOT fully connected!\n');

    if (!hasContribTable) {
      console.log('  ❌ athlete_percentile_contributions table missing');
    }
    if (!hasTriggers) {
      console.log('  ❌ No triggers found on test tables');
      console.log('     VALD data will NOT auto-contribute to percentiles!\n');
    }

    console.log('\n🔧 Required Actions:\n');
    console.log('1. Create athlete_percentile_contributions table');
    console.log('2. Create triggers on all 5 test tables');
    console.log('3. Implement 2nd complete session detection logic\n');
  }
}

main().catch(console.error);
