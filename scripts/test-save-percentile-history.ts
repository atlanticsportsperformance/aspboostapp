/**
 * Test saving percentile history for Thomas Daly
 */

import { createClient } from '@supabase/supabase-js';
import { saveTestPercentileHistory } from '../lib/vald/save-percentile-history';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSavePercentileHistory() {
  // Get Thomas Daly
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .eq('first_name', 'Thomas')
    .eq('last_name', 'Daly')
    .single();

  if (!athlete) {
    console.error('Thomas Daly not found');
    return;
  }

  console.log('Testing percentile history save for:', athlete.first_name, athlete.last_name);
  console.log('Play level:', athlete.play_level);

  // Get his CMJ test
  const { data: cmjTest } = await supabase
    .from('cmj_tests')
    .select('*')
    .eq('athlete_id', athlete.id)
    .single();

  if (!cmjTest) {
    console.error('No CMJ test found');
    return;
  }

  console.log('Found CMJ test:', cmjTest.test_id);
  console.log('Test date:', cmjTest.recorded_utc);

  // Try to save percentile history
  console.log('\nCalling saveTestPercentileHistory...\n');

  try {
    const success = await saveTestPercentileHistory(
      supabase,
      athlete.id,
      'CMJ',
      cmjTest.test_id,
      cmjTest,
      new Date(cmjTest.recorded_utc),
      athlete.play_level
    );

    console.log('\nResult:', success ? '✅ SUCCESS' : '❌ FAILED');

    // Check if it was saved
    const { data: history } = await supabase
      .from('athlete_percentile_history')
      .select('*')
      .eq('athlete_id', athlete.id)
      .eq('test_id', cmjTest.test_id);

    console.log('\nRows in athlete_percentile_history:', history?.length || 0);
    if (history && history.length > 0) {
      console.log('Play levels saved:', history.map(h => h.play_level));
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

testSavePercentileHistory().catch(console.error);
