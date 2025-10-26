/**
 * Find the exact VALD column names for CMJ peak power metrics
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Finding CMJ Peak Power Column Names\n');

  // Get a sample row from driveline_seed_data
  const { data } = await supabase
    .from('driveline_seed_data')
    .select('*')
    .limit(1)
    .single();

  if (!data) {
    console.log('❌ No data found');
    return;
  }

  // Find all CMJ-related columns with "power" in the name
  const allColumns = Object.keys(data);
  const cmjPowerColumns = allColumns.filter(col =>
    (col.includes('power') || col.includes('Power')) &&
    !col.includes('sj_') &&
    !col.includes('ppu_') &&
    !col.includes('imtp_') &&
    !col.includes('hop_')
  );

  console.log('CMJ Power-Related Columns:\n');
  cmjPowerColumns.forEach(col => {
    const value = data[col];
    console.log(`  ${col.padEnd(55)} = ${value}`);
  });

  console.log('\n\nLikely Matches:\n');

  // Look for the specific ones
  const peakPower = cmjPowerColumns.find(c =>
    c.includes('peak_takeoff_power') || c.includes('peak_power')
  );
  const peakPowerBM = cmjPowerColumns.find(c =>
    c.includes('bodymass_relative') || c.includes('power') && c.includes('bm')
  );

  if (peakPower) {
    console.log(`  ✅ CMJ Peak Power: ${peakPower}`);
  }
  if (peakPowerBM) {
    console.log(`  ✅ CMJ Peak Power/BM: ${peakPowerBM}`);
  }

  console.log('\n');
}

main().catch(console.error);
