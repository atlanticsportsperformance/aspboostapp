/**
 * Check Scott's play level in database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkScottPlayLevel() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('\n=== Checking Scott\'s Play Level ===\n');

  // Get all columns for Scott
  const { data: athlete, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('id', 'e080c1dd-5b2d-47d4-a0cf-8d2e4e5bc8c8')
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  if (athlete) {
    console.log('Scott\'s athlete record:');
    console.log(`  ID: ${athlete.id}`);
    console.log(`  Name: ${athlete.first_name} ${athlete.last_name}`);
    console.log(`  play_level: "${athlete.play_level}" (${athlete.play_level === null ? 'NULL' : typeof athlete.play_level})`);
    console.log(`  playing_level: "${athlete.playing_level}" (${athlete.playing_level === null ? 'NULL' : typeof athlete.playing_level})`);
    console.log('\n  All columns:', Object.keys(athlete).join(', '));
  }

  // Check if there's a playing_level vs play_level naming issue
  console.log('\n=== Checking All Athletes\' Play Levels ===\n');

  const { data: allAthletes } = await supabase
    .from('athletes')
    .select('first_name, last_name, play_level, playing_level')
    .limit(10);

  if (allAthletes) {
    console.log('Sample athletes:');
    allAthletes.forEach((a: any) => {
      console.log(`  ${a.first_name} ${a.last_name}: play_level="${a.play_level}", playing_level="${a.playing_level}"`);
    });
  }
}

checkScottPlayLevel()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
