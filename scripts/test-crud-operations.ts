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

async function testCRUD() {
  console.log('🧪 Testing CRUD Operations...\n');

  // Test 1: CREATE - Add a new single measurement
  console.log('Test 1: CREATE - Adding new single measurement...');
  const testMeasurement = {
    id: 'test_single_' + Date.now(),
    name: 'Test Height',
    category: 'single',
    primary_metric_id: 'test_height',
    primary_metric_name: 'inches',
    primary_metric_type: 'decimal',
    secondary_metric_id: null,
    secondary_metric_name: null,
    secondary_metric_type: null,
    is_locked: false
  };

  const { data: created, error: createError } = await supabase
    .from('custom_measurements')
    .insert(testMeasurement)
    .select()
    .single();

  if (createError) {
    console.error('❌ CREATE failed:', createError);
    console.log('\n⚠️  The table constraints have not been updated yet!');
    console.log('Please run the SQL in Supabase Dashboard SQL Editor:\n');
    console.log('See: scripts/recreate-custom-measurements-table.sql\n');
    return;
  } else {
    console.log('✅ CREATE successful:', created.name);
  }

  // Test 2: READ - Fetch all measurements
  console.log('\nTest 2: READ - Fetching all measurements...');
  const { data: allMeasurements, error: readError } = await supabase
    .from('custom_measurements')
    .select('*')
    .order('name');

  if (readError) {
    console.error('❌ READ failed:', readError);
  } else {
    console.log(`✅ READ successful: Found ${allMeasurements.length} measurements`);
  }

  // Test 3: UPDATE - Edit the test measurement
  console.log('\nTest 3: UPDATE - Editing test measurement...');
  const { data: updated, error: updateError } = await supabase
    .from('custom_measurements')
    .update({
      primary_metric_name: 'feet',
      primary_metric_type: 'integer'
    })
    .eq('id', testMeasurement.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ UPDATE failed:', updateError);
  } else {
    console.log('✅ UPDATE successful:', updated.primary_metric_name, '(' + updated.primary_metric_type + ')');
  }

  // Test 4: DELETE - Remove the test measurement
  console.log('\nTest 4: DELETE - Removing test measurement...');
  const { error: deleteError } = await supabase
    .from('custom_measurements')
    .delete()
    .eq('id', testMeasurement.id);

  if (deleteError) {
    console.error('❌ DELETE failed:', deleteError);
  } else {
    console.log('✅ DELETE successful');
  }

  // Test 5: CREATE - Add a paired measurement
  console.log('\nTest 5: CREATE - Adding new paired measurement...');
  const testPaired = {
    id: 'test_paired_' + Date.now(),
    name: 'Test Drill',
    category: 'paired',
    primary_metric_id: 'test_drill_reps',
    primary_metric_name: 'Throws',
    primary_metric_type: 'integer',
    secondary_metric_id: 'test_drill_velo',
    secondary_metric_name: 'Velocity',
    secondary_metric_type: 'decimal',
    is_locked: false
  };

  const { data: createdPaired, error: createPairedError } = await supabase
    .from('custom_measurements')
    .insert(testPaired)
    .select()
    .single();

  if (createPairedError) {
    console.error('❌ CREATE PAIRED failed:', createPairedError);
  } else {
    console.log('✅ CREATE PAIRED successful:', createdPaired.name);
  }

  // Test 6: UPDATE - Edit paired measurement
  console.log('\nTest 6: UPDATE - Editing paired measurement...');
  const { data: updatedPaired, error: updatePairedError } = await supabase
    .from('custom_measurements')
    .update({
      secondary_metric_name: 'Speed',
      secondary_metric_type: 'integer'
    })
    .eq('id', testPaired.id)
    .select()
    .single();

  if (updatePairedError) {
    console.error('❌ UPDATE PAIRED failed:', updatePairedError);
  } else {
    console.log('✅ UPDATE PAIRED successful:', updatedPaired.secondary_metric_name, '(' + updatedPaired.secondary_metric_type + ')');
  }

  // Test 7: DELETE - Remove paired measurement
  console.log('\nTest 7: DELETE - Removing paired measurement...');
  const { error: deletePairedError } = await supabase
    .from('custom_measurements')
    .delete()
    .eq('id', testPaired.id);

  if (deletePairedError) {
    console.error('❌ DELETE PAIRED failed:', deletePairedError);
  } else {
    console.log('✅ DELETE PAIRED successful');
  }

  console.log('\n✨ All CRUD tests completed!');
}

testCRUD().then(() => {
  console.log('\n👍 Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
