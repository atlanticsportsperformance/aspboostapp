import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('🔧 Fixing athlete_percentile_history play_level constraint...\n');

  const sqlFile = path.join(process.cwd(), 'scripts', 'fix-percentile-history-constraint.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  // Split SQL into statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  for (const statement of statements) {
    if (!statement) continue;

    console.log(`Executing: ${statement.substring(0, 100)}...`);

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

    if (error) {
      // Try direct approach if RPC doesn't exist
      console.log('RPC failed, trying direct SQL execution...');

      // Use Supabase SQL editor approach
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ sql_query: statement }),
      });

      if (!response.ok) {
        console.error(`❌ Failed: ${await response.text()}`);
      } else {
        console.log('✅ Success');
      }
    } else {
      console.log('✅ Success');
      if (data) console.log('Result:', data);
    }
  }

  console.log('\n🧪 Testing the fix...');

  // Test inserting a record with 'Overall'
  const { error: testError } = await supabase
    .from('athlete_percentile_history')
    .insert({
      athlete_id: '00000000-0000-0000-0000-000000000000',
      test_type: 'CMJ',
      test_date: new Date().toISOString(),
      test_id: 'test-overall-after-fix',
      play_level: 'Overall',
      metrics: { test: { value: 100, percentile: 50 } },
      composite_score_level: 50,
      composite_score_overall: null,
    });

  if (testError) {
    console.error('❌ Test insert still failing:', testError);
  } else {
    console.log('✅ Test insert succeeded! Constraint is fixed.');

    // Clean up
    await supabase
      .from('athlete_percentile_history')
      .delete()
      .eq('test_id', 'test-overall-after-fix');

    console.log('✅ Cleaned up test record');
  }
}

applyFix().catch(console.error);
