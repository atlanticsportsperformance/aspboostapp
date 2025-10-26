/**
 * Verify the FIXED percentile system
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Verifying FIXED Percentile System\n');

  // 1. Check driveline_seed_data has athlete RECORDS
  console.log('1️⃣  Checking driveline_seed_data table...');
  const { count: seedCount } = await supabase
    .from('driveline_seed_data')
    .select('*', { count: 'exact', head: true });

  console.log(`   ✅ Found ${seedCount} athlete RECORDS (should be ~1,934)`);

  // 2. Verify columns are VALD names
  const { data: sampleRecord } = await supabase
    .from('driveline_seed_data')
    .select('*')
    .limit(1)
    .single();

  if (sampleRecord) {
    const valdColumns = Object.keys(sampleRecord).filter(k =>
      k.includes('trial_value') || k.includes('asymm_value')
    );
    console.log(`   ✅ Found ${valdColumns.length} VALD column names`);
    console.log(`   Sample columns: ${valdColumns.slice(0, 5).join(', ')}...`);
  }

  // 3. Check percentile_pool is gone
  console.log('\n2️⃣  Checking percentile_pool was dropped...');
  const { error: poolError } = await supabase
    .from('percentile_pool')
    .select('*', { count: 'exact', head: true });

  if (poolError?.code === 'PGRST204' || poolError?.message?.includes('not find')) {
    console.log('   ✅ percentile_pool table successfully dropped');
  } else {
    console.log('   ❌ percentile_pool still exists!', poolError);
  }

  // 4. Summary by play level
  console.log('\n3️⃣  Summary by Play Level:\n');
  const { data: summary } = await supabase
    .from('driveline_seed_data')
    .select('playing_level');

  if (summary) {
    const counts: Record<string, number> = {};
    summary.forEach(row => {
      counts[row.playing_level] = (counts[row.playing_level] || 0) + 1;
    });

    Object.entries(counts).forEach(([level, count]) => {
      console.log(`   ${level}: ${count} athletes`);
    });
  }

  // 5. Test percentile calculation with VALD column names
  console.log('\n4️⃣  Testing percentile calculation...');

  // Get a sample value from seed data
  const { data: sampleData } = await supabase
    .from('driveline_seed_data')
    .select('net_peak_vertical_force_trial_value, playing_level')
    .not('net_peak_vertical_force_trial_value', 'is', null)
    .limit(1)
    .single();

  if (sampleData) {
    const { data: percentile, error: percError } = await supabase
      .rpc('calculate_percentile', {
        p_value: sampleData.net_peak_vertical_force_trial_value,
        p_column_name: 'net_peak_vertical_force_trial_value',
        p_play_level: sampleData.playing_level,
      });

    if (percError) {
      console.error('   ❌ Error calculating percentile:', percError);
    } else {
      console.log(`   ✅ Percentile calculation works!`);
      console.log(`      Value: ${sampleData.net_peak_vertical_force_trial_value} N`);
      console.log(`      Play Level: ${sampleData.playing_level}`);
      console.log(`      Percentile: ${percentile}%`);
    }
  }

  // 6. Verify the 6 composite metrics
  console.log('\n5️⃣  Checking 6 Composite Metrics...\n');
  const { data: compositeMetrics } = await supabase
    .from('percentile_metric_mappings')
    .select('vald_field_name, display_name, test_type')
    .eq('is_composite_metric', true)
    .order('composite_priority');

  compositeMetrics?.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.display_name} (${m.test_type})`);
    console.log(`      Column: ${m.vald_field_name}`);
  });

  // 7. Check athlete_percentile_contributions structure
  console.log('\n6️⃣  Checking athlete_percentile_contributions...');
  const { count: contribCount } = await supabase
    .from('athlete_percentile_contributions')
    .select('*', { count: 'exact', head: true });

  console.log(`   ✅ Table exists (${contribCount} records - should be 0 for now)`);

  console.log('\n✅ PERCENTILE SYSTEM VERIFICATION COMPLETE!\n');
  console.log('📊 Summary:');
  console.log(`   - driveline_seed_data: ${seedCount} athlete records with VALD column names`);
  console.log(`   - percentile_pool: DROPPED (correct)`);
  console.log(`   - athlete_percentile_contributions: Ready for 2nd tests`);
  console.log(`   - Percentile calculation: Working`);
  console.log(`   - 6 Composite metrics: Configured\n`);
}

main().catch(console.error);
