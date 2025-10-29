import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillMetricTargets() {
  console.log('\n🔧 BACKFILLING METRIC_TARGETS FROM SET_CONFIGURATIONS\n');

  // Get ALL routine_exercises that have set_configurations but NULL/empty metric_targets
  const { data: exercises, error } = await supabase
    .from('routine_exercises')
    .select('id, set_configurations, metric_targets, exercises(name)')
    .not('set_configurations', 'is', null);

  if (error) {
    console.error('❌ Error fetching exercises:', error);
    return;
  }

  console.log(`📋 Found ${exercises?.length || 0} exercises with set_configurations\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const exercise of exercises || []) {
    // Check if metric_targets is already populated
    const hasMetricTargets = exercise.metric_targets && Object.keys(exercise.metric_targets).length > 0;

    if (hasMetricTargets) {
      console.log(`⏭️  SKIP: ${exercise.exercises?.name || 'Unknown'} - already has metric_targets`);
      skippedCount++;
      continue;
    }

    // Extract metrics from set_configurations
    const extractedMetrics: Record<string, any> = {};
    if (Array.isArray(exercise.set_configurations)) {
      exercise.set_configurations.forEach((setConfig: any) => {
        if (setConfig.metric_values) {
          Object.entries(setConfig.metric_values).forEach(([key, value]) => {
            // Use first non-empty value found for each metric
            if (value && !extractedMetrics[key]) {
              extractedMetrics[key] = value;
            }
          });
        }
      });
    }

    if (Object.keys(extractedMetrics).length === 0) {
      console.log(`⚠️  WARN: ${exercise.exercises?.name || 'Unknown'} - set_configurations has no metric_values`);
      continue;
    }

    console.log(`✅ FIX: ${exercise.exercises?.name || 'Unknown'}`);
    console.log(`   Extracted metrics:`, extractedMetrics);

    // Update the exercise with extracted metric_targets
    const { error: updateError } = await supabase
      .from('routine_exercises')
      .update({ metric_targets: extractedMetrics })
      .eq('id', exercise.id);

    if (updateError) {
      console.error(`   ❌ Error updating:`, updateError);
    } else {
      console.log(`   ✅ Updated successfully`);
      fixedCount++;
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ Fixed: ${fixedCount} exercises`);
  console.log(`⏭️  Skipped: ${skippedCount} exercises (already had metric_targets)`);
  console.log(`${'='.repeat(80)}\n`);
}

backfillMetricTargets()
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
