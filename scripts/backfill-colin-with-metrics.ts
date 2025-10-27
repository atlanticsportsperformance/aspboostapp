/**
 * Backfill Colin Ma's contributions WITH THE 8 CORRECT METRIC VALUES
 * This script copies ONLY the metrics defined in percentile_metric_mappings:
 * - CMJ: peak_takeoff_power_trial_value, bodymass_relative_takeoff_power_trial_value
 * - SJ: sj_peak_takeoff_power_trial_value, sj_bodymass_relative_takeoff_power_trial_value
 * - HJ: hop_mean_rsi_trial_value
 * - PPU: ppu_peak_takeoff_force_trial_value
 * - IMTP: net_peak_vertical_force_trial_value, relative_strength_trial_value
 */

import { createClient } from '@supabase/supabase-js';

async function backfillColinWithMetrics() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔧 Backfilling Colin Ma WITH Metric Values...\n');

  // Find Colin Ma
  const { data: colin } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .ilike('first_name', '%colin%')
    .ilike('last_name', '%ma%')
    .single();

  if (!colin) {
    console.error('❌ Could not find Colin Ma');
    return;
  }

  console.log(`✅ Found: ${colin.first_name} ${colin.last_name}`);
  console.log(`   ID: ${colin.id}`);
  console.log(`   Play Level: ${colin.play_level}\n`);

  const athleteId = colin.id;
  const playLevel = colin.play_level;

  // Delete existing contributions and re-insert with full data
  console.log('🗑️  Deleting existing contributions to re-insert with metrics...\n');

  const { error: deleteError } = await supabase
    .from('athlete_percentile_contributions')
    .delete()
    .eq('athlete_id', athleteId);

  if (deleteError) {
    console.error('❌ Error deleting:', deleteError);
    return;
  }

  console.log('✅ Deleted old contributions\n');

  // CMJ Contribution
  console.log('📊 Processing CMJ...');
  const { data: cmjTest } = await supabase
    .from('cmj_tests')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('recorded_utc', { ascending: false })
    .limit(1)
    .single();

  if (cmjTest) {
    const { error: cmjError } = await supabase
      .from('athlete_percentile_contributions')
      .insert({
        athlete_id: athleteId,
        test_type: 'CMJ',
        playing_level: playLevel,
        test_id: cmjTest.test_id,
        test_date: cmjTest.recorded_utc,
        // CMJ metrics (from percentile_metric_mappings)
        peak_takeoff_power_trial_value: cmjTest.peak_takeoff_power_trial_value,
        bodymass_relative_takeoff_power_trial_value: cmjTest.bodymass_relative_takeoff_power_trial_value,
      });

    if (cmjError) {
      console.error('❌ CMJ Error:', cmjError.message);
    } else {
      console.log('✅ CMJ inserted with 2 metrics\n');
    }
  }

  // SJ Contribution
  console.log('📊 Processing SJ...');
  const { data: sjTest } = await supabase
    .from('sj_tests')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('recorded_utc', { ascending: false })
    .limit(1)
    .single();

  if (sjTest) {
    const { error: sjError } = await supabase
      .from('athlete_percentile_contributions')
      .insert({
        athlete_id: athleteId,
        test_type: 'SJ',
        playing_level: playLevel,
        test_id: sjTest.test_id,
        test_date: sjTest.recorded_utc,
        // SJ metrics (from percentile_metric_mappings)
        sj_peak_takeoff_power_trial_value: sjTest.peak_takeoff_power_trial_value,
        sj_bodymass_relative_takeoff_power_trial_value: sjTest.bodymass_relative_takeoff_power_trial_value,
      });

    if (sjError) {
      console.error('❌ SJ Error:', sjError.message);
    } else {
      console.log('✅ SJ inserted with 2 metrics\n');
    }
  }

  // HJ Contribution
  console.log('📊 Processing HJ...');
  const { data: hjTest } = await supabase
    .from('hj_tests')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('recorded_utc', { ascending: false })
    .limit(1)
    .single();

  if (hjTest) {
    const { error: hjError } = await supabase
      .from('athlete_percentile_contributions')
      .insert({
        athlete_id: athleteId,
        test_type: 'HJ',
        playing_level: playLevel,
        test_id: hjTest.test_id,
        test_date: hjTest.recorded_utc,
        // HJ metrics (from percentile_metric_mappings)
        hop_mean_rsi_trial_value: hjTest.hop_mean_rsi_trial_value,
      });

    if (hjError) {
      console.error('❌ HJ Error:', hjError.message);
    } else {
      console.log('✅ HJ inserted with 1 metric\n');
    }
  }

  // PPU Contribution
  console.log('📊 Processing PPU...');
  const { data: ppuTest } = await supabase
    .from('ppu_tests')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('recorded_utc', { ascending: false })
    .limit(1)
    .single();

  if (ppuTest) {
    const { error: ppuError } = await supabase
      .from('athlete_percentile_contributions')
      .insert({
        athlete_id: athleteId,
        test_type: 'PPU',
        playing_level: playLevel,
        test_id: ppuTest.test_id,
        test_date: ppuTest.recorded_utc,
        // PPU metrics (from percentile_metric_mappings)
        ppu_peak_takeoff_force_trial_value: ppuTest.peak_takeoff_force_trial_value,
      });

    if (ppuError) {
      console.error('❌ PPU Error:', ppuError.message);
    } else {
      console.log('✅ PPU inserted with 1 metric\n');
    }
  }

  // IMTP Contribution
  console.log('📊 Processing IMTP...');
  const { data: imtpTest } = await supabase
    .from('imtp_tests')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('recorded_utc', { ascending: false })
    .limit(1)
    .single();

  if (imtpTest) {
    const { error: imtpError } = await supabase
      .from('athlete_percentile_contributions')
      .insert({
        athlete_id: athleteId,
        test_type: 'IMTP',
        playing_level: playLevel,
        test_id: imtpTest.test_id,
        test_date: imtpTest.recorded_utc,
        // IMTP metrics (from percentile_metric_mappings)
        net_peak_vertical_force_trial_value: imtpTest.net_peak_vertical_force_trial_value,
        relative_strength_trial_value: imtpTest.relative_strength_trial_value,
      });

    if (imtpError) {
      console.error('❌ IMTP Error:', imtpError.message);
    } else {
      console.log('✅ IMTP inserted with 2 metrics\n');
    }
  }

  // Verify
  console.log('🔍 Verifying contributions with metrics...\n');

  const { data: finalContributions } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('athlete_id', athleteId);

  if (finalContributions) {
    console.log(`✅ Total Contributions: ${finalContributions.length}/5\n`);

    finalContributions.forEach(contrib => {
      const nonNullMetrics = Object.keys(contrib).filter(
        key => !['id', 'athlete_id', 'test_type', 'playing_level', 'test_id', 'test_date', 'contributed_at'].includes(key) && contrib[key] !== null
      );

      console.log(`${contrib.test_type}:`);
      console.log(`   Non-null metrics: ${nonNullMetrics.length}`);
      console.log(`   Sample values:`);
      nonNullMetrics.slice(0, 3).forEach(key => {
        console.log(`      ${key}: ${contrib[key]}`);
      });
      console.log('');
    });
  }

  console.log('🎉 Backfill complete with metric values!');
}

backfillColinWithMetrics().catch(console.error);
