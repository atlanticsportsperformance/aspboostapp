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

// Test with ANON key (like the UI does)
const supabaseAnon = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAnonUpdate() {
  console.log('🧪 Testing update with ANON key (like UI)...\n');

  // Try to update the Distance measurement
  console.log('Attempting to update Distance measurement...');
  const { data, error } = await supabaseAnon
    .from('custom_measurements')
    .update({
      primary_metric_name: 'yards'
    })
    .eq('id', 'distance')
    .select()
    .single();

  if (error) {
    console.error('❌ UPDATE failed with ANON key:', error);
    console.log('\n⚠️  This explains why the UI update is failing!');
    console.log('The RLS policy needs to be updated.\n');
  } else {
    console.log('✅ UPDATE successful with ANON key:', data);
  }

  // Try to read (should work)
  console.log('\nAttempting to read measurements...');
  const { data: readData, error: readError } = await supabaseAnon
    .from('custom_measurements')
    .select('*')
    .limit(1);

  if (readError) {
    console.error('❌ READ failed:', readError);
  } else {
    console.log('✅ READ successful: Found', readData.length, 'measurement(s)');
  }
}

testAnonUpdate().then(() => {
  console.log('\n👍 Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
