/**
 * Apply the auto-contribution trigger system to the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyAutoContributionSystem() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🚀 Applying Auto-Contribution Trigger System...\n');

  // Read the SQL file
  const sqlPath = join(__dirname, 'create-auto-contribution-system.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // Split by semicolons but be careful with function definitions
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments and empty statements
    if (statement.trim().startsWith('--') || statement.trim() === ';') {
      continue;
    }

    try {
      // For CREATE FUNCTION, we need to handle it specially
      if (statement.includes('CREATE OR REPLACE FUNCTION')) {
        console.log(`📦 Creating function check_and_add_percentile_contribution()...`);

        // Find the complete function definition (everything up to the final $$;)
        const functionStart = sql.indexOf('CREATE OR REPLACE FUNCTION');
        const functionEnd = sql.indexOf('$$ LANGUAGE plpgsql;', functionStart) + '$$ LANGUAGE plpgsql;'.length;
        const fullFunction = sql.substring(functionStart, functionEnd);

        const { error } = await supabase.rpc('exec_sql', {
          sql: fullFunction
        }) as any;

        if (error) {
          console.error(`   ❌ Error:`, error.message);
          errorCount++;
        } else {
          console.log(`   ✅ Function created`);
          successCount++;
        }

        // Skip forward to avoid processing function body parts
        continue;
      }

      // For CREATE TRIGGER statements
      if (statement.includes('CREATE TRIGGER')) {
        const triggerName = statement.match(/CREATE TRIGGER (\w+)/)?.[1];
        console.log(`🔧 Creating trigger ${triggerName}...`);

        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        }) as any;

        if (error) {
          console.error(`   ❌ Error:`, error.message);
          errorCount++;
        } else {
          console.log(`   ✅ Trigger created`);
          successCount++;
        }
        continue;
      }

      // For DROP TRIGGER statements
      if (statement.includes('DROP TRIGGER')) {
        const triggerName = statement.match(/DROP TRIGGER IF EXISTS (\w+)/)?.[1];
        console.log(`🗑️  Dropping old trigger ${triggerName}...`);

        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        }) as any;

        if (error && !error.message.includes('does not exist')) {
          console.error(`   ❌ Error:`, error.message);
          errorCount++;
        } else {
          console.log(`   ✅ Dropped (or didn't exist)`);
          successCount++;
        }
        continue;
      }

      // For CREATE INDEX statements
      if (statement.includes('CREATE INDEX')) {
        const indexName = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1];
        console.log(`📊 Creating index ${indexName}...`);

        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        }) as any;

        if (error && !error.message.includes('already exists')) {
          console.error(`   ❌ Error:`, error.message);
          errorCount++;
        } else {
          console.log(`   ✅ Index created`);
          successCount++;
        }
        continue;
      }

      // For SELECT verification statements
      if (statement.trim().startsWith('SELECT')) {
        console.log(`🔍 Running verification query...`);

        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        }) as any;

        if (error) {
          console.error(`   ❌ Error:`, error.message);
        } else {
          console.log(`   ✅ Results:`, data);
        }
        continue;
      }

    } catch (err) {
      console.error(`❌ Unexpected error:`, err);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Completed: ${successCount} operations successful`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount} operations failed`);
  }
  console.log('='.repeat(60));

  // Verify the system was created
  console.log('\n🔍 Verifying trigger system...\n');

  const { data: triggers } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        event_object_table as table_name,
        trigger_name,
        action_timing || ' ' || event_manipulation as trigger_action
      FROM information_schema.triggers
      WHERE event_object_table IN ('cmj_tests', 'sj_tests', 'hj_tests', 'ppu_tests', 'imtp_tests')
        AND trigger_schema = 'public'
      ORDER BY event_object_table;
    `
  }) as any;

  if (triggers && triggers.length === 5) {
    console.log('✅ All 5 triggers created successfully:');
    triggers.forEach((t: any) => {
      console.log(`   - ${t.table_name}: ${t.trigger_name} (${t.trigger_action})`);
    });
  } else {
    console.log(`⚠️  Expected 5 triggers, found ${triggers?.length || 0}`);
    if (triggers) {
      triggers.forEach((t: any) => {
        console.log(`   - ${t.table_name}: ${t.trigger_name}`);
      });
    }
  }

  console.log('\n✅ Auto-contribution system installation complete!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Run backfill script to add Colin Ma\'s missing contributions');
  console.log('   2. Test with new VALD sync to verify triggers work automatically');
}

applyAutoContributionSystem().catch(console.error);
