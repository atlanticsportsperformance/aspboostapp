/**
 * Check what columns athlete_percentile_contributions has
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Checking athlete_percentile_contributions table schema\n');

  // Try to get a sample row to see columns
  const { data, error } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('Table is empty, inserting test row to check schema...\n');

    // Insert a dummy row to check schema
    const { data: testData, error: insertError } = await supabase
      .from('athlete_percentile_contributions')
      .insert({
        athlete_id: '00000000-0000-0000-0000-000000000000',
        test_type: 'CMJ',
        playing_level: 'College',
        test_id: 'test-123',
        test_date: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.log('Insert failed (expected), checking what columns were attempted...\n');
      console.log('Available columns based on insert error:');
      console.log(insertError.message);
    } else if (testData) {
      console.log('✅ Table columns:\n');
      Object.keys(testData).forEach(col => {
        console.log(`  - ${col}`);
      });

      // Clean up test row
      await supabase
        .from('athlete_percentile_contributions')
        .delete()
        .eq('athlete_id', '00000000-0000-0000-0000-000000000000');
    }
  } else {
    console.log('✅ Table columns:\n');
    Object.keys(data[0]).forEach(col => {
      console.log(`  - ${col}`);
    });
  }

  // Count columns with "trial_value" or "asymm_value" (VALD metric columns)
  const { data: sampleForCount } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .limit(1);

  if (sampleForCount && sampleForCount.length > 0) {
    const metricColumns = Object.keys(sampleForCount[0]).filter(col =>
      col.includes('trial_value') || col.includes('asymm_value')
    );

    console.log(`\n📊 Found ${metricColumns.length} VALD metric columns`);
    console.log(`\nSample metric columns:`);
    metricColumns.slice(0, 10).forEach(col => console.log(`  - ${col}`));
    if (metricColumns.length > 10) {
      console.log(`  ... and ${metricColumns.length - 10} more`);
    }
  }
}

main().catch(console.error);
