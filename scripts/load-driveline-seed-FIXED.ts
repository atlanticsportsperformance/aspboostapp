/**
 * Load Driveline HP-OBP seed data into driveline_seed_data table
 * FIXED VERSION: Loads athlete RECORDS (not individual metrics)
 * Uses VALD column names for easy percentile calculations
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Driveline CSV column → VALD column name mapping
const COLUMN_MAPPING: Record<string, string> = {
  // Metadata (keep original names)
  'test_date': 'test_date',
  'athlete_name': 'athlete_name',
  'playing_level': 'playing_level',
  'body_weight_lbs': 'body_weight_lbs',
  'athlete_uid': 'athlete_uid',
  'bat_speed_mph_group': 'bat_speed_mph_group',
  'pitch_speed_mph_group': 'pitch_speed_mph_group',
  't_spine_rom_r': 't_spine_rom_r',
  't_spine_rom_l': 't_spine_rom_l',
  'shoulder_er_l': 'shoulder_er_l',
  'shoulder_er_r': 'shoulder_er_r',
  'shoulder_ir_l': 'shoulder_ir_l',
  'shoulder_ir_r': 'shoulder_ir_r',
  'pitching_session_date': 'pitching_session_date',
  'pitch_speed_mph': 'pitch_speed_mph',
  'pitching_max_hss': 'pitching_max_hss',
  'hitting_session_date': 'hitting_session_date',
  'bat_speed_mph': 'bat_speed_mph',
  'hitting_max_hss': 'hitting_max_hss',

  // CMJ Metrics → VALD names
  'jump_height_cmj': 'jump_height_trial_value',
  'cmj_stiffness': 'stiffness_trial_value',
  'peak_takeoff_power_cmj': 'peak_takeoff_power_trial_value',
  'peak_power_per_bw_cmj': 'bodymass_relative_takeoff_power_trial_value',
  'eccentric_braking_rfd_cmj': 'eccentric_braking_rfd_trial_value',
  'eccentric_duration_cmj': 'eccentric_duration_trial_value',
  'concentric_duration_cmj': 'concentric_duration_trial_value',
  'rsi_modified_cmj': 'rsi_modified_trial_value',
  'countermovement_depth_cmj': 'countermovement_depth_trial_value',
  'concentric_peak_force_cmj': 'concentric_peak_force_trial_value',
  'eccentric_peak_force_cmj': 'eccentric_peak_force_trial_value',
  'min_eccentric_force_cmj': 'eccentric_minimum_force_trial_value',

  // CMJ Asymmetry → VALD names
  'cmj_stiffness_asymmetry': 'stiffness_asymm_value',
  'eccentric_decel_impulse_asymmetry': 'eccentric_deceleration_impulse_asymm_value',
  'p1_concentric_impulse_asymmetry_cmj': 'contraction_impulse_asymm_value_cmj',
  'p2_concentric_impulse_asymmetry_cmj': 'concentric_impulse_asymm_value_cmj',

  // SJ Metrics → VALD names (prefixed with sj_ to avoid conflicts)
  'jump_height_sj': 'sj_jump_height_trial_value',
  'peak_takeoff_power_sj': 'sj_peak_takeoff_power_trial_value',
  'peak_power_per_bw_sj': 'sj_bodymass_relative_takeoff_power_trial_value',
  'p1_concentric_impulse_asymmetry_sj': 'sj_contraction_impulse_asymm_value',
  'p2_concentric_impulse_asymmetry_sj': 'sj_concentric_impulse_asymm_value',

  // IMTP Metrics → VALD names
  'peak_vertical_force_imtp': 'peak_vertical_force_trial_value',
  'net_peak_vertical_force_imtp': 'net_peak_vertical_force_trial_value',
  'relative_strength': 'relative_strength_trial_value',
  'force_at_100ms_imtp': 'force_at_100_trial_value',
  'force_at_150ms_imtp': 'force_at_150_trial_value',
  'force_at_200ms_imtp': 'force_at_200_trial_value',

  // HJ (Hop Test) Metrics → VALD names
  'best_active_stiffness_ht': 'hop_mean_stiffness_trial_value',
  'best_jump_height_ht': 'hop_mean_jump_height_trial_value',
  'best_rsi_flight_contact_ht': 'hop_mean_rsi_trial_value',
  'best_rsi_jump_height_contact_ht': 'hop_mean_contact_time_trial_value',

  // PPU (Prone Push-Up) Metrics → VALD names (prefixed with ppu_)
  'peak_takeoff_force_pp': 'ppu_peak_takeoff_force_trial_value',
  'peak_eccentric_force_pp': 'ppu_peak_eccentric_force_trial_value',
  'peak_takeoff_force_asymmetry_pp': 'ppu_peak_takeoff_force_asymm_value',
  'peak_eccentric_force_asymmetry_pp': 'ppu_peak_eccentric_force_asymm_value',
};

function normalizePlayLevel(level: string): string {
  const normalized = level.trim();
  if (normalized === 'High School' || normalized === 'HS') return 'High School';
  if (normalized === 'College') return 'College';
  if (normalized === 'Pro' || normalized === 'Professional') return 'Pro';
  if (normalized === 'Youth') return 'Youth';
  return normalized; // Return as-is if unknown
}

async function main() {
  console.log('🏀 Loading Driveline HP-OBP Seed Data (FIXED VERSION)\n');

  // Read CSV
  const csvPath = path.resolve(process.cwd(), 'DrivelineSeed.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('❌ DrivelineSeed.csv not found!');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`✅ Loaded ${records.length} rows from DrivelineSeed.csv\n`);

  // Clear existing data
  console.log('🗑️  Clearing existing seed data...');
  const { error: deleteError } = await supabase
    .from('driveline_seed_data')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('❌ Error clearing seed data:', deleteError);
    process.exit(1);
  }
  console.log('✅ Cleared existing seed data\n');

  // Transform and insert athlete records
  console.log('📊 Processing and inserting athlete records...\n');

  const athleteRecords = [];
  let skippedCount = 0;

  for (const csvRow of records) {
    const playLevel = normalizePlayLevel(csvRow.playing_level || '');

    if (!playLevel || !['Youth', 'High School', 'College', 'Pro'].includes(playLevel)) {
      skippedCount++;
      continue;
    }

    // Transform CSV row to VALD column names
    const athleteRecord: Record<string, any> = {
      playing_level: playLevel,
    };

    for (const [csvColumn, valdColumn] of Object.entries(COLUMN_MAPPING)) {
      const value = csvRow[csvColumn];

      if (value === undefined || value === null || value === '') {
        continue; // Skip empty values
      }

      // Parse numbers for metric columns
      if (csvColumn !== 'test_date' && csvColumn !== 'athlete_name' &&
          csvColumn !== 'athlete_uid' && csvColumn !== 'playing_level' &&
          csvColumn !== 'bat_speed_mph_group' && csvColumn !== 'pitch_speed_mph_group' &&
          csvColumn !== 'pitching_session_date' && csvColumn !== 'hitting_session_date') {
        const numValue = parseFloat(value);
        if (Number.isFinite(numValue)) {
          athleteRecord[valdColumn] = numValue;
        }
      } else {
        athleteRecord[valdColumn] = value;
      }
    }

    athleteRecords.push(athleteRecord);
  }

  console.log(`  Total records to insert: ${athleteRecords.length}`);
  console.log(`  Skipped records (missing play level): ${skippedCount}\n`);

  // Batch insert (500 at a time)
  const BATCH_SIZE = 500;
  let insertedCount = 0;

  for (let i = 0; i < athleteRecords.length; i += BATCH_SIZE) {
    const batch = athleteRecords.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('driveline_seed_data')
      .insert(batch);

    if (error) {
      console.error('❌ Error inserting batch:', error);
      console.error('Failed batch starting at index:', i);
      process.exit(1);
    }

    insertedCount += batch.length;
    console.log(`  Inserted ${insertedCount} athlete records...`);
  }

  console.log(`\n✅ Successfully loaded ${insertedCount} athlete records!`);

  // Show summary by play level
  console.log('\n📊 Summary by Play Level:\n');

  const { data: summary } = await supabase
    .from('driveline_seed_data')
    .select('playing_level');

  if (summary) {
    const counts: Record<string, number> = {};
    summary.forEach(row => {
      counts[row.playing_level] = (counts[row.playing_level] || 0) + 1;
    });

    Object.entries(counts).forEach(([level, count]) => {
      console.log(`  ${level}: ${count} athletes`);
    });
  }

  console.log('\n🎉 Seed data loading complete!\n');
  console.log('📝 Next steps:');
  console.log('  1. Athletes take ForceDecks tests');
  console.log('  2. Tests synced to VALD test tables (cmj_tests, sj_tests, etc.)');
  console.log('  3. On 2nd test at each play level → auto-add to athlete_percentile_contributions');
  console.log('  4. Percentile calculations combine driveline_seed_data + contributions');
  console.log('  5. Percentiles evolve and improve as more athletes contribute!\n');
}

main().catch(console.error);
