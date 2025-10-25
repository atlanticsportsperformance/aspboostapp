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

async function checkTables() {
  console.log('=== CHECKING GROUPS TABLES ===\n');

  // Check groups table
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id')
    .limit(1);

  console.log('✓ groups table:', groupsError ? '❌ NOT FOUND' : '✅ EXISTS');

  // Check group_members table
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('id')
    .limit(1);

  console.log('✓ group_members table:', membersError ? '❌ NOT FOUND' : '✅ EXISTS');

  // Check group_workout_schedules table
  const { data: schedules, error: schedulesError } = await supabase
    .from('group_workout_schedules')
    .select('id')
    .limit(1);

  console.log('✓ group_workout_schedules table:', schedulesError ? '❌ NOT FOUND' : '✅ EXISTS');

  // Check group_tags table
  const { data: tags, error: tagsError } = await supabase
    .from('group_tags')
    .select('id')
    .limit(1);

  console.log('✓ group_tags table:', tagsError ? '❌ NOT FOUND' : '✅ EXISTS');

  console.log('\n=== MIGRATION STATUS ===');
  if (!groupsError && !membersError && !schedulesError && !tagsError) {
    console.log('✅ All groups tables exist! Ready to use.');
  } else {
    console.log('❌ Some tables are missing. Please run the migration:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Paste contents of: supabase/migrations/20251025000000_create_groups_system.sql');
    console.log('   3. Run the SQL');
  }
}

checkTables().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
