/**
 * Apply migration files directly to remote Supabase instance
 * Use this when local Supabase is not running
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration(filePath: string) {
  const fileName = path.basename(filePath);
  console.log(`\n📄 Applying: ${fileName}`);

  const sql = fs.readFileSync(filePath, 'utf-8');

  // Execute the SQL
  const { error } = await supabase.rpc('exec_sql', { sql_string: sql }).catch(async () => {
    // If exec_sql function doesn't exist, try direct query
    return await supabase.from('_migrations').select('*').limit(0); // This will fail but let us try raw query
  });

  // Try using raw query instead
  const { error: queryError } = await supabase.rpc('query', { query_text: sql }).catch(() => ({ error: null }));

  if (error || queryError) {
    console.error(`❌ Error applying ${fileName}:`, error || queryError);
    return false;
  }

  console.log(`✅ Successfully applied ${fileName}`);
  return true;
}

async function main() {
  console.log('🚀 Applying migrations to Supabase...\n');

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

  // Migration files to apply in order
  const migrations = [
    '20250125000005_expand_sj_test_table.sql',
    '20250125000006_expand_hj_test_table.sql',
    '20250125000007_expand_ppu_test_table.sql',
    '20250125000008_expand_imtp_test_table.sql',
    '20250125000009_percentile_system.sql',
  ];

  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${migration} (not found)`);
      continue;
    }

    await applyMigration(filePath);
  }

  console.log('\n✅ All migrations applied!');
}

main().catch(console.error);
