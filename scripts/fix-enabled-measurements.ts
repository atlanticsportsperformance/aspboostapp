import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEnabledMeasurements() {
  console.log('🔍 Finding exercises with corrupted enabled_measurements...\n');

  // Get all routine exercises
  const { data: exercises, error } = await supabase
    .from('routine_exercises')
    .select('id, enabled_measurements, exercises(name)')
    .not('enabled_measurements', 'is', null);

  if (error || !exercises) {
    console.error('Error fetching exercises:', error);
    return;
  }

  console.log(`Found ${exercises.length} exercises with enabled_measurements\n`);

  // Metric IDs that should NOT be in enabled_measurements (these are metric IDs, not measurement IDs)
  const metricIds = [
    'red_ball_reps', 'red_ball_velo',
    'blue_ball_reps', 'blue_ball_velo',
    'gray_ball_reps', 'gray_ball_velo',
    'green_ball_reps', 'green_ball_velo',
    'yellow_ball_reps', 'yellow_ball_velo',
    'baseball_4oz_reps', 'baseball_4oz_velo',
    'baseball_5oz_reps', 'baseball_5oz_velo',
    'baseball_6oz_reps', 'baseball_6oz_velo',
    'baseball_7oz_reps', 'baseball_7oz_velo',
  ];

  let updatedCount = 0;

  for (const ex of exercises) {
    const enabled = ex.enabled_measurements as string[];

    // Check if any metric IDs are in enabled_measurements
    const hasMetricIds = enabled.some(id => metricIds.includes(id));

    if (hasMetricIds) {
      // Remove all metric IDs, keep only measurement IDs
      const cleaned = enabled.filter(id => !metricIds.includes(id));

      console.log(`  ✏️ ${ex.exercises?.name || 'Unknown'} (${ex.id})`);
      console.log(`     Before: [${enabled.length}] ${enabled.slice(0, 5).join(', ')}...`);
      console.log(`     After:  [${cleaned.length}] ${cleaned.join(', ')}`);

      const { error: updateErr } = await supabase
        .from('routine_exercises')
        .update({ enabled_measurements: cleaned })
        .eq('id', ex.id);

      if (updateErr) {
        console.error(`     ❌ Error updating:`, updateErr);
      } else {
        console.log(`     ✅ Updated successfully\n`);
        updatedCount++;
      }
    }
  }

  console.log(`\n✅ Cleaned ${updatedCount} exercises`);
}

fixEnabledMeasurements();
