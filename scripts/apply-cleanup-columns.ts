/**
 * Apply column cleanup migration to Supabase
 * Removes 27 unused metric columns from athlete_percentile_contributions
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function applyCleanup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🧹 Cleaning up unused columns from athlete_percentile_contributions...\n');

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'cleanup-unused-contribution-columns.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('📄 SQL Migration:');
  console.log('   - Removing 27 unused metric columns');
  console.log('   - Keeping only 8 metrics from percentile_metric_mappings');
  console.log('   - Final schema: 15 columns (7 core + 8 metrics)\n');

  // Execute the SQL
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Trying direct execution...\n');

    // If rpc fails, try executing each ALTER statement separately
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('ALTER TABLE')) {
        console.log('Executing:', statement.substring(0, 60) + '...');
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (stmtError) {
          console.error('   ❌ Error:', stmtError.message);
        } else {
          console.log('   ✅ Success');
        }
      }
    }
  } else {
    console.log('✅ Migration completed successfully!\n');
  }

  // Verify the cleanup
  console.log('🔍 Verifying schema after cleanup...\n');

  const { data: testRow } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .limit(1)
    .single();

  if (testRow) {
    const columns = Object.keys(testRow);
    console.log(`✅ New column count: ${columns.length}`);
    console.log('\n📋 Remaining columns:');
    columns.forEach(col => console.log(`   - ${col}`));
  }

  console.log('\n🎉 Cleanup complete!');
}

applyCleanup().catch(console.error);
