import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentPRs() {
  console.log('🏆 Checking recent PRs in athlete_maxes...\n');

  const { data: prs, error } = await supabase
    .from('athlete_maxes')
    .select('id, athlete_id, exercise_id, metric_id, max_value, achieved_on, source, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!prs || prs.length === 0) {
    console.log('⚠️  No PRs found in athlete_maxes table');
    return;
  }

  console.log(`✅ Found ${prs.length} recent PRs:\n`);

  for (const pr of prs) {
    console.log(`PR ID: ${pr.id}`);
    console.log(`  Athlete: ${pr.athlete_id}`);
    console.log(`  Exercise: ${pr.exercise_id}`);
    console.log(`  Metric: ${pr.metric_id}`);
    console.log(`  Max Value: ${pr.max_value}`);
    console.log(`  Achieved: ${pr.achieved_on}`);
    console.log(`  Source: ${pr.source}`);
    console.log(`  Created: ${pr.created_at}\n`);
  }
}

checkRecentPRs().catch(console.error);
