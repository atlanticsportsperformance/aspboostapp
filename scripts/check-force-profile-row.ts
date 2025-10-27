import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkForceProfile() {
  const { data: allRows } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .order('created_at', { ascending: false });

  console.log(`Total rows: ${allRows?.length}`);

  const forceProfileRows = allRows?.filter(r => r.test_type === 'FORCE_PROFILE');
  console.log(`\nFORCE_PROFILE rows: ${forceProfileRows?.length}`);

  if (forceProfileRows && forceProfileRows.length > 0) {
    forceProfileRows.forEach(row => {
      console.log(`\n  Athlete: ${row.athlete_id}`);
      console.log(`  Play Level: ${row.play_level}`);
      console.log(`  composite_score_play_level: ${row.composite_score_play_level}`);
      console.log(`  composite_score_overall: ${row.composite_score_overall}`);
      console.log(`  test_id: ${row.test_id}`);
    });
  } else {
    console.log('\n❌ No FORCE_PROFILE rows found!');
  }

  // Show row counts by test_type
  const typeCounts: Record<string, number> = {};
  allRows?.forEach(r => {
    typeCounts[r.test_type] = (typeCounts[r.test_type] || 0) + 1;
  });

  console.log('\n=== Rows by test_type ===');
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
}

checkForceProfile().catch(console.error);
