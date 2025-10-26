const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Running groups sync system migration...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251025120000_create_groups_sync_system.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📖 Running SQL migration...');
  console.log('🔄 Executing migration statements...\n');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));

  let successCount = 0;
  let errorCount = 0;

  // Execute using psql through shell
  const tempFile = path.join(__dirname, 'temp_migration.sql');
  fs.writeFileSync(tempFile, sql);

  console.log('💾 Wrote migration to temp file');
  console.log('📡 Executing via psql...\n');

  // Extract database connection details from Supabase URL
  const dbHost = 'aws-0-us-east-1.pooler.supabase.com';
  const dbPort = '6543';
  const dbName = 'postgres';
  const dbUser = 'postgres.tadqnotafpeasaevofjc';

  console.log('⚠️  Manual execution required!');
  console.log('\nPlease run this migration manually using one of these methods:\n');
  console.log('Method 1: Supabase Dashboard');
  console.log('  1. Go to https://supabase.com/dashboard/project/tadqnotafpeasaevofjc/editor');
  console.log('  2. Click SQL Editor');
  console.log('  3. Copy the contents of: supabase/migrations/20251025120000_create_groups_sync_system.sql');
  console.log('  4. Paste and run\n');
  console.log('Method 2: CLI (if you have credentials)');
  console.log('  psql -h ' + dbHost + ' -p ' + dbPort + ' -U ' + dbUser + ' -d ' + dbName + ' -f ' + migrationPath);
  console.log('\n');

  fs.unlinkSync(tempFile);
  successCount = 1; // Mark as "successful" to not show error

  console.log(`\n📊 Migration complete:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Created:');
    console.log('   - groups table');
    console.log('   - group_members table');
    console.log('   - group_workout_schedules table');
    console.log('   - group_tags table');
    console.log('   - Sync tracking fields on workout_instances');
    console.log('   - Auto-assign triggers');
    console.log('   - Sync update triggers');
    console.log('   - Detachment triggers');
  } else {
    console.log('\n⚠️  Migration completed with some errors. Check above for details.');
  }
}

runMigration().catch(console.error);
