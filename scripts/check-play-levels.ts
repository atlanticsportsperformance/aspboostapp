/**
 * Check what play levels exist in percentile_lookup table
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkPlayLevels() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('\n=== Checking Play Levels in Percentile Lookup ===\n');

  // Get all unique play levels
  const { data: playLevels } = await supabase
    .from('percentile_lookup')
    .select('play_level');

  if (playLevels) {
    const uniqueLevels = new Set(playLevels.map((p: any) => p.play_level));
    console.log(`✅ Available play levels: ${Array.from(uniqueLevels).join(', ')}`);
    console.log(`   Total: ${uniqueLevels.size} play levels\n`);

    // Count rows per play level
    for (const level of Array.from(uniqueLevels)) {
      const { count } = await supabase
        .from('percentile_lookup')
        .select('*', { count: 'exact', head: true })
        .eq('play_level', level);

      console.log(`${level}: ${count} rows`);
    }
  }

  console.log('\n=== Checking Scott\'s Play Level ===\n');

  // Check what play level Scott has
  const { data: athlete } = await supabase
    .from('athletes')
    .select('first_name, last_name, play_level')
    .eq('id', 'e080c1dd-5b2d-47d4-a0cf-8d2e4e5bc8c8')
    .single();

  if (athlete) {
    console.log(`Scott ${athlete.last_name}: play_level = "${athlete.play_level}"`);
  }

  console.log('\n=== Sample Percentiles for Each Play Level ===\n');

  const metric = 'net_peak_vertical_force_trial_value';

  const { data: allLevels } = await supabase
    .from('percentile_lookup')
    .select('play_level')
    .eq('metric_column', metric);

  if (allLevels) {
    const levels = new Set(allLevels.map((p: any) => p.play_level));

    for (const level of Array.from(levels)) {
      const { data } = await supabase
        .from('percentile_lookup')
        .select('percentile, value')
        .eq('metric_column', metric)
        .eq('play_level', level)
        .in('percentile', [1, 50, 99])
        .order('percentile', { ascending: true });

      console.log(`${level} - IMTP Net Peak Force:`);
      if (data) {
        data.forEach((row: any) => {
          console.log(`   ${row.percentile}th: ${row.value} N`);
        });
      }
      console.log('');
    }
  }
}

checkPlayLevels()
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
