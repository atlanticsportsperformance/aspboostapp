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

async function restoreReps() {
  console.log('🔄 Restoring Reps measurement...\n');

  const repsMeasurement = {
    id: 'reps',
    name: 'Reps',
    category: 'single',
    primary_metric_id: 'reps',
    primary_metric_name: 'Reps',
    primary_metric_type: 'integer',
    secondary_metric_id: null,
    secondary_metric_name: null,
    secondary_metric_type: null,
    is_locked: true
  };

  const { data, error } = await supabase
    .from('custom_measurements')
    .upsert(repsMeasurement, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('❌ Error restoring Reps:', error);
  } else {
    console.log('✅ Reps measurement restored:', data.name, '-', data.primary_metric_name, '(' + data.primary_metric_type + ')');
  }
}

restoreReps().then(() => {
  console.log('\n👍 Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
