/**
 * Load Driveline HP-OBP seed data into Supabase percentile_pool table
 *
 * Reads DrivelineSeed.csv which contains:
 * - Individual athlete test results (~1935 rows)
 * - Playing level (Youth, High School, College, Pro)
 * - All VALD metrics (CMJ, SJ, HJ/HT, PPU/PP, IMTP)
 *
 * This seed data forms the baseline for percentile calculations.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CSV column name → standardized metric mapping
const METRIC_MAPPINGS: Array<{
  csvColumn: string;
  testType: string;
  metricName: string;
}> = [
  // CMJ Metrics
  { csvColumn: 'jump_height_cmj', testType: 'CMJ', metricName: 'jump_height' },
  { csvColumn: 'cmj_stiffness', testType: 'CMJ', metricName: 'stiffness' },
  { csvColumn: 'peak_takeoff_power_cmj', testType: 'CMJ', metricName: 'peak_power' },
  { csvColumn: 'peak_power_per_bw_cmj', testType: 'CMJ', metricName: 'peak_power_bm' },
  { csvColumn: 'eccentric_braking_rfd_cmj', testType: 'CMJ', metricName: 'ecc_braking_rfd' },
  { csvColumn: 'eccentric_duration_cmj', testType: 'CMJ', metricName: 'ecc_duration' },
  { csvColumn: 'concentric_duration_cmj', testType: 'CMJ', metricName: 'con_duration' },
  { csvColumn: 'rsi_modified_cmj', testType: 'CMJ', metricName: 'rsi_modified' },
  { csvColumn: 'countermovement_depth_cmj', testType: 'CMJ', metricName: 'cm_depth' },
  { csvColumn: 'cmj_stiffness_asymmetry', testType: 'CMJ', metricName: 'stiffness_asym' },
  { csvColumn: 'eccentric_decel_impulse_asymmetry', testType: 'CMJ', metricName: 'ecc_decel_asym' },
  { csvColumn: 'p1_concentric_impulse_asymmetry_cmj', testType: 'CMJ', metricName: 'p1_con_asym' },
  { csvColumn: 'p2_concentric_impulse_asymmetry_cmj', testType: 'CMJ', metricName: 'p2_con_asym' },
  { csvColumn: 'concentric_peak_force_cmj', testType: 'CMJ', metricName: 'con_peak_force' },
  { csvColumn: 'eccentric_peak_force_cmj', testType: 'CMJ', metricName: 'ecc_peak_force' },
  { csvColumn: 'min_eccentric_force_cmj', testType: 'CMJ', metricName: 'min_ecc_force' },

  // SJ Metrics
  { csvColumn: 'jump_height_sj', testType: 'SJ', metricName: 'jump_height' },
  { csvColumn: 'peak_takeoff_power_sj', testType: 'SJ', metricName: 'peak_power' },
  { csvColumn: 'peak_power_per_bw_sj', testType: 'SJ', metricName: 'peak_power_bm' },
  { csvColumn: 'p1_concentric_impulse_asymmetry_sj', testType: 'SJ', metricName: 'p1_con_asym' },
  { csvColumn: 'p2_concentric_impulse_asymmetry_sj', testType: 'SJ', metricName: 'p2_con_asym' },

  // IMTP Metrics
  { csvColumn: 'peak_vertical_force_imtp', testType: 'IMTP', metricName: 'peak_force' },
  { csvColumn: 'net_peak_vertical_force_imtp', testType: 'IMTP', metricName: 'net_peak_force' },
  { csvColumn: 'force_at_100ms_imtp', testType: 'IMTP', metricName: 'force_100ms' },
  { csvColumn: 'force_at_150ms_imtp', testType: 'IMTP', metricName: 'force_150ms' },
  { csvColumn: 'force_at_200ms_imtp', testType: 'IMTP', metricName: 'force_200ms' },
  { csvColumn: 'relative_strength', testType: 'IMTP', metricName: 'relative_strength' },

  // HJ/HT (Hop Test) Metrics
  { csvColumn: 'best_active_stiffness_ht', testType: 'HJ', metricName: 'active_stiffness' },
  { csvColumn: 'best_jump_height_ht', testType: 'HJ', metricName: 'jump_height' },
  { csvColumn: 'best_rsi_flight_contact_ht', testType: 'HJ', metricName: 'rsi' },
  { csvColumn: 'best_rsi_jump_height_contact_ht', testType: 'HJ', metricName: 'rsi_jump_height' },

  // PPU/PP (Prone Push-Up) Metrics
  { csvColumn: 'peak_takeoff_force_pp', testType: 'PPU', metricName: 'peak_force' },
  { csvColumn: 'peak_eccentric_force_pp', testType: 'PPU', metricName: 'peak_ecc_force' },
  { csvColumn: 'peak_takeoff_force_asymmetry_pp', testType: 'PPU', metricName: 'peak_force_asym' },
  { csvColumn: 'peak_eccentric_force_asymmetry_pp', testType: 'PPU', metricName: 'peak_ecc_asym' },
];

function normalizePlayLevel(level: string): string {
  const normalized = level.trim();
  // Map variations to standard names
  if (normalized === 'HS' || normalized === 'High School') return 'High School';
  if (normalized === 'Youth') return 'Youth';
  if (normalized === 'College') return 'College';
  if (normalized === 'Pro' || normalized === 'Professional') return 'Pro';
  return normalized;
}

async function main() {
  console.log('🏀 Loading Driveline HP-OBP Seed Data into Supabase\n');

  // Load CSV
  const csvPath = path.resolve(process.cwd(), 'DrivelineSeed.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    console.error('Place DrivelineSeed.csv in the project root');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`✅ Loaded ${records.length} rows from DrivelineSeed.csv\n`);

  // Clear existing seed data
  console.log('🗑️  Clearing existing Driveline seed data...');
  const { error: deleteError } = await supabase
    .from('percentile_pool')
    .delete()
    .eq('source', 'driveline_seed');

  if (deleteError) {
    console.error('❌ Error clearing seed data:', deleteError);
    process.exit(1);
  }
  console.log('✅ Cleared existing seed data\n');

  // Process CSV and insert into percentile_pool
  console.log('📊 Processing and inserting data...\n');

  let totalInserted = 0;
  let skipped = 0;
  const batchSize = 500;
  let batch: any[] = [];

  for (const record of records) {
    const playLevel = normalizePlayLevel(record.playing_level || '');
    if (!playLevel) {
      skipped++;
      continue;
    }

    // Extract each metric and add to pool
    for (const mapping of METRIC_MAPPINGS) {
      const value = parseFloat(record[mapping.csvColumn]);

      // Skip null/NaN/empty values
      if (!Number.isFinite(value)) continue;

      batch.push({
        test_type: mapping.testType,
        metric_name: mapping.metricName,
        value: value,
        play_level: playLevel,
        source: 'driveline_seed',
      });

      // Insert batch when full
      if (batch.length >= batchSize) {
        const { error } = await supabase.from('percentile_pool').insert(batch);
        if (error) {
          console.error(`❌ Error inserting batch:`, error);
          process.exit(1);
        }
        totalInserted += batch.length;
        console.log(`  Inserted ${totalInserted} data points...`);
        batch = [];
      }
    }
  }

  // Insert remaining batch
  if (batch.length > 0) {
    const { error } = await supabase.from('percentile_pool').insert(batch);
    if (error) {
      console.error(`❌ Error inserting final batch:`, error);
      process.exit(1);
    }
    totalInserted += batch.length;
  }

  console.log(`\n✅ Successfully loaded ${totalInserted} data points`);
  console.log(`⏭️  Skipped ${skipped} rows with missing play level\n`);

  // Show summary by test type and play level
  console.log('📊 Summary by Test Type and Play Level:\n');

  const { data: summary } = await supabase
    .from('percentile_pool')
    .select('test_type, play_level, metric_name')
    .eq('source', 'driveline_seed');

  if (summary) {
    const stats: Record<string, Record<string, Set<string>>> = {};

    summary.forEach((row: any) => {
      if (!stats[row.test_type]) stats[row.test_type] = {};
      if (!stats[row.test_type][row.play_level]) {
        stats[row.test_type][row.play_level] = new Set();
      }
      stats[row.test_type][row.play_level].add(row.metric_name);
    });

    for (const [testType, levels] of Object.entries(stats)) {
      console.log(`  ${testType}:`);
      for (const [playLevel, metrics] of Object.entries(levels)) {
        const count = summary.filter(
          (r: any) => r.test_type === testType && r.play_level === playLevel
        ).length;
        console.log(`    ${playLevel}: ${count} data points (${metrics.size} metrics)`);
      }
    }
  }

  console.log('\n🎉 Seed data loading complete!');
  console.log('\n📝 Next steps:');
  console.log('  1. Run the percentile system migration');
  console.log('  2. Athletes take tests');
  console.log('  3. System tracks 1st vs 2nd test at each play level');
  console.log('  4. 2nd test automatically added to percentile_pool');
  console.log('  5. Percentiles become more accurate over time!');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
