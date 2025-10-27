/**
 * Verify percentile_lookup table exists and has data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Checking percentile_lookup table...\n');

  // Check if table exists and has data
  const { data, error, count } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('❌ Error accessing percentile_lookup table:', error);
    return;
  }

  console.log(`✅ Table exists with ${count} rows\n`);

  // Check what play levels exist
  const { data: levels } = await supabase
    .from('percentile_lookup')
    .select('play_level');

  const uniqueLevels = [...new Set(levels?.map(l => l.play_level))];
  console.log('Play levels:', uniqueLevels);

  // Check Pro level specifically
  const { count: proCount } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true })
    .eq('play_level', 'Pro');

  console.log(`Pro level rows: ${proCount}`);

  // Test a simple query like the API does
  const { data: testData, error: testError } = await supabase
    .from('percentile_lookup')
    .select('percentile')
    .eq('metric_column', 'bodymass_relative_takeoff_power_trial_value')
    .eq('play_level', 'Pro')
    .lte('value', 55.684)
    .order('value', { ascending: false })
    .limit(1);

  if (testError) {
    console.error('❌ Test query error:', testError);
  } else {
    console.log('\n✅ Test query successful:', testData);
  }
}

main().catch(console.error);
