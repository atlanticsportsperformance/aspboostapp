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

async function simplifyTypes() {
  console.log('🔄 Simplifying measurement types...\n');

  // Mapping from old types to new simplified types
  const typeMapping = {
    'reps': 'integer',
    'performance_integer': 'integer',
    'performance_decimal': 'decimal',
    'weight': 'decimal',
    'distance': 'decimal',
    'time': 'time'
  };

  // Fetch all measurements
  const { data: measurements, error } = await supabase
    .from('custom_measurements')
    .select('*');

  if (error) {
    console.error('❌ Error fetching measurements:', error);
    return;
  }

  console.log(`Found ${measurements.length} measurements to update\n`);

  for (const measurement of measurements) {
    const updates: any = {};

    // Update primary metric type
    if (measurement.primary_metric_type && typeMapping[measurement.primary_metric_type]) {
      updates.primary_metric_type = typeMapping[measurement.primary_metric_type];
      console.log(`  Updating ${measurement.name} primary: ${measurement.primary_metric_type} → ${updates.primary_metric_type}`);
    }

    // Update secondary metric type (for paired measurements)
    if (measurement.secondary_metric_type && typeMapping[measurement.secondary_metric_type]) {
      updates.secondary_metric_type = typeMapping[measurement.secondary_metric_type];
      console.log(`  Updating ${measurement.name} secondary: ${measurement.secondary_metric_type} → ${updates.secondary_metric_type}`);
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('custom_measurements')
        .update(updates)
        .eq('id', measurement.id);

      if (updateError) {
        console.error(`  ❌ Error updating ${measurement.name}:`, updateError);
      } else {
        console.log(`  ✅ Updated ${measurement.name}`);
      }
    }
  }

  console.log('\n✨ Type simplification complete!');
}

simplifyTypes().then(() => {
  console.log('\n👍 Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
