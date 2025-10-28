/**
 * Check driveline_seed_data table
 */

import { createClient } from '@supabase/supabase-js';

async function checkSeedData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking driveline_seed_data table...\n');

  const { data: sample, error } = await supabase
    .from('driveline_seed_data')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!sample || sample.length === 0) {
    console.log('❌ driveline_seed_data is EMPTY');
    return;
  }

  console.log('✅ driveline_seed_data has data\n');

  const { count } = await supabase
    .from('driveline_seed_data')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total rows: ${count}\n`);

  // Check columns
  console.log('📋 Columns:\n');
  Object.keys(sample[0]).forEach(key => {
    console.log(`   - ${key}: ${sample[0][key]}`);
  });
}

checkSeedData().catch(console.error);
