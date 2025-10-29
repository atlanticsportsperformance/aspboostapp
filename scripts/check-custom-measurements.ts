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

async function checkCustomMeasurements() {
  console.log('📊 Checking custom_measurements table structure...\n');

  const { data: measurements, error } = await supabase
    .from('custom_measurements')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching measurements:', error);
    return;
  }

  console.log(`Found ${measurements.length} measurements:\n`);

  measurements.forEach((m) => {
    console.log(`\n📌 ${m.name} (${m.category})`);
    console.log(`   ID: ${m.id}`);
    console.log(`   Locked: ${m.is_locked ? 'Yes' : 'No'}`);

    if (m.category === 'single') {
      console.log(`   Primary Metric: ${m.primary_metric_name} (${m.primary_metric_type})`);
    } else {
      console.log(`   Primary: ${m.primary_metric_name} (${m.primary_metric_type})`);
      console.log(`   Secondary: ${m.secondary_metric_name} (${m.secondary_metric_type})`);
    }
  });

  console.log('\n\n✅ Table structure verified!');
}

checkCustomMeasurements().then(() => {
  console.log('\n👍 Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
