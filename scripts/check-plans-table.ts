/**
 * Check if plans table exists and has created_by column
 */

import { createClient } from '@supabase/supabase-js';

async function checkPlansTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking plans table...\n');

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .limit(1);

  if (error) {
    console.log('❌ plans table does not exist or no access:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('✅ plans table exists but is empty');
    console.log('   Need to check column structure with a row');
    return;
  }

  console.log('✅ plans table exists\n');
  console.log('📋 Columns:\n');
  Object.keys(data[0]).forEach(key => {
    console.log(`   - ${key}`);
  });

  if ('created_by' in data[0]) {
    console.log('\n✅ created_by column EXISTS');
  } else {
    console.log('\n❌ created_by column MISSING - need to add it');
  }
}

checkPlansTable().catch(console.error);
