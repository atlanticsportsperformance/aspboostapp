/**
 * Apply the percentile threshold fix directly via Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔧 Applying Percentile Threshold Fix\n');

  // Read the migration file
  const sql = fs.readFileSync('supabase/migrations/STORE_PERCENTILE_THRESHOLDS_ONLY.sql', 'utf8');

  // Remove comments and split into statements
  const statements = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Executing ${statements.length} SQL statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];

    if (stmt.toLowerCase().startsWith('comment on')) {
      console.log(`${i + 1}. Skipping COMMENT statement...`);
      continue;
    }

    console.log(`${i + 1}. ${stmt.substring(0, 50)}...`);

    const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Success`);
    }
  }

  console.log('\n✅ Migration applied!\n');
  console.log('Now run: npx tsx scripts/populate-percentile-lookup-OPTIMIZED.ts\n');
}

main().catch(console.error);
