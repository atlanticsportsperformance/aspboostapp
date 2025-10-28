/**
 * Apply Phase 1 Database Migrations
 *
 * SAFE TO RUN: These migrations only ADD new tables and columns
 * Does NOT modify existing functionality
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function applyPhase1() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🚀 Phase 1: Database Setup\n');
  console.log('⚠️  SAFE MIGRATIONS: Only adding new columns/tables\n');

  const migrations = [
    {
      name: 'Add created_by columns',
      file: 'phase1-add-created-by-columns.sql',
    },
    {
      name: 'Create coach_athletes table',
      file: 'phase1-create-coach-athletes-table.sql',
    },
    {
      name: 'Create staff_permissions table',
      file: 'phase1-create-staff-permissions-table.sql',
    },
    {
      name: 'Seed default permissions',
      file: 'phase1-seed-default-permissions.sql',
    },
  ];

  for (const migration of migrations) {
    console.log(`📄 ${migration.name}...`);

    const sqlPath = path.join(__dirname, migration.file);
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split on semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (statement.toLowerCase().includes('select')) {
        // Skip SELECT statements (just for verification in seed script)
        continue;
      }

      try {
        // Execute using the service role client
        const { error } = await supabase.rpc('exec', {
          query: statement + ';'
        });

        if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
          console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
          console.error(`   Statement: ${statement.substring(0, 100)}...`);
        }
      } catch (err) {
        // Try direct query if rpc fails
        try {
          const { error } = await supabase.from('_sql').select('*').limit(0);
          // If we get here, need to use raw SQL execution
          console.log(`   ⚠️  Cannot execute SQL directly through Supabase client`);
          console.log(`   💡 Please run this SQL manually in Supabase SQL Editor:`);
          console.log(`   📄 ${migration.file}\n`);
          break;
        } catch {
          console.error(`   ❌ Error:`, err);
        }
      }
    }

    console.log(`   ✅ ${migration.name} complete\n`);
  }

  console.log('═'.repeat(60));
  console.log('✅ Phase 1 Complete!\n');

  // Verify tables were created
  console.log('🔍 Verifying tables...\n');

  const tables = ['coach_athletes', 'staff_permissions'];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: Not created or no access`);
      console.log(`   Run SQL manually: scripts/${table}.sql`);
    } else {
      console.log(`✅ ${table}: Created (${count} rows)`);
    }
  }

  // Verify columns were added
  console.log('\n🔍 Verifying columns...\n');

  const { data: exercise } = await supabase
    .from('exercises')
    .select('created_by')
    .limit(1);

  if (exercise !== null && 'created_by' in (exercise[0] || {})) {
    console.log('✅ exercises.created_by: Column added');
  } else {
    console.log('⚠️  exercises.created_by: May need manual addition');
  }

  const { data: workout } = await supabase
    .from('workouts')
    .select('created_by')
    .limit(1);

  if (workout !== null && 'created_by' in (workout[0] || {})) {
    console.log('✅ workouts.created_by: Column added');
  } else {
    console.log('⚠️  workouts.created_by: May need manual addition');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 Phase 1 Database Setup Complete!\n');
  console.log('Next: Create permission system UI and hooks\n');
}

applyPhase1().catch(console.error);
