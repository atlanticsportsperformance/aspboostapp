import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingVeloMetrics() {
  console.log('🔍 Finding exercises with paired measurements...\n');

  // Get all routine exercises with metric_targets
  const { data: exercises, error } = await supabase
    .from('routine_exercises')
    .select('id, exercise_id, metric_targets, exercises(name)')
    .not('metric_targets', 'is', null);

  if (error || !exercises) {
    console.error('Error fetching exercises:', error);
    return;
  }

  console.log(`Found ${exercises.length} exercises with metric_targets\n`);

  // Paired measurements and their metrics
  const pairedMeasurements = [
    { name: 'red_ball', primary: 'red_ball_reps', secondary: 'red_ball_velo' },
    { name: 'blue_ball', primary: 'blue_ball_reps', secondary: 'blue_ball_velo' },
    { name: 'gray_ball', primary: 'gray_ball_reps', secondary: 'gray_ball_velo' },
    { name: 'green_ball', primary: 'green_ball_reps', secondary: 'green_ball_velo' },
    { name: 'yellow_ball', primary: 'yellow_ball_reps', secondary: 'yellow_ball_velo' },
  ];

  let updatedCount = 0;

  for (const ex of exercises) {
    const targets = ex.metric_targets as Record<string, any>;
    let needsUpdate = false;
    const updatedTargets = { ...targets };

    // Check each paired measurement
    for (const paired of pairedMeasurements) {
      // If primary exists but secondary doesn't, add it
      if (paired.primary in targets && !(paired.secondary in targets)) {
        console.log(`  ✏️ ${ex.exercises?.name || 'Unknown'} (${ex.id})`);
        console.log(`     Adding missing ${paired.secondary}`);
        updatedTargets[paired.secondary] = null;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      const { error: updateErr } = await supabase
        .from('routine_exercises')
        .update({ metric_targets: updatedTargets })
        .eq('id', ex.id);

      if (updateErr) {
        console.error(`     ❌ Error updating:`, updateErr);
      } else {
        console.log(`     ✅ Updated successfully`);
        updatedCount++;
      }
    }
  }

  console.log(`\n✅ Updated ${updatedCount} exercises with missing velo metrics`);
}

addMissingVeloMetrics();
