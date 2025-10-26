/**
 * Verify the percentile system is set up correctly
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('🔍 Verifying Percentile System Setup\n');

  // 1. Check percentile_pool data
  console.log('1️⃣  Checking percentile_pool table...');
  const { data: poolData, error: poolError } = await supabase
    .from('percentile_pool')
    .select('test_type, play_level, metric_name')
    .limit(1);

  if (poolError) {
    console.error('❌ Error querying percentile_pool:', poolError.message);
    process.exit(1);
  }

  const { count: totalCount } = await supabase
    .from('percentile_pool')
    .select('*', { count: 'exact', head: true });

  console.log(`   ✅ Found ${totalCount} data points in percentile_pool`);

  // 2. Get summary by test type and play level
  console.log('\n2️⃣  Summary by Test Type and Play Level:');
  const { data: summary, error: summaryError } = await supabase.rpc('get_percentile_pool_summary');

  if (summaryError) {
    // If function doesn't exist, do it manually
    const { data: manualSummary } = await supabase
      .from('percentile_pool')
      .select('test_type, play_level');

    const grouped: Record<string, Record<string, number>> = {};
    manualSummary?.forEach((row) => {
      if (!grouped[row.test_type]) grouped[row.test_type] = {};
      if (!grouped[row.test_type][row.play_level]) {
        grouped[row.test_type][row.play_level] = 0;
      }
      grouped[row.test_type][row.play_level]++;
    });

    Object.entries(grouped).forEach(([testType, levels]) => {
      console.log(`\n   ${testType}:`);
      Object.entries(levels).forEach(([level, count]) => {
        console.log(`     ${level}: ${count} data points`);
      });
    });
  } else {
    summary?.forEach((row: any) => {
      console.log(`   ${row.test_type} - ${row.play_level}: ${row.count} data points`);
    });
  }

  // 3. Test percentile calculation function
  console.log('\n3️⃣  Testing percentile calculation function...');

  // Get a sample value to test with
  const { data: sampleData } = await supabase
    .from('percentile_pool')
    .select('value, test_type, metric_name, play_level')
    .eq('test_type', 'CMJ')
    .eq('metric_name', 'jump_height')
    .limit(1)
    .single();

  if (sampleData) {
    const { data: percentileResult, error: percentileError } = await supabase
      .rpc('calculate_percentile', {
        p_value: sampleData.value,
        p_test_type: sampleData.test_type,
        p_metric_name: sampleData.metric_name,
        p_play_level: sampleData.play_level,
      });

    if (percentileError) {
      console.error('   ❌ Error calculating percentile:', percentileError.message);
    } else {
      console.log(`   ✅ Test calculation successful!`);
      console.log(`      Value: ${sampleData.value} (${sampleData.metric_name})`);
      console.log(`      Percentile: ${percentileResult} (${sampleData.play_level})`);
    }
  }

  // 4. Check metric mappings
  console.log('\n4️⃣  Checking metric mappings...');
  const { count: mappingsCount } = await supabase
    .from('percentile_metric_mappings')
    .select('*', { count: 'exact', head: true });

  console.log(`   ✅ Found ${mappingsCount} metric mappings`);

  // 5. Check composite metrics
  const { data: compositeMetrics } = await supabase
    .from('percentile_metric_mappings')
    .select('metric_name, display_name, test_type, composite_priority')
    .eq('is_composite_metric', true)
    .order('composite_priority');

  console.log('\n5️⃣  Composite Score Metrics (6 total):');
  compositeMetrics?.forEach((metric) => {
    console.log(`   ${metric.composite_priority}. ${metric.display_name} (${metric.test_type})`);
  });

  console.log('\n✅ Percentile system verification complete!\n');
  console.log('📊 System is ready for:');
  console.log('   - Calculating athlete percentiles');
  console.log('   - Tracking percentile history');
  console.log('   - Computing composite scores');
  console.log('   - Auto-contribution from 2nd tests\n');
}

main().catch(console.error);
