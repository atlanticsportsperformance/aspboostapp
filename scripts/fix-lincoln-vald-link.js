const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixLincolnValdLink() {
  const athleteId = 'dd036079-556c-4fb3-90ab-2614f3a6667a';
  const wrongValdProfileId = 'b341abcb-3ecb-408f-b7c1-027b542c008f';

  console.log('🔧 Fixing Lincoln Beliveau\'s incorrect VALD link...');
  console.log('Athlete ID:', athleteId);
  console.log('Removing incorrect VALD Profile ID:', wrongValdProfileId);
  console.log('');

  // Get current athlete data
  const { data: before, error: beforeError } = await supabase
    .from('athletes')
    .select('*')
    .eq('id', athleteId)
    .single();

  if (beforeError) {
    console.error('❌ Error fetching athlete:', beforeError.message);
    return;
  }

  console.log('📋 Current athlete data:');
  console.log(`Name: ${before.first_name} ${before.last_name}`);
  console.log(`Email: ${before.email}`);
  console.log(`VALD Profile ID: ${before.vald_profile_id}`);
  console.log(`VALD Synced At: ${before.vald_synced_at}`);
  console.log('');

  // Remove the VALD link
  const { data: updated, error: updateError } = await supabase
    .from('athletes')
    .update({
      vald_profile_id: null,
      vald_sync_id: null,
      vald_synced_at: null,
      vald_external_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', athleteId)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating athlete:', updateError.message);
    return;
  }

  console.log('✅ Successfully removed VALD link from Lincoln Beliveau');
  console.log('');
  console.log('📋 Updated athlete data:');
  console.log(`Name: ${updated.first_name} ${updated.last_name}`);
  console.log(`Email: ${updated.email}`);
  console.log(`VALD Profile ID: ${updated.vald_profile_id}`);
  console.log(`VALD Synced At: ${updated.vald_synced_at}`);
  console.log('');
  console.log('✅ Lincoln Beliveau is now unlinked from VALD');
  console.log('You can now add him again and link to the correct VALD profile (or create a new one)');
}

fixLincolnValdLink().catch(console.error);
