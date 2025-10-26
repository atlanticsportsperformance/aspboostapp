import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data } = await supabase
    .from('percentile_metric_mappings')
    .select('*')
    .order('composite_priority');

  console.log('Current Metric Mappings:\n');
  data?.forEach(m => {
    console.log(`${m.driveline_name}`);
    console.log(`  → VALD: ${m.vald_table}.${m.vald_field_name}`);
    console.log(`  → Display: ${m.display_name}`);
    console.log(`  → Composite: ${m.is_composite_metric ? 'YES (priority ' + m.composite_priority + ')' : 'NO'}`);
    console.log();
  });
}

main();
