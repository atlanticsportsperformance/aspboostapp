import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getColumns() {
  const { data } = await supabase
    .from('percentile_lookup')
    .select('metric_column')
    .not('value', 'is', null);

  const unique = [...new Set(data?.map(r => r.metric_column))].sort();

  console.log(`Metrics with actual percentile data (${unique.length} total):\n`);
  unique.forEach(m => console.log(`  ${m}`));
}

getColumns().catch(console.error);
