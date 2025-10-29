import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running athlete view types migration...\n');

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'create-athlete-view-types.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      console.log('\n📝 Attempting to run SQL statements individually...\n');

      // Split and run statements individually
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('COMMENT'));

      for (const statement of statements) {
        if (!statement) continue;
        console.log(`Executing: ${statement.substring(0, 80)}...`);

        const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (stmtError) {
          console.error(`  ❌ Error:`, stmtError.message);
        } else {
          console.log(`  ✅ Success`);
        }
      }
    } else {
      console.log('✅ Migration completed successfully!');
    }

    // Verify the changes
    console.log('\n🔍 Verifying migration...\n');

    // Check if table exists
    const { data: viewTypes, error: checkError } = await supabase
      .from('athlete_view_types')
      .select('*')
      .order('display_order');

    if (checkError) {
      console.error('❌ Error checking table:', checkError);
    } else {
      console.log(`✅ Found ${viewTypes?.length || 0} view types:`);
      viewTypes?.forEach(vt => {
        console.log(`   ${vt.display_order}. ${vt.name} - ${vt.description}`);
      });
    }

    // Check if column was added
    const { data: sample } = await supabase
      .from('athletes')
      .select('view_type_id')
      .limit(1)
      .single();

    if (sample && 'view_type_id' in sample) {
      console.log('\n✅ view_type_id column added to athletes table');
    } else {
      console.log('\n❌ view_type_id column NOT found in athletes table');
    }

    console.log('\n🎉 Migration verification complete!');
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

runMigration().catch(console.error);
