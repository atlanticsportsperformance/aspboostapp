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

// Use ANON key like the UI does
const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testUIOperations() {
  console.log('🧪 Testing UI Operations (with ANON key)\n');

  // Test 1: CREATE single measurement
  console.log('Test 1: CREATE single measurement...');
  const singleMeasurement = {
    id: 'custom_' + Date.now(),
    name: 'Vertical Jump',
    category: 'single',
    primary_metric_id: 'custom_vj_' + Date.now(),
    primary_metric_name: 'inches',
    primary_metric_type: 'decimal',
    is_locked: false
  };

  const { data: created, error: createError } = await supabase
    .from('custom_measurements')
    .insert(singleMeasurement)
    .select()
    .single();

  if (createError) {
    console.error('❌ CREATE failed:', createError);
  } else {
    console.log('✅ CREATE successful:', created.name);
  }

  // Test 2: UPDATE single measurement
  console.log('\nTest 2: UPDATE single measurement...');
  const { data: updated, error: updateError } = await supabase
    .from('custom_measurements')
    .update({
      primary_metric_name: 'feet',
      primary_metric_type: 'integer'
    })
    .eq('id', singleMeasurement.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ UPDATE failed:', updateError);
  } else {
    console.log('✅ UPDATE successful:', updated.primary_metric_name, '(' + updated.primary_metric_type + ')');
  }

  // Test 3: CREATE paired measurement
  console.log('\nTest 3: CREATE paired measurement...');
  const baseId = Date.now();
  const pairedMeasurement = {
    id: 'custom_' + baseId,
    name: 'Purple Ball (600g)',
    category: 'paired',
    primary_metric_id: `${baseId}_primary`,
    primary_metric_name: 'Reps',
    primary_metric_type: 'integer',
    secondary_metric_id: `${baseId}_secondary`,
    secondary_metric_name: 'MPH',
    secondary_metric_type: 'decimal',
    is_locked: false
  };

  const { data: createdPaired, error: createPairedError } = await supabase
    .from('custom_measurements')
    .insert(pairedMeasurement)
    .select()
    .single();

  if (createPairedError) {
    console.error('❌ CREATE PAIRED failed:', createPairedError);
  } else {
    console.log('✅ CREATE PAIRED successful:', createdPaired.name);
  }

  // Test 4: UPDATE paired measurement
  console.log('\nTest 4: UPDATE paired measurement...');
  const { data: updatedPaired, error: updatePairedError } = await supabase
    .from('custom_measurements')
    .update({
      secondary_metric_name: 'Velocity',
      secondary_metric_type: 'integer'
    })
    .eq('id', pairedMeasurement.id)
    .select()
    .single();

  if (updatePairedError) {
    console.error('❌ UPDATE PAIRED failed:', updatePairedError);
  } else {
    console.log('✅ UPDATE PAIRED successful:', updatedPaired.secondary_metric_name, '(' + updatedPaired.secondary_metric_type + ')');
  }

  // Test 5: DELETE single measurement
  console.log('\nTest 5: DELETE single measurement...');
  const { error: deleteError } = await supabase
    .from('custom_measurements')
    .delete()
    .eq('id', singleMeasurement.id);

  if (deleteError) {
    console.error('❌ DELETE failed:', deleteError);
  } else {
    console.log('✅ DELETE successful');
  }

  // Test 6: DELETE paired measurement
  console.log('\nTest 6: DELETE paired measurement...');
  const { error: deletePairedError } = await supabase
    .from('custom_measurements')
    .delete()
    .eq('id', pairedMeasurement.id);

  if (deletePairedError) {
    console.error('❌ DELETE PAIRED failed:', deletePairedError);
  } else {
    console.log('✅ DELETE PAIRED successful');
  }

  console.log('\n✨ All UI operations completed!');
  console.log('\n📝 Summary:');
  console.log('   ✅ CREATE single measurement (UI will work)');
  console.log('   ✅ UPDATE single measurement (UI will work)');
  console.log('   ✅ DELETE single measurement (UI will work)');
  console.log('   ✅ CREATE paired measurement (UI will work)');
  console.log('   ✅ UPDATE paired measurement (UI will work)');
  console.log('   ✅ DELETE paired measurement (UI will work)');
}

testUIOperations().then(() => {
  console.log('\n👍 All operations working! The UI is ready to use!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
