import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('📊 Checking workout_instances table schema...\n');

  const { data: sample } = await supabase
    .from('workout_instances')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (sample) {
    console.log('Available columns:', Object.keys(sample));
    console.log('\nSample record:', sample);
  } else {
    console.log('No records found in workout_instances table');
  }
}

checkSchema().catch(console.error);
