import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyViewTypes() {
  console.log('🔍 Verifying athlete view types setup...\n');

  // Check view types table
  const { data: viewTypes, error: vtError } = await supabase
    .from('athlete_view_types')
    .select('*')
    .order('display_order');

  if (vtError) {
    console.error('❌ Error fetching view types:', vtError);
    return;
  }

  console.log(`✅ Found ${viewTypes?.length || 0} view types:\n`);
  viewTypes?.forEach(vt => {
    console.log(`   ${vt.display_order}. ${vt.name}`);
    console.log(`      ${vt.description}`);
    console.log(`      ID: ${vt.id}`);
    console.log(`      Org: ${vt.org_id}\n`);
  });

  // Check athletes table for view_type_id column
  const { data: sample } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, view_type_id')
    .limit(1)
    .single();

  if (sample && 'view_type_id' in sample) {
    console.log('✅ view_type_id column exists in athletes table');
    console.log(`   Current value: ${sample.view_type_id || 'null (not assigned)'}\n`);
  } else {
    console.log('❌ view_type_id column NOT found in athletes table\n');
  }

  console.log('🎉 Verification complete!');
}

verifyViewTypes().catch(console.error);
