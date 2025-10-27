/**
 * Test Scott's VALD test percentiles
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCOTT_ID = 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f';

async function main() {
  console.log('🔍 Testing Scott Blewett\'s VALD Test Percentiles\n');

  // Get Scott's play level
  const { data: scott } = await supabase
    .from('athletes')
    .select('first_name, last_name, play_level')
    .eq('id', SCOTT_ID)
    .single();

  if (!scott) {
    console.error('❌ Scott not found');
    return;
  }

  console.log(`Athlete: ${scott.first_name} ${scott.last_name}`);
  console.log(`Play Level: ${scott.play_level}\n`);

  if (!scott.play_level) {
    console.error('❌ Scott has no play level set!');
    return;
  }

  // Test CMJ
  console.log('📊 CMJ Tests:');
  const { data: cmjTests } = await supabase
    .from('cmj_tests')
    .select('test_id, recorded_utc, jump_height_trial_value')
    .eq('athlete_id', SCOTT_ID)
    .order('recorded_utc', { ascending: false });

  if (cmjTests && cmjTests.length > 0) {
    for (const test of cmjTests) {
      const value = test.jump_height_trial_value;
      if (value) {
        // Get percentile
        const { data: percentileData } = await supabase
          .from('percentile_lookup')
          .select('percentile')
          .eq('metric_column', 'jump_height_trial_value')
          .eq('play_level', scott.play_level)
          .lte('value', value)
          .order('value', { ascending: false })
          .limit(1);

        const percentile = percentileData && percentileData.length > 0
          ? percentileData[0].percentile
          : 0;

        console.log(`  ${new Date(test.recorded_utc).toLocaleDateString()}: ${value.toFixed(2)} cm = ${percentile}th percentile`);
      }
    }
  } else {
    console.log('  No CMJ tests found');
  }

  // Test SJ
  console.log('\n📊 SJ Tests:');
  const { data: sjTests } = await supabase
    .from('sj_tests')
    .select('test_id, recorded_utc, jump_height_trial_value')
    .eq('athlete_id', SCOTT_ID)
    .order('recorded_utc', { ascending: false });

  if (sjTests && sjTests.length > 0) {
    for (const test of sjTests) {
      const value = test.jump_height_trial_value;
      if (value) {
        const { data: percentileData } = await supabase
          .from('percentile_lookup')
          .select('percentile')
          .eq('metric_column', 'jump_height_trial_value')
          .eq('play_level', scott.play_level)
          .lte('value', value)
          .order('value', { ascending: false })
          .limit(1);

        const percentile = percentileData && percentileData.length > 0
          ? percentileData[0].percentile
          : 0;

        console.log(`  ${new Date(test.recorded_utc).toLocaleDateString()}: ${value.toFixed(2)} cm = ${percentile}th percentile`);
      }
    }
  } else {
    console.log('  No SJ tests found');
  }

  // Test HJ
  console.log('\n📊 HJ Tests:');
  const { data: hjTests } = await supabase
    .from('hj_tests')
    .select('test_id, recorded_utc, jump_height_trial_value')
    .eq('athlete_id', SCOTT_ID)
    .order('recorded_utc', { ascending: false });

  if (hjTests && hjTests.length > 0) {
    for (const test of hjTests) {
      const value = test.jump_height_trial_value;
      if (value) {
        const { data: percentileData } = await supabase
          .from('percentile_lookup')
          .select('percentile')
          .eq('metric_column', 'jump_height_trial_value')
          .eq('play_level', scott.play_level)
          .lte('value', value)
          .order('value', { ascending: false })
          .limit(1);

        const percentile = percentileData && percentileData.length > 0
          ? percentileData[0].percentile
          : 0;

        console.log(`  ${new Date(test.recorded_utc).toLocaleDateString()}: ${value.toFixed(2)} cm = ${percentile}th percentile`);
      }
    }
  } else {
    console.log('  No HJ tests found');
  }

  // Test PPU
  console.log('\n📊 PPU Tests:');
  const { data: ppuTests } = await supabase
    .from('ppu_tests')
    .select('test_id, recorded_utc, peak_push_force_trial_value')
    .eq('athlete_id', SCOTT_ID)
    .order('recorded_utc', { ascending: false });

  if (ppuTests && ppuTests.length > 0) {
    for (const test of ppuTests) {
      const value = test.peak_push_force_trial_value;
      if (value) {
        const { data: percentileData } = await supabase
          .from('percentile_lookup')
          .select('percentile')
          .eq('metric_column', 'peak_push_force_trial_value')
          .eq('play_level', scott.play_level)
          .lte('value', value)
          .order('value', { ascending: false })
          .limit(1);

        const percentile = percentileData && percentileData.length > 0
          ? percentileData[0].percentile
          : 0;

        console.log(`  ${new Date(test.recorded_utc).toLocaleDateString()}: ${value.toFixed(2)} N = ${percentile}th percentile`);
      }
    }
  } else {
    console.log('  No PPU tests found');
  }

  // Test IMTP
  console.log('\n📊 IMTP Tests:');
  const { data: imtpTests } = await supabase
    .from('imtp_tests')
    .select('test_id, recorded_utc, peak_force_trial_value')
    .eq('athlete_id', SCOTT_ID)
    .order('recorded_utc', { ascending: false });

  if (imtpTests && imtpTests.length > 0) {
    for (const test of imtpTests) {
      const value = test.peak_force_trial_value;
      if (value) {
        const { data: percentileData } = await supabase
          .from('percentile_lookup')
          .select('percentile')
          .eq('metric_column', 'peak_force_trial_value')
          .eq('play_level', scott.play_level)
          .lte('value', value)
          .order('value', { ascending: false })
          .limit(1);

        const percentile = percentileData && percentileData.length > 0
          ? percentileData[0].percentile
          : 0;

        console.log(`  ${new Date(test.recorded_utc).toLocaleDateString()}: ${value.toFixed(2)} N = ${percentile}th percentile`);
      }
    }
  } else {
    console.log('  No IMTP tests found');
  }

  console.log('\n✅ Done!\n');
}

main().catch(console.error);
