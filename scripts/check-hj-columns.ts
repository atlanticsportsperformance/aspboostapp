/**
 * Check HJ test table columns to fix the mapping
 */

import { createClient } from '@supabase/supabase-js';

async function checkHJColumns() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking HJ test table columns...\n');

  // Get Colin's HJ test
  const { data: hjTest, error } = await supabase
    .from('hj_tests')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (hjTest) {
    console.log('📋 HJ Test Table Columns:');
    console.log('-'.repeat(60));

    const columns = Object.keys(hjTest);

    columns.forEach(col => {
      const value = hjTest[col];
      const type = value === null ? 'NULL' : typeof value;
      const valueStr = value === null ? '(null)' : value;
      console.log(`${col.padEnd(40)} ${type.padEnd(10)} ${valueStr}`);
    });

    console.log('\n📊 Total columns:', columns.length);

    // Look for columns with "mean" in the name
    const meanColumns = columns.filter(col => col.toLowerCase().includes('mean'));
    console.log('\n🔍 Columns with "mean":');
    meanColumns.forEach(col => {
      console.log(`   - ${col}: ${hjTest[col]}`);
    });

    // Look for columns with "hop" in the name
    const hopColumns = columns.filter(col => col.toLowerCase().includes('hop'));
    console.log('\n🔍 Columns with "hop":');
    hopColumns.forEach(col => {
      console.log(`   - ${col}: ${hjTest[col]}`);
    });

    // Look for columns with numeric values
    const numericColumns = columns.filter(col => typeof hjTest[col] === 'number');
    console.log('\n🔍 Numeric columns (likely metrics):');
    numericColumns.forEach(col => {
      console.log(`   - ${col}: ${hjTest[col]}`);
    });
  }
}

checkHJColumns().catch(console.error);
