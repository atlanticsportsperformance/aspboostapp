import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://kttxecobblqxfaojbjjh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dHhlY29iYmxxeGZhb2piampoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTU5MzUzNCwiZXhwIjoyMDUxMTY5NTM0fQ.k7jrCiEZX1mJXFM2Y83MdjEilGR82qBD1dJ5I1A2pXI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Reading migration file...');
  const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', 'create_exercise_logs.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log('Executing SQL migration...\n');

  // Split by semicolons but keep function definitions together
  const statements = sql
    .split(/;(?=\s*(?:CREATE|DROP|ALTER|INSERT|SELECT|COMMENT|--|\n\n))/gi)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s !== '');

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;

    console.log(`\n[${i + 1}/${statements.length}] Executing...`);
    console.log(statement.substring(0, 100) + '...\n');

    const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

    if (error) {
      console.error('❌ Error:', error.message);
      console.error('Failed statement:', statement.substring(0, 200));
      // Continue with other statements
    } else {
      console.log('✅ Success');
    }
  }

  console.log('\n✅ Migration complete!');
}

runMigration().catch(console.error);
