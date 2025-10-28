import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function explainPlayLevelImpact() {
  console.log('🔍 ANALYZING PLAY LEVEL IMPACT ON PERCENTILES AND DATA\n');
  console.log('=' .repeat(80));

  // Find Justin Willis
  const { data: athletes } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .ilike('first_name', '%justin%')
    .ilike('last_name', '%willis%');

  if (!athletes || athletes.length === 0) {
    console.log('❌ Could not find Justin Willis');
    return;
  }

  const justin = athletes[0];
  console.log(`\n📊 ATHLETE: ${justin.first_name} ${justin.last_name}`);
  console.log(`Current Play Level: ${justin.play_level}`);
  console.log(`Athlete ID: ${justin.id}\n`);

  // Check athlete_percentile_history table
  console.log('=' .repeat(80));
  console.log('1️⃣  ATHLETE_PERCENTILE_HISTORY TABLE');
  console.log('=' .repeat(80));
  console.log('This table stores HISTORICAL percentile rankings for each test.\n');

  const { data: history } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('athlete_id', justin.id)
    .order('test_date', { ascending: false })
    .limit(5);

  if (history && history.length > 0) {
    console.log(`Found ${history.length} historical records (showing 5 most recent):\n`);
    history.forEach((record, i) => {
      console.log(`${i + 1}. ${record.test_type} - ${record.metric_name}`);
      console.log(`   Test Date: ${new Date(record.test_date).toLocaleDateString()}`);
      console.log(`   Value: ${record.value}`);
      console.log(`   Play Level at time: ${record.play_level}`);
      console.log(`   Percentile vs ${record.play_level}: ${record.percentile_play_level}th`);
      console.log(`   Percentile vs Overall: ${record.percentile_overall}th`);
      console.log('');
    });

    console.log('⚠️  KEY INSIGHT: play_level column in this table is STORED AT TEST TIME');
    console.log('   - If Justin was "High School" when test was taken, play_level = "High School"');
    console.log('   - This is a SNAPSHOT of what his play level WAS');
    console.log('   - Changing his current play level does NOT update historical records\n');
  } else {
    console.log('No historical percentile data found\n');
  }

  // Check vald_tests table
  console.log('=' .repeat(80));
  console.log('2️⃣  VALD_TESTS TABLE');
  console.log('=' .repeat(80));
  console.log('This table stores RAW test data from VALD ForceDecks.\n');

  const { data: tests } = await supabase
    .from('vald_tests')
    .select('id, test_type, test_date, bodymass_relative_takeoff_power_trial_value, peak_takeoff_power_trial_value')
    .eq('athlete_id', justin.id)
    .order('test_date', { ascending: false })
    .limit(3);

  if (tests && tests.length > 0) {
    console.log(`Found ${tests.length} VALD tests (showing 3 most recent):\n`);
    tests.forEach((test, i) => {
      console.log(`${i + 1}. ${test.test_type} on ${new Date(test.test_date).toLocaleDateString()}`);
      console.log(`   Power/BM: ${test.bodymass_relative_takeoff_power_trial_value} W/kg`);
      console.log(`   Peak Power: ${test.peak_takeoff_power_trial_value} W`);
      console.log('');
    });

    console.log('⚠️  KEY INSIGHT: VALD tests contain NO play_level column');
    console.log('   - These are pure force plate measurements (watts, newtons, RSI, etc.)');
    console.log('   - The data itself is IMMUTABLE - it never changes');
    console.log('   - A 2500W jump is 2500W regardless of play level\n');
  } else {
    console.log('No VALD test data found\n');
  }

  // Check athlete_percentile_contributions table
  console.log('=' .repeat(80));
  console.log('3️⃣  ATHLETE_PERCENTILE_CONTRIBUTIONS TABLE');
  console.log('=' .repeat(80));
  console.log('This table stores the FORCE PROFILE composite score (used for dashboard).\n');

  const { data: contributions } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('athlete_id', justin.id)
    .order('test_date', { ascending: false })
    .limit(1);

  if (contributions && contributions.length > 0) {
    const latest = contributions[0];
    console.log('Latest Force Profile composite score:\n');
    console.log(`Test Date: ${new Date(latest.test_date).toLocaleDateString()}`);
    console.log(`Play Level: ${latest.play_level}`);
    console.log(`FORCE PROFILE Score: ${latest.composite_score}th percentile`);
    console.log(`\nMetric Breakdown:`);
    console.log(`  SJ Power/BM: ${latest.sj_bodymass_relative_takeoff_power_percentile}th (value: ${latest.sj_bodymass_relative_takeoff_power_value})`);
    console.log(`  SJ Peak Power: ${latest.sj_peak_takeoff_power_percentile}th (value: ${latest.sj_peak_takeoff_power_value})`);
    console.log(`  HJ RSI: ${latest.hop_mean_rsi_percentile}th (value: ${latest.hop_mean_rsi_value})`);
    console.log(`  PPU Force: ${latest.ppu_peak_takeoff_force_percentile}th (value: ${latest.ppu_peak_takeoff_force_value})`);
    console.log(`  IMTP Net Force: ${latest.net_peak_vertical_force_percentile}th (value: ${latest.net_peak_vertical_force_value})`);
    console.log(`  IMTP Relative: ${latest.relative_strength_percentile}th (value: ${latest.relative_strength_value})`);

    console.log('\n⚠️  KEY INSIGHT: play_level is stored here too');
    console.log('   - This composite score was calculated using his play level at sync time');
    console.log('   - Changing play level does NOT automatically recalculate this\n');
  } else {
    console.log('No Force Profile composite data found\n');
  }

  // Check percentile_lookup table
  console.log('=' .repeat(80));
  console.log('4️⃣  PERCENTILE_LOOKUP TABLE (Reference Data)');
  console.log('=' .repeat(80));
  console.log('This table contains Driveline\'s percentile thresholds for all play levels.\n');

  // Get a sample metric to show difference between play levels
  const { data: highSchoolThresholds } = await supabase
    .from('percentile_lookup')
    .select('percentile, value')
    .eq('metric_column', 'sj_bodymass_relative_takeoff_power_trial_value')
    .eq('play_level', 'High School')
    .in('percentile', [25, 50, 75, 90])
    .order('percentile');

  const { data: collegeThresholds } = await supabase
    .from('percentile_lookup')
    .select('percentile, value')
    .eq('metric_column', 'sj_bodymass_relative_takeoff_power_trial_value')
    .eq('play_level', 'College')
    .in('percentile', [25, 50, 75, 90])
    .order('percentile');

  console.log('Example: SJ Power/BM (W/kg) percentile thresholds:\n');
  console.log('High School:');
  highSchoolThresholds?.forEach(t => {
    console.log(`  ${t.percentile}th percentile: ${t.value} W/kg`);
  });

  console.log('\nCollege:');
  collegeThresholds?.forEach(t => {
    console.log(`  ${t.percentile}th percentile: ${t.value} W/kg`);
  });

  console.log('\n⚠️  KEY INSIGHT: Different play levels have different thresholds');
  console.log('   - A value that is 75th percentile in High School might only be 50th in College');
  console.log('   - This is because college athletes are generally stronger/more explosive\n');

  // SUMMARY
  console.log('=' .repeat(80));
  console.log('📋 SUMMARY: WHAT HAPPENS WHEN YOU CHANGE PLAY LEVEL?');
  console.log('=' .repeat(80));
  console.log('\n✅ WHAT CHANGES DYNAMICALLY:\n');
  console.log('1. Current play_level in athletes table → Updates immediately');
  console.log('2. Future VALD syncs → Will use new play level for percentile calculations');
  console.log('3. New test percentiles → Will be ranked against new play level');
  console.log('4. API calls that calculate percentiles → Will use new thresholds\n');

  console.log('❌ WHAT STAYS LOCKED (Historical Data):\n');
  console.log('1. athlete_percentile_history rows → Keep old play_level snapshot');
  console.log('2. vald_tests data → Raw measurements never change (2500W is 2500W)');
  console.log('3. athlete_percentile_contributions → Keeps composite score from last sync');
  console.log('4. Historical charts → Will show old percentiles until re-synced\n');

  console.log('🔄 TO UPDATE HISTORICAL PERCENTILES:\n');
  console.log('1. Change Justin\'s play_level in athletes table (High School → College)');
  console.log('2. Click the VALD sync button (30d or 180d)');
  console.log('3. System will:');
  console.log('   a. Read raw test data from vald_tests (values unchanged)');
  console.log('   b. Look up athlete\'s CURRENT play_level (now College)');
  console.log('   c. Recalculate percentiles using College thresholds');
  console.log('   d. Update athlete_percentile_history with new percentiles');
  console.log('   e. Update athlete_percentile_contributions with new composite score\n');

  console.log('=' .repeat(80));
}

explainPlayLevelImpact();
