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

async function updateTimeFormat() {
  console.log('⏰ Updating Time measurement format to 00:00...\n');

  const { error } = await supabase
    .from('custom_measurements')
    .update({ primary_metric_name: '00:00' })
    .eq('id', 'time');

  if (error) {
    console.error('❌ Error updating time format:', error);
    return;
  }

  console.log('✅ Time format updated to 00:00');
}

updateTimeFormat().then(() => {
  console.log('\n👍 Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
