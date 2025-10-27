import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkMetrics() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('percentile_lookup')
    .select('metric_column, play_level, percentile, value')
    .eq('percentile', 50)
    .order('metric_column')
    .order('play_level');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('All 50th percentile rows:\n');

  let currentMetric = '';
  for (const row of data || []) {
    if (row.metric_column !== currentMetric) {
      currentMetric = row.metric_column;
      console.log(`\n📊 ${currentMetric}`);
      console.log('='.repeat(80));
    }
    console.log(`  ${row.play_level.padEnd(15)}: ${row.value?.toFixed(2) ?? 'NULL'}`);
  }
}

checkMetrics();
