const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function findCustomMeasurements() {
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, metric_schema, category')
    .eq('is_active', true)
    .limit(200);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Looking for custom measurements (containing parentheses)...\n');

  let found = 0;
  exercises.forEach(ex => {
    const measurements = ex.metric_schema?.measurements || [];
    const customMeasurements = measurements.filter(m => m.name.includes('('));

    if (customMeasurements.length > 0) {
      found++;
      console.log(`Exercise: ${ex.name} (${ex.category})`);
      console.log(`Custom measurements:`);
      customMeasurements.forEach(m => {
        console.log(`  - ${m.name} (id: ${m.id}, type: ${m.type}, unit: ${m.unit})`);
      });
      console.log('');
    }
  });

  console.log(`Found ${found} exercises with custom measurements`);
}

findCustomMeasurements().then(() => process.exit(0));
