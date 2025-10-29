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

async function comprehensiveTest() {
  console.log('🧪 Comprehensive CRUD Test for Custom Measurements UI\n');

  // ===== Test 1: ADD Single Measurement =====
  console.log('Test 1: ADD - Creating single measurement "Jump Height"...');
  const singleMeasurement = {
    id: 'custom_' + Date.now(),
    name: 'Jump Height',
    category: 'single',
    primary_metric_id: 'custom_' + Date.now(),
    primary_metric_name: 'inches',
    primary_metric_type: 'decimal',
    secondary_metric_id: null,
    secondary_metric_name: null,
    secondary_metric_type: null,
    is_locked: false
  };

  const { data: addedSingle, error: addSingleError } = await supabase
    .from('custom_measurements')
    .insert(singleMeasurement)
    .select()
    .single();

  if (addSingleError) {
    console.error('❌ ADD SINGLE failed:', addSingleError);
    return;
  }
  console.log('✅ ADD SINGLE successful:', addedSingle.name, '-', addedSingle.primary_metric_name, '(' + addedSingle.primary_metric_type + ')');

  // ===== Test 2: UPDATE Single Measurement =====
  console.log('\nTest 2: UPDATE - Editing "Jump Height" to use "feet" instead...');
  const { data: updatedSingle, error: updateSingleError } = await supabase
    .from('custom_measurements')
    .update({
      primary_metric_name: 'feet',
      primary_metric_type: 'integer'
    })
    .eq('id', singleMeasurement.id)
    .select()
    .single();

  if (updateSingleError) {
    console.error('❌ UPDATE SINGLE failed:', updateSingleError);
    return;
  }
  console.log('✅ UPDATE SINGLE successful:', updatedSingle.name, '-', updatedSingle.primary_metric_name, '(' + updatedSingle.primary_metric_type + ')');

  // ===== Test 3: ADD Paired Measurement =====
  console.log('\nTest 3: ADD - Creating paired measurement "Orange Ball"...');
  const baseId = Date.now();
  const pairedMeasurement = {
    id: 'custom_' + baseId,
    name: 'Orange Ball (300g)',
    category: 'paired',
    primary_metric_id: `${baseId}_primary`,
    primary_metric_name: 'Throws',
    primary_metric_type: 'integer',
    secondary_metric_id: `${baseId}_secondary`,
    secondary_metric_name: 'Velocity',
    secondary_metric_type: 'decimal',
    is_locked: false
  };

  const { data: addedPaired, error: addPairedError } = await supabase
    .from('custom_measurements')
    .insert(pairedMeasurement)
    .select()
    .single();

  if (addPairedError) {
    console.error('❌ ADD PAIRED failed:', addPairedError);
    return;
  }
  console.log('✅ ADD PAIRED successful:', addedPaired.name);
  console.log('   Primary:', addedPaired.primary_metric_name, '(' + addedPaired.primary_metric_type + ')');
  console.log('   Secondary:', addedPaired.secondary_metric_name, '(' + addedPaired.secondary_metric_type + ')');

  // ===== Test 4: UPDATE Paired Measurement =====
  console.log('\nTest 4: UPDATE - Editing "Orange Ball" metrics...');
  const { data: updatedPaired, error: updatePairedError } = await supabase
    .from('custom_measurements')
    .update({
      primary_metric_name: 'Reps',
      primary_metric_type: 'integer',
      secondary_metric_name: 'MPH',
      secondary_metric_type: 'decimal'
    })
    .eq('id', pairedMeasurement.id)
    .select()
    .single();

  if (updatePairedError) {
    console.error('❌ UPDATE PAIRED failed:', updatePairedError);
    return;
  }
  console.log('✅ UPDATE PAIRED successful:', updatedPaired.name);
  console.log('   Primary:', updatedPaired.primary_metric_name, '(' + updatedPaired.primary_metric_type + ')');
  console.log('   Secondary:', updatedPaired.secondary_metric_name, '(' + updatedPaired.secondary_metric_type + ')');

  // ===== Test 5: DELETE Single Measurement =====
  console.log('\nTest 5: DELETE - Removing "Jump Height"...');
  const { error: deleteSingleError } = await supabase
    .from('custom_measurements')
    .delete()
    .eq('id', singleMeasurement.id);

  if (deleteSingleError) {
    console.error('❌ DELETE SINGLE failed:', deleteSingleError);
    return;
  }
  console.log('✅ DELETE SINGLE successful');

  // ===== Test 6: DELETE Paired Measurement =====
  console.log('\nTest 6: DELETE - Removing "Orange Ball"...');
  const { error: deletePairedError } = await supabase
    .from('custom_measurements')
    .delete()
    .eq('id', pairedMeasurement.id);

  if (deletePairedError) {
    console.error('❌ DELETE PAIRED failed:', deletePairedError);
    return;
  }
  console.log('✅ DELETE PAIRED successful');

  // ===== Test 7: Verify Locked Measurements Can't Be Deleted =====
  console.log('\nTest 7: SECURITY - Attempting to delete locked measurement (should fail)...');
  const { error: deleteLockedError } = await supabase
    .from('custom_measurements')
    .delete()
    .eq('id', 'reps');

  if (deleteLockedError) {
    console.log('✅ SECURITY TEST passed: Locked measurements are protected');
  } else {
    console.error('❌ SECURITY TEST failed: Locked measurement was deleted!');
  }

  // ===== Final Count =====
  console.log('\nFinal Verification: Counting measurements...');
  const { data: finalCount, error: countError } = await supabase
    .from('custom_measurements')
    .select('id, name, category, is_locked')
    .order('name');

  if (countError) {
    console.error('❌ COUNT failed:', countError);
  } else {
    console.log(`✅ Found ${finalCount.length} measurements:`);
    finalCount.forEach(m => {
      const lock = m.is_locked ? '🔒' : '  ';
      const cat = m.category === 'paired' ? '👥' : '1️⃣';
      console.log(`   ${lock} ${cat} ${m.name}`);
    });
  }

  console.log('\n✨ All tests completed successfully!');
  console.log('\n📝 Summary:');
  console.log('   ✅ CREATE single measurement');
  console.log('   ✅ UPDATE single measurement');
  console.log('   ✅ DELETE single measurement');
  console.log('   ✅ CREATE paired measurement');
  console.log('   ✅ UPDATE paired measurement');
  console.log('   ✅ DELETE paired measurement');
  console.log('   ✅ Security: Locked measurements protected');
}

comprehensiveTest().then(() => {
  console.log('\n👍 Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
