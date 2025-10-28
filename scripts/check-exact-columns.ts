import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkColumns() {
  const { data } = await supabase
    .from('staff_permissions')
    .select('*')
    .limit(1);

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('Total columns:', columns.length);
    console.log('\nAll columns:');
    columns.forEach((col, i) => {
      console.log(`${i + 1}. ${col}`);
    });
  }
}

checkColumns();
