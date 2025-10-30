const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBlastConfig() {
  console.log('Checking Blast Motion configuration...\n');

  const { data: orgSettings, error } = await supabase
    .from('organization_settings')
    .select('organization_id, blast_api_username, blast_api_password')
    .limit(5);

  if (error) {
    console.error('Error fetching organization settings:', error);
    return;
  }

  if (!orgSettings || orgSettings.length === 0) {
    console.log('No organization settings found');
    return;
  }

  console.log('Organization Settings:');
  orgSettings.forEach(org => {
    console.log(`\nOrganization ID: ${org.organization_id}`);
    console.log(`  Blast Username: ${org.blast_api_username || 'NOT SET'}`);
    console.log(`  Blast Password: ${org.blast_api_password ? 'SET (hidden)' : 'NOT SET'}`);
  });
}

checkBlastConfig();
