import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryAll() {
  const { data } = await supabase
    .from('percentile_lookup')
    .select('*')
    .limit(20);

  console.log('Sample rows from percentile_lookup:');
  console.log(JSON.stringify(data, null, 2));

  // Get count per metric_column
  const { data: all } = await supabase
    .from('percentile_lookup')
    .select('metric_column, play_level');

  const counts: Record<string, Record<string, number>> = {};
  all?.forEach(row => {
    if (!counts[row.metric_column]) counts[row.metric_column] = {};
    counts[row.metric_column][row.play_level] = (counts[row.metric_column][row.play_level] || 0) + 1;
  });

  console.log('\n\nRows per metric per play level:');
  Object.entries(counts).forEach(([metric, playLevels]) => {
    console.log(`\n${metric}:`);
    Object.entries(playLevels).forEach(([level, count]) => {
      console.log(`  ${level}: ${count} rows`);
    });
  });
}

queryAll().catch(console.error);
