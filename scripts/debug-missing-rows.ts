/**
 * Debug why we only have 1,000 rows instead of 1,934
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Debugging Missing Rows\n');

  // Check database
  const { count: dbCount } = await supabase
    .from('driveline_seed_data')
    .select('*', { count: 'exact', head: true });

  console.log(`Database has: ${dbCount} rows\n`);

  // Check CSV
  const csvPath = path.resolve(process.cwd(), 'DrivelineSeed.csv');

  if (!fs.existsSync(csvPath)) {
    console.log('❌ DrivelineSeed.csv not found in project root!');
    console.log('Looking for:', csvPath);

    // Check if it's elsewhere
    const altPath = path.resolve(process.cwd(), 'atlantic_evan_app', 'DrivelineSeed.csv');
    if (fs.existsSync(altPath)) {
      console.log('✅ Found at:', altPath);
      console.log('\nYou need to copy it to project root:');
      console.log('copy atlantic_evan_app\\DrivelineSeed.csv DrivelineSeed.csv\n');
    }
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`CSV has: ${records.length} rows\n`);

  // Analyze playing_level values
  const levelCounts: Record<string, number> = {};
  const emptyLevels: number[] = [];

  records.forEach((row, i) => {
    const level = row.playing_level?.trim() || '';

    if (!level) {
      emptyLevels.push(i + 2); // +2 for header and 0-indexing
    } else {
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    }
  });

  console.log('Playing Level Distribution in CSV:\n');
  Object.entries(levelCounts).forEach(([level, count]) => {
    console.log(`  "${level}": ${count} rows`);
  });

  console.log(`\n  Empty/Missing playing_level: ${emptyLevels.length} rows`);

  if (emptyLevels.length > 0) {
    console.log(`\n  First 10 rows with empty playing_level: ${emptyLevels.slice(0, 10).join(', ')}`);
  }

  // Check for non-standard play levels
  const validLevels = ['Youth', 'High School', 'College', 'Pro', 'Professional', 'HS'];
  const invalidLevels: string[] = [];

  Object.keys(levelCounts).forEach(level => {
    if (!validLevels.includes(level)) {
      invalidLevels.push(level);
    }
  });

  if (invalidLevels.length > 0) {
    console.log('\n⚠️  Found non-standard playing_level values:');
    invalidLevels.forEach(level => {
      console.log(`  "${level}": ${levelCounts[level]} rows`);
    });
  }

  // Summary
  const expectedRows = records.length - emptyLevels.length;
  const missingRows = expectedRows - (dbCount || 0);

  console.log('\n📊 Summary:\n');
  console.log(`  CSV total rows: ${records.length}`);
  console.log(`  Rows with empty playing_level: ${emptyLevels.length}`);
  console.log(`  Expected loaded rows: ${expectedRows}`);
  console.log(`  Actual database rows: ${dbCount}`);
  console.log(`  Missing rows: ${missingRows}\n`);

  if (missingRows > 0) {
    console.log('❌ We are missing rows! Possible causes:');
    console.log('   1. Non-standard playing_level values that were skipped');
    console.log('   2. Database insert errors');
    console.log('   3. CSV parsing issues\n');
  } else if (missingRows === 0) {
    console.log('✅ All expected rows were loaded!\n');
  } else {
    console.log('⚠️  We have MORE rows in DB than expected?!\n');
  }
}

main().catch(console.error);
