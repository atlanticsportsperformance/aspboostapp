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

async function fixEnabledMeasurements() {
  console.log('\n🔧 Fixing enabled_measurements to match metric_targets...\n');

  // Get ALL exercises with enabled_measurements
  const { data: exercises, error } = await supabase
    .from('routine_exercises')
    .select('id, enabled_measurements, metric_targets, set_configurations')
    .not('enabled_measurements', 'is', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${exercises.length} exercises with enabled_measurements\n`);

  let fixedCount = 0;
  const updates = [];

  for (const ex of exercises) {
    if (!ex.enabled_measurements || ex.enabled_measurements.length === 0) continue;

    let needsUpdate = false;
    let updatedTargets = { ...(ex.metric_targets || {}) };
    let updatedSetConfigs = ex.set_configurations ? [...ex.set_configurations] : null;

    // Check each enabled measurement
    for (const measurementId of ex.enabled_measurements) {
      // If measurement is enabled but NOT in metric_targets, add it with null
      if (!(measurementId in updatedTargets)) {
        console.log(`  Exercise ${ex.id}: Adding ${measurementId}: null to metric_targets`);
        updatedTargets[measurementId] = null;
        needsUpdate = true;

        // Also add to per-set configurations if they exist
        if (updatedSetConfigs && Array.isArray(updatedSetConfigs)) {
          updatedSetConfigs = updatedSetConfigs.map(setConfig => {
            const updated = { ...setConfig };
            if (!updated.metric_values) {
              updated.metric_values = {};
            }
            if (!(measurementId in updated.metric_values)) {
              updated.metric_values[measurementId] = null;
            }
            return updated;
          });
        }
      }
    }

    if (needsUpdate) {
      updates.push({
        id: ex.id,
        metric_targets: updatedTargets,
        set_configurations: updatedSetConfigs
      });
      fixedCount++;
    }
  }

  console.log(`\n📊 Found ${fixedCount} exercises that need fixing\n`);

  if (fixedCount === 0) {
    console.log('✅ All exercises are already correct!');
    return;
  }

  console.log('Applying fixes...\n');

  // Update in batches
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('routine_exercises')
      .update({
        metric_targets: update.metric_targets,
        set_configurations: update.set_configurations
      })
      .eq('id', update.id);

    if (updateError) {
      console.error(`❌ Error updating exercise ${update.id}:`, updateError);
    } else {
      console.log(`✅ Fixed exercise ${update.id}`);
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} exercises!`);
}

fixEnabledMeasurements().then(() => {
  console.log('\nDone!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
