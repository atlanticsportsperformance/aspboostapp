/**
 * Check what percentile tables currently exist in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('🔍 Checking current database schema...\n');

  // Check what percentile-related tables exist
  const tables = [
    'percentile_pool',
    'driveline_seed_data',
    'athlete_percentile_contributions',
    'athlete_percentile_history',
    'percentile_metric_mappings'
  ];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: Does not exist`);
    } else {
      console.log(`✅ ${table}: EXISTS (${data === null ? 0 : 'has data'})`);

      // Get count
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      console.log(`   → Row count: ${count}`);
    }
  }

  // Show what columns are in percentile_pool if it exists
  console.log('\n📊 Checking percentile_pool structure...');
  const { data: poolSample } = await supabase
    .from('percentile_pool')
    .select('*')
    .limit(1);

  if (poolSample && poolSample.length > 0) {
    console.log('   Columns:', Object.keys(poolSample[0]).join(', '));
  }
}

main().catch(console.error);
