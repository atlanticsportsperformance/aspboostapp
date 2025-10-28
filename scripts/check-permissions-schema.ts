import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  // Try to get one record to see what columns exist
  const { data, error } = await supabase
    .from('staff_permissions')
    .select('*')
    .limit(1);

  console.log('Existing staff_permissions columns:');
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]).join(', '));
  } else if (error) {
    console.error('Error:', error);
  } else {
    console.log('No records found');
  }
}

checkSchema();
