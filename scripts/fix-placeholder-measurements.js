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

async function fixPlaceholders() {
  console.log('Fixing placeholder measurements...\n');

  // Get all placeholders
  const { data: placeholders, error: phError } = await supabase
    .from('exercises')
    .select('id, name, metric_schema')
    .eq('is_active', true)
    .eq('is_placeholder', true);

  if (phError) {
    console.error('Error fetching placeholders:', phError);
    return;
  }

  console.log(`Found ${placeholders.length} placeholders\n`);

  // Get ALL exercises to extract all measurements
  const { data: allExercises, error: exError } = await supabase
    .from('exercises')
    .select('metric_schema')
    .eq('is_active', true);

  if (exError) {
    console.error('Error fetching exercises:', exError);
    return;
  }

  // Extract unique measurements
  const measurementsMap = new Map();
  allExercises.forEach((ex) => {
    const measurements = ex.metric_schema?.measurements || [];
    measurements.forEach((m) => {
      if (!measurementsMap.has(m.id)) {
        measurementsMap.set(m.id, { ...m, enabled: true });
      }
    });
  });

  const allMeasurements = Array.from(measurementsMap.values());
  console.log(`Found ${allMeasurements.length} unique measurements across all exercises\n`);

  // Update each placeholder
  for (const placeholder of placeholders) {
    const currentMeasurements = placeholder.metric_schema?.measurements || [];
    console.log(`Placeholder "${placeholder.name}": currently has ${currentMeasurements.length} measurements`);

    const { error: updateError } = await supabase
      .from('exercises')
      .update({
        metric_schema: { measurements: allMeasurements }
      })
      .eq('id', placeholder.id);

    if (updateError) {
      console.error(`  ❌ Error updating "${placeholder.name}":`, updateError);
    } else {
      console.log(`  ✅ Updated to ${allMeasurements.length} measurements`);
    }
  }

  console.log('\n✅ Done! All placeholders now have all available measurements.');
}

fixPlaceholders().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
