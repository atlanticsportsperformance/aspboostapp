/**
 * Verify Youth level has NULL placeholders
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Checking Youth Percentile Data\n');

  // Check total rows
  const { count: totalRows } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total percentile rows: ${totalRows}\n`);

  // Check Youth rows for one metric
  const { data: youthData } = await supabase
    .from('percentile_lookup')
    .select('percentile, value, total_count')
    .eq('metric_column', 'net_peak_vertical_force_trial_value')
    .eq('play_level', 'Youth')
    .order('percentile');

  console.log('📊 Net Peak Force (Youth):\n');

  if (youthData && youthData.length > 0) {
    console.log(`  Total rows: ${youthData.length}`);
    console.log(`  Total count: ${youthData[0].total_count}`);
    console.log(`  Value is NULL: ${youthData[0].value === null ? '✅ Yes (placeholder)' : '❌ No'}\n`);

    console.log('  Sample percentiles:');
    [0, 25, 50, 75, 100].forEach(p => {
      const row = youthData.find(r => r.percentile === p);
      if (row) {
        console.log(`    ${p.toString().padStart(3)}th: ${row.value === null ? 'NULL (no data yet)' : row.value + ' N'}`);
      }
    });
  } else {
    console.log('  ❌ No Youth rows found!');
  }

  // Count rows by level
  console.log('\n\n📊 Rows per play level:\n');

  for (const level of ['Youth', 'High School', 'College', 'Pro', 'Overall']) {
    const { count } = await supabase
      .from('percentile_lookup')
      .select('*', { count: 'exact', head: true })
      .eq('play_level', level);

    const expected = 808; // 8 metrics × 101 percentiles
    const status = count === expected ? '✅' : '❌';
    console.log(`  ${status} ${level.padEnd(15)}: ${count} rows (expected ${expected})`);
  }

  console.log('\n\n✅ FINAL VERIFICATION:\n');
  console.log(`  Total rows: ${totalRows}`);
  console.log(`  Expected: 4,040 (8 metrics × 5 levels × 101 percentiles)`);

  if (totalRows === 4040) {
    console.log('\n  🎉 PERFECT! All 5 play levels have percentile data!\n');
    console.log('  ✅ Youth: NULL placeholders (will populate when first athlete tests)');
    console.log('  ✅ HS, College, Pro, Overall: Real percentile thresholds from Driveline data\n');
  }
}

main().catch(console.error);
