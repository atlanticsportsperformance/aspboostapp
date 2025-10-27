/**
 * Check which Driveline composite metrics Scott's tests have
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCOTT_ID = 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f';

// The 8 metrics available in percentile_lookup
const DRIVELINE_METRICS = [
  'bodymass_relative_takeoff_power_trial_value',  // CMJ (fallback)
  'sj_bodymass_relative_takeoff_power_trial_value', // SJ
  'sj_peak_takeoff_power_trial_value', // SJ
  'hop_mean_rsi_trial_value', // HJ
  'ppu_peak_takeoff_force_trial_value', // PPU
  'net_peak_vertical_force_trial_value', // IMTP
  'relative_strength_trial_value', // IMTP
  'peak_takeoff_power_trial_value', // Another power metric
];

async function main() {
  console.log('🔍 Checking Scott\'s Available Metrics\n');

  // CMJ Tests
  console.log('📊 CMJ Tests:');
  const { data: cmjTests } = await supabase
    .from('cmj_tests')
    .select('*')
    .eq('athlete_id', SCOTT_ID)
    .order('recorded_utc', { ascending: false })
    .limit(1);

  if (cmjTests && cmjTests.length > 0) {
    const test = cmjTests[0];
    console.log(`  Test date: ${new Date(test.recorded_utc).toLocaleDateString()}`);
    console.log(`  Available metrics:`);

    // Check which columns have values
    const metrics = Object.keys(test).filter(key =>
      key.includes('trial_value') && test[key] !== null
    );

    metrics.forEach(m => {
      const isDriveline = DRIVELINE_METRICS.some(dm => dm.includes(m));
      const marker = isDriveline ? '✓' : ' ';
      console.log(`    ${marker} ${m}: ${test[m]}`);
    });
  } else {
    console.log('  No CMJ tests');
  }

  // HJ Tests
  console.log('\n📊 HJ Tests:');
  const { data: hjTests } = await supabase
    .from('hj_tests')
    .select('*')
    .eq('athlete_id', SCOTT_ID)
    .order('recorded_utc', { ascending: false })
    .limit(1);

  if (hjTests && hjTests.length > 0) {
    const test = hjTests[0];
    console.log(`  Test date: ${new Date(test.recorded_utc).toLocaleDateString()}`);
    console.log(`  Available metrics:`);

    const metrics = Object.keys(test).filter(key =>
      key.includes('trial_value') && test[key] !== null
    );

    metrics.forEach(m => {
      const isDriveline = DRIVELINE_METRICS.some(dm => dm.includes(m)) || m.includes('rsi');
      const marker = isDriveline ? '✓' : ' ';
      console.log(`    ${marker} ${m}: ${test[m]}`);
    });
  } else {
    console.log('  No HJ tests');
  }

  // PPU Tests
  console.log('\n📊 PPU Tests:');
  const { data: ppuTests } = await supabase
    .from('ppu_tests')
    .select('*')
    .eq('athlete_id', SCOTT_ID)
    .order('recorded_utc', { ascending: false })
    .limit(1);

  if (ppuTests && ppuTests.length > 0) {
    const test = ppuTests[0];
    console.log(`  Test date: ${new Date(test.recorded_utc).toLocaleDateString()}`);
    console.log(`  Available metrics:`);

    const metrics = Object.keys(test).filter(key =>
      key.includes('trial_value') && test[key] !== null
    );

    metrics.forEach(m => {
      const isDriveline = DRIVELINE_METRICS.some(dm => dm.includes(m)) || m.includes('push_force');
      const marker = isDriveline ? '✓' : ' ';
      console.log(`    ${marker} ${m}: ${test[m]}`);
    });
  } else {
    console.log('  No PPU tests');
  }

  // IMTP Tests
  console.log('\n📊 IMTP Tests:');
  const { data: imtpTests } = await supabase
    .from('imtp_tests')
    .select('*')
    .eq('athlete_id', SCOTT_ID)
    .order('recorded_utc', { ascending: false })
    .limit(1);

  if (imtpTests && imtpTests.length > 0) {
    const test = imtpTests[0];
    console.log(`  Test date: ${new Date(test.recorded_utc).toLocaleDateString()}`);
    console.log(`  Available metrics:`);

    const metrics = Object.keys(test).filter(key =>
      key.includes('trial_value') && test[key] !== null
    );

    metrics.forEach(m => {
      const isDriveline = DRIVELINE_METRICS.some(dm => dm.includes(m)) || m.includes('peak_force');
      const marker = isDriveline ? '✓' : ' ';
      console.log(`    ${marker} ${m}: ${test[m]}`);
    });
  } else {
    console.log('  No IMTP tests');
  }

  console.log('\n✅ Done!\n');
  console.log('Legend: ✓ = Metric has percentiles in Driveline database\n');
}

main().catch(console.error);
