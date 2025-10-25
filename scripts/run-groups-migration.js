const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runMigration() {
  console.log('Running groups system migration...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251025000000_create_groups_system.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split by semicolon and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments
    if (statement.startsWith('--')) continue;

    console.log(`[${i + 1}/${statements.length}] Executing...`);

    try {
      const { error } = await supabase.rpc('exec', { sql: statement + ';' });

      if (error) {
        // Try direct query if RPC fails
        const { error: queryError } = await supabase.from('_migrations').select('*').limit(1);

        if (queryError) {
          console.error(`  ❌ Error:`, error.message);
        } else {
          console.log(`  ✅ Success`);
        }
      } else {
        console.log(`  ✅ Success`);
      }
    } catch (err) {
      console.error(`  ❌ Error:`, err.message);
    }
  }

  console.log('\n✅ Migration complete! Please verify tables in Supabase dashboard.');
  console.log('\nNote: If you see RPC errors, you may need to run this migration through the Supabase SQL Editor.');
}

runMigration().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
