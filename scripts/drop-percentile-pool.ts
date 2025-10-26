import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🗑️  Dropping percentile_pool table...\n');

  // Use raw SQL to drop the table
  const { error } = await supabase.rpc('exec_sql', {
    sql_string: 'DROP TABLE IF EXISTS percentile_pool CASCADE;'
  }).catch(() => ({ error: null }));

  if (error) {
    console.log('Note: Could not drop via RPC, please run this SQL manually:');
    console.log('\nDROP TABLE IF EXISTS percentile_pool CASCADE;\n');
  } else {
    console.log('✅ percentile_pool table dropped!\n');
  }

  // Verify it's gone
  const { error: checkError } = await supabase
    .from('percentile_pool')
    .select('*', { count: 'exact', head: true });

  if (checkError?.message?.includes('not find')) {
    console.log('✅ Verified: percentile_pool is gone\n');
  } else {
    console.log('⚠️  Table may still exist, please verify in Supabase Dashboard\n');
  }
}

main();
