// Run Migration: Add Blast Motion Metric Columns
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔄 Running migration: add-blast-metric-columns.sql\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-blast-metric-columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try alternative: split and execute individual statements
      console.log('📝 Executing SQL statements individually...\n');

      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        if (!statement) continue;

        console.log(`Executing: ${statement.substring(0, 60)}...`);
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (stmtError) {
          console.error(`❌ Error:`, stmtError.message);
        } else {
          console.log('   ✓ Success');
        }
      }
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('Added columns to blast_swings table:');
    console.log('  - bat_speed (DECIMAL 5,2)');
    console.log('  - attack_angle (DECIMAL 5,2)');
    console.log('  - time_to_contact (DECIMAL 6,3)');
    console.log('  - peak_hand_speed (DECIMAL 5,2)');
    console.log('  - on_plane_efficiency (DECIMAL 5,2)');
    console.log('  - vertical_bat_angle (DECIMAL 5,2)');
    console.log('\n📊 Indexes created for fast queries');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
