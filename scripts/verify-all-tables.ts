import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
  console.log('🔍 VERIFYING ALL KEY TABLES...\n');

  const tables = [
    'athletes',
    'exercises',
    'workouts',
    'routines',
    'routine_exercises',
    'workout_instances',
    'exercise_logs',
    'athlete_maxes',
    'athlete_kpis',
    'athlete_kpi_values',
    'custom_measurements'
  ];

  for (const tableName of tables) {
    console.log(`\n📋 Checking: ${tableName}`);
    console.log('='.repeat(50));

    // Get sample record to see columns
    const { data: sample, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log(`❌ ERROR accessing table:`, error.message);
      continue;
    }

    if (!sample) {
      console.log(`⚠️  Table exists but is EMPTY`);

      // Try to get column info by attempting an insert with invalid data
      const { error: testError } = await supabase
        .from(tableName)
        .insert({ _test: 'test' } as any)
        .select();

      if (testError) {
        console.log(`   Schema check: Table accessible`);
      }
      continue;
    }

    console.log(`✅ Table has data (${Object.keys(sample).length} columns)`);
    console.log(`   Columns:`, Object.keys(sample).join(', '));

    // Get row count
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    console.log(`   Row count: ${count || 0}`);
  }

  console.log('\n\n🔬 DETAILED SCHEMA CHECKS:\n');

  // Check exercise_logs columns specifically
  console.log('📊 exercise_logs table:');
  const testLog = {
    workout_instance_id: '00000000-0000-0000-0000-000000000000',
    routine_exercise_id: '00000000-0000-0000-0000-000000000000',
    athlete_id: '00000000-0000-0000-0000-000000000000',
    exercise_id: '00000000-0000-0000-0000-000000000000',
    set_number: 1,
    target_sets: 3,
    actual_reps: 10,
    actual_weight: 100,
    metric_data: { test: 1 }
  };

  const { error: logError } = await supabase
    .from('exercise_logs')
    .insert(testLog)
    .select();

  if (logError) {
    if (logError.code === '23503') {
      console.log('   ✅ Core columns exist (foreign key error expected)');
    } else if (logError.code === 'PGRST204') {
      console.log(`   ❌ MISSING COLUMN: ${logError.message}`);
    } else {
      console.log(`   ⚠️  Error: ${logError.message}`);
    }
  } else {
    console.log('   ✅ All columns exist and work');
  }

  // Check athlete_maxes
  console.log('\n🏆 athlete_maxes table:');
  const testMax = {
    athlete_id: '00000000-0000-0000-0000-000000000000',
    exercise_id: '00000000-0000-0000-0000-000000000000',
    metric_id: 'weight',
    max_value: 100,
    reps_at_max: 1,
    achieved_on: '2025-10-29',
    source: 'logged'
  };

  const { error: maxError } = await supabase
    .from('athlete_maxes')
    .insert(testMax)
    .select();

  if (maxError) {
    if (maxError.code === '23503') {
      console.log('   ✅ Core columns exist (foreign key error expected)');
    } else if (maxError.code === 'PGRST204') {
      console.log(`   ❌ MISSING COLUMN: ${maxError.message}`);
    } else if (maxError.code === '23505') {
      console.log('   ✅ Unique constraint working properly');
    } else {
      console.log(`   ⚠️  Error: ${maxError.message}`);
    }
  } else {
    console.log('   ✅ All columns exist and work');
  }

  // Check athlete_kpi_values
  console.log('\n📈 athlete_kpi_values table:');
  const testKPI = {
    athlete_kpi_id: '00000000-0000-0000-0000-000000000000',
    value: 42.5,
    measured_at: new Date().toISOString()
  };

  const { error: kpiError } = await supabase
    .from('athlete_kpi_values')
    .insert(testKPI)
    .select();

  if (kpiError) {
    if (kpiError.code === '23503') {
      console.log('   ✅ Core columns exist (foreign key error expected)');
    } else if (kpiError.code === 'PGRST204') {
      console.log(`   ❌ MISSING COLUMN: ${kpiError.message}`);
    } else {
      console.log(`   ⚠️  Error: ${kpiError.message}`);
    }
  } else {
    console.log('   ✅ All columns exist and work');
  }

  // Check custom_measurements
  console.log('\n🎨 custom_measurements table:');
  const testCustom = {
    exercise_id: '00000000-0000-0000-0000-000000000000',
    measurement_id: 'test_metric',
    enabled: true,
    display_order: 1
  };

  const { error: customError } = await supabase
    .from('custom_measurements')
    .insert(testCustom)
    .select();

  if (customError) {
    if (customError.code === '23503') {
      console.log('   ✅ Core columns exist (foreign key error expected)');
    } else if (customError.code === 'PGRST204') {
      console.log(`   ❌ MISSING COLUMN: ${customError.message}`);
    } else if (customError.code === '23505') {
      console.log('   ✅ Unique constraint working properly');
    } else {
      console.log(`   ⚠️  Error: ${customError.message}`);
    }
  } else {
    console.log('   ✅ All columns exist and work');
  }

  console.log('\n\n✨ TABLE VERIFICATION COMPLETE!\n');
}

verifyTables().catch(console.error);
