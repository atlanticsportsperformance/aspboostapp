const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHJData() {
  console.log('=== CHECKING HJ (HOP TEST) DATA ===\n');

  // 1. Check HJ contributions
  const { data: hjContributions } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('test_type', 'HJ')
    .eq('playing_level', 'Youth');

  console.log(`1. HJ CONTRIBUTIONS: ${hjContributions?.length || 0}\n`);

  if (hjContributions && hjContributions.length > 0) {
    hjContributions.forEach((c, idx) => {
      console.log(`   Contribution ${idx + 1}:`);
      console.log(`      Athlete: ${c.athlete_id.substring(0, 8)}...`);
      console.log(`      Test Date: ${c.test_date}`);
      console.log(`      RSI Value: ${c.hop_mean_rsi_trial_value}`);
      console.log('');
    });
  } else {
    console.log('   ❌ NO HJ CONTRIBUTIONS FOUND!\n');
    return;
  }

  // 2. Check HJ percentiles in lookup table
  const { data: hjPercentiles } = await supabase
    .from('percentile_lookup')
    .select('*')
    .eq('metric_column', 'hop_mean_rsi_trial_value')
    .eq('play_level', 'Youth');

  console.log(`2. HJ PERCENTILES IN LOOKUP: ${hjPercentiles?.length || 0}\n`);

  if (!hjPercentiles || hjPercentiles.length === 0) {
    console.log('   ❌ NO HJ PERCENTILES IN LOOKUP TABLE!\n');
    console.log('   This means the calculate-youth-percentiles.sql script');
    console.log('   either hasn\'t been run yet, or there was an error\n');
  } else {
    console.log('   Sample percentiles:');
    hjPercentiles.slice(0, 5).forEach(p => {
      console.log(`      Value: ${p.value}, Percentile: ${p.percentile}, Count: ${p.total_count}`);
    });
    console.log('');
  }

  // 3. Summary
  console.log('=== SUMMARY ===\n');
  console.log(`HJ Contributions: ${hjContributions?.length || 0}`);
  console.log(`HJ Percentiles: ${hjPercentiles?.length || 0}`);
  console.log('');

  if (hjContributions?.length > 0 && (!hjPercentiles || hjPercentiles.length === 0)) {
    console.log('❌ ISSUE: Contributions exist but no percentiles calculated');
    console.log('');
    console.log('SOLUTION:');
    console.log('Run the calculate-youth-percentiles.sql script again.');
    console.log('The HJ section may have had an error.');
  }
}

checkHJData().catch(console.error);
