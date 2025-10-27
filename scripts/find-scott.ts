/**
 * Find Scott in the database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function findScott() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('\n=== Finding Scott ===\n');

  // Search for athletes named Scott
  const { data: athletes, error } = await supabase
    .from('athletes')
    .select('*')
    .ilike('first_name', '%scott%');

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  if (!athletes || athletes.length === 0) {
    console.log('❌ No athletes named Scott found');
  } else {
    console.log(`Found ${athletes.length} athlete(s) named Scott:\n`);
    athletes.forEach((a: any) => {
      console.log(`  Name: ${a.first_name} ${a.last_name}`);
      console.log(`  ID: ${a.id}`);
      console.log(`  play_level: "${a.play_level}"`);
      console.log(`  playing_level: "${a.playing_level}"`);
      console.log(`  vald_email: "${a.vald_email}"`);
      console.log('');
    });
  }

  // Also check all athletes and their play levels
  console.log('=== All Athletes ===\n');
  const { data: allAthletes } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level, playing_level')
    .order('created_at', { ascending: false })
    .limit(20);

  if (allAthletes) {
    allAthletes.forEach((a: any) => {
      console.log(`${a.first_name} ${a.last_name}: play_level="${a.play_level}", playing_level="${a.playing_level}"`);
    });
  }
}

findScott()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
