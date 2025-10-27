/**
 * Check the schema of athlete_percentile_contributions table
 */

import { createClient } from '@supabase/supabase-js';

async function checkContributionsSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking athlete_percentile_contributions schema...\n');

  // Get Colin's contributions to see what columns exist
  const { data: contributions, error } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (contributions && contributions.length > 0) {
    console.log('📋 Columns in athlete_percentile_contributions:');
    console.log('-'.repeat(60));

    const contrib = contributions[0];
    const columns = Object.keys(contrib);

    columns.forEach(col => {
      const value = contrib[col];
      const type = value === null ? 'NULL' : typeof value;
      console.log(`${col.padEnd(50)} ${type.padEnd(10)} ${value === null ? '(null)' : ''}`);
    });

    console.log('\n📊 Total columns:', columns.length);

    // Count null vs non-null
    const nullCount = columns.filter(col => contrib[col] === null).length;
    const nonNullCount = columns.length - nullCount;

    console.log(`   Non-null: ${nonNullCount}`);
    console.log(`   Null: ${nullCount}`);

    if (nullCount > 10) {
      console.log('\n⚠️  WARNING: Most columns are NULL!');
      console.log('   This means the backfill script is not populating metric values.');
      console.log('   We need to update the backfill script to copy metrics from test tables.');
    }
  } else {
    console.log('❌ No contributions found');
  }
}

checkContributionsSchema().catch(console.error);
