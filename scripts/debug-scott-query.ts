import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const SCOTT_ID = 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f';

async function debug() {
  console.log(`Querying for athlete_id: ${SCOTT_ID}\n`);

  // Try different queries
  const { data: allRows, error: allError } = await supabase
    .from('athlete_percentile_history')
    .select('*');

  console.log(`Total rows in table: ${allRows?.length || 0}`);
  if (allError) console.log('Error:', allError);

  const { data: scottRows, error: scottError } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('athlete_id', SCOTT_ID);

  console.log(`\nRows for Scott (${SCOTT_ID}): ${scottRows?.length || 0}`);
  if (scottError) console.log('Error:', scottError);

  // Show all athlete IDs
  if (allRows) {
    const athleteIds = [...new Set(allRows.map(r => r.athlete_id))];
    console.log(`\nUnique athlete IDs in table (${athleteIds.length}):`);
    athleteIds.forEach(id => {
      const count = allRows.filter(r => r.athlete_id === id).length;
      console.log(`  ${id}: ${count} rows`);
    });
  }
}

debug().catch(console.error);
