import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyFunction() {
  console.log('Creating delete_auth_user_cascade function...\n');

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'create-delete-auth-user-function.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Split by semicolons and execute each statement (skip comments)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;

    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        // Try direct execution if exec_sql doesn't exist
        const { error: directError } = await supabase.from('_').select(statement).limit(0);

        if (directError) {
          console.error('Error:', directError);
        }
      } else {
        console.log('✓ Success');
      }
    } catch (e) {
      console.log('Note: exec_sql RPC may not exist, function might already be created');
    }
  }

  console.log('\n✅ Function creation attempted');
  console.log('Now testing the function...\n');

  // Test by trying to list the function
  const { data, error } = await supabase.rpc('delete_auth_user_cascade', {
    user_id_to_delete: '00000000-0000-0000-0000-000000000000' // Fake UUID to test function exists
  });

  if (error) {
    if (error.message.includes('User not found')) {
      console.log('✅ Function is working! (Expected "User not found" error for test UUID)');
    } else {
      console.log('⚠️  Function test result:', error.message);
    }
  } else {
    console.log('Function response:', data);
  }
}

applyFunction().catch(console.error);
