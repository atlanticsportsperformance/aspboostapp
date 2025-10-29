import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAthletesSchema() {
  console.log('🔍 Checking athletes table schema...\n');

  // Get a sample athlete to see all columns
  const { data: sample } = await supabase
    .from('athletes')
    .select('*')
    .limit(1)
    .single();

  if (sample) {
    console.log('✅ Athletes table columns:');
    console.log(Object.keys(sample).join(', '));
    console.log('\n📋 Sample record:');
    console.log(JSON.stringify(sample, null, 2));
  } else {
    console.log('⚠️  No athletes found in database');
  }

  // Check if view_type_id column exists
  const hasViewTypeId = sample && 'view_type_id' in sample;
  console.log(`\n🔍 view_type_id column exists: ${hasViewTypeId ? '✅ YES' : '❌ NO (needs to be added)'}`);
}

checkAthletesSchema().catch(console.error);
