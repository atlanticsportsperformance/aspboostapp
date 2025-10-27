/**
 * Find Thomas Daly's percentile history rows
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findRows() {
  // Get Thomas Daly's ID
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, first_name, last_name')
    .eq('first_name', 'Thomas')
    .eq('last_name', 'Daly')
    .single();

  if (!athlete) {
    console.error('Thomas Daly not found');
    return;
  }

  console.log(`Thomas Daly ID: ${athlete.id}`);

  // Get ALL rows for this athlete (no filters)
  const { data: allRows } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('athlete_id', athlete.id)
    .order('created_at', { ascending: false });

  console.log(`\nTotal rows for Thomas: ${allRows?.length || 0}`);

  if (allRows && allRows.length > 0) {
    console.log('\nAll rows:');
    allRows.forEach((row, i) => {
      console.log(`${i + 1}. test_id=${row.test_id}, test_type=${row.test_type}, play_level=${row.play_level}, created_at=${row.created_at}`);
    });
  }

  // Also check for the specific test ID we just inserted
  const testId = '7dbb0ab4-6c17-4899-849a-356a2f49e982';
  const { data: specificRows } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('test_id', testId);

  console.log(`\n\nRows for test_id ${testId}: ${specificRows?.length || 0}`);
  if (specificRows && specificRows.length > 0) {
    specificRows.forEach((row, i) => {
      console.log(`${i + 1}. athlete_id=${row.athlete_id}, play_level=${row.play_level}`);
    });
  }
}

findRows().catch(console.error);
