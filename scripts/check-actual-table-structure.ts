/**
 * Check the actual structure of athlete_percentile_history table
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStructure() {
  // Get all rows for Thomas Daly (High School)
  const { data: thomasRows, error: thomasError } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('athlete_id', 'e0b30952-e7ed-4959-b3bc-fbd29b2e7fa2')
    .order('test_date', { ascending: false });

  console.log('\n=== Thomas Daly (High School) - athlete_percentile_history rows ===');
  console.log(`Total rows: ${thomasRows?.length || 0}`);
  if (thomasRows && thomasRows.length > 0) {
    console.log('\nSample row structure:');
    console.log(JSON.stringify(thomasRows[0], null, 2));
    console.log('\nAll play_level values:');
    console.log(thomasRows.map(r => r.play_level));
  } else {
    console.log('No rows found');
  }

  // Get all rows for Scott Blewett (Pro)
  const { data: scottRows, error: scottError } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('athlete_id', 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f')
    .order('test_date', { ascending: false });

  console.log('\n\n=== Scott Blewett (Pro) - athlete_percentile_history rows ===');
  console.log(`Total rows: ${scottRows?.length || 0}`);
  if (scottRows && scottRows.length > 0) {
    console.log('\nAll play_level values:');
    console.log(scottRows.map(r => r.play_level));
    console.log('\nAll test_id values:');
    console.log(scottRows.map(r => r.test_id));
  }

  // Check if there's a play_level column at all
  console.log('\n\n=== Checking column existence ===');
  const sampleRow = thomasRows?.[0] || scottRows?.[0];
  if (sampleRow) {
    console.log('Columns in table:');
    console.log(Object.keys(sampleRow));
  }
}

checkStructure().catch(console.error);
