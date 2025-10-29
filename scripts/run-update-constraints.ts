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

async function updateConstraints() {
  console.log('🔄 Updating type constraints...\n');

  // Drop existing constraints
  console.log('Dropping old constraints...');
  await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE custom_measurements DROP CONSTRAINT IF EXISTS custom_measurements_primary_metric_type_check'
  });
  await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE custom_measurements DROP CONSTRAINT IF EXISTS custom_measurements_secondary_metric_type_check'
  });

  // Add new constraints
  console.log('Adding new constraints...');
  const { error: error1 } = await supabase.rpc('exec_sql', {
    sql: "ALTER TABLE custom_measurements ADD CONSTRAINT custom_measurements_primary_metric_type_check CHECK (primary_metric_type IN ('integer', 'decimal', 'time'))"
  });

  const { error: error2 } = await supabase.rpc('exec_sql', {
    sql: "ALTER TABLE custom_measurements ADD CONSTRAINT custom_measurements_secondary_metric_type_check CHECK (secondary_metric_type IN ('integer', 'decimal', 'time'))"
  });

  if (error1 || error2) {
    console.error('Errors:', error1, error2);
    throw new Error('Failed to update constraints');
  }

  console.log('✅ Constraints updated!');
}

updateConstraints().then(() => {
  console.log('\n👍 Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  console.log('\nTrying direct query approach...');
  process.exit(1);
});
