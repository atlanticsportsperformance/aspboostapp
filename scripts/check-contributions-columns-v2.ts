/**
 * Query the database schema directly to see columns
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Checking athlete_percentile_contributions columns via SQL\n');

  // Get an actual athlete ID first
  const { data: athletes } = await supabase
    .from('athletes')
    .select('id, first_name, last_name')
    .limit(1);

  if (!athletes || athletes.length === 0) {
    console.log('❌ No athletes in database');
    return;
  }

  const athleteId = athletes[0].id;
  console.log(`Using athlete: ${athletes[0].first_name} ${athletes[0].last_name}\n`);

  // Try to insert with just required fields + one metric
  const { data: insertData, error: insertError } = await supabase
    .from('athlete_percentile_contributions')
    .insert({
      athlete_id: athleteId,
      test_type: 'CMJ',
      playing_level: 'College',
      test_id: 'schema-check-123',
      test_date: new Date().toISOString(),
      // Try adding one VALD metric
      jump_height_trial_value: 35.5
    })
    .select()
    .single();

  if (insertError) {
    console.log('❌ Insert error:', insertError.message);
    console.log('\nThis tells us about the schema...');
  } else {
    console.log('✅ Successfully inserted test row!\n');
    console.log('Table has these columns:\n');

    const columns = Object.keys(insertData);
    const metricColumns = columns.filter(c => c.includes('trial_value') || c.includes('asymm_value'));
    const systemColumns = columns.filter(c => !c.includes('trial_value') && !c.includes('asymm_value'));

    console.log('System Columns:');
    systemColumns.forEach(c => console.log(`  - ${c}`));

    console.log(`\nMetric Columns (${metricColumns.length} total):`);
    metricColumns.slice(0, 20).forEach(c => console.log(`  - ${c}`));
    if (metricColumns.length > 20) {
      console.log(`  ... and ${metricColumns.length - 20} more metric columns`);
    }

    // Clean up
    await supabase
      .from('athlete_percentile_contributions')
      .delete()
      .eq('test_id', 'schema-check-123');

    console.log('\n✅ Cleaned up test row\n');
  }

  // Also check driveline_seed_data columns for comparison
  console.log('📊 Comparing with driveline_seed_data columns:\n');

  const { data: seedData } = await supabase
    .from('driveline_seed_data')
    .select('*')
    .limit(1)
    .single();

  if (seedData) {
    const seedMetrics = Object.keys(seedData).filter(c =>
      c.includes('trial_value') || c.includes('asymm_value')
    );
    console.log(`driveline_seed_data has ${seedMetrics.length} metric columns\n`);
  }
}

main().catch(console.error);
