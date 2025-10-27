/**
 * Check what metrics are available for Pro level
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Checking Metrics Available by Play Level\n');

  const playLevels = ['Youth', 'High School', 'College', 'Pro'];

  for (const level of playLevels) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${level.toUpperCase()}`);
    console.log('='.repeat(60));

    const { data: metrics } = await supabase
      .from('percentile_lookup')
      .select('metric_column')
      .eq('play_level', level);

    if (!metrics || metrics.length === 0) {
      console.log(`❌ NO DATA for ${level}`);
      continue;
    }

    const uniqueMetrics = [...new Set(metrics.map(m => m.metric_column))];
    console.log(`Total unique metrics: ${uniqueMetrics.length}\n`);

    // Group by test type
    const cmjMetrics = uniqueMetrics.filter(m => m.includes('jump') || m.includes('concentric') || m.includes('eccentric') || m.includes('landing'));
    const imtpMetrics = uniqueMetrics.filter(m => m.includes('peak_force') && !m.includes('push'));
    const ppuMetrics = uniqueMetrics.filter(m => m.includes('push'));
    const other = uniqueMetrics.filter(m =>
      !cmjMetrics.includes(m) &&
      !imtpMetrics.includes(m) &&
      !ppuMetrics.includes(m)
    );

    if (cmjMetrics.length > 0) {
      console.log('CMJ/SJ/HJ Metrics:');
      cmjMetrics.forEach(m => console.log(`  - ${m}`));
      console.log();
    }

    if (imtpMetrics.length > 0) {
      console.log('IMTP Metrics:');
      imtpMetrics.forEach(m => console.log(`  - ${m}`));
      console.log();
    }

    if (ppuMetrics.length > 0) {
      console.log('PPU Metrics:');
      ppuMetrics.forEach(m => console.log(`  - ${m}`));
      console.log();
    }

    if (other.length > 0) {
      console.log('Other Metrics:');
      other.forEach(m => console.log(`  - ${m}`));
      console.log();
    }

    // Get count for each metric
    const { data: counts } = await supabase.rpc('execute_sql', {
      query: `
        SELECT metric_column, COUNT(*) as count
        FROM percentile_lookup
        WHERE play_level = '${level}'
        GROUP BY metric_column
        ORDER BY metric_column
      `
    }).then(async () => {
      // If RPC doesn't exist, do it the manual way
      const results: Record<string, number> = {};
      for (const metric of uniqueMetrics) {
        const { count } = await supabase
          .from('percentile_lookup')
          .select('*', { count: 'exact', head: true })
          .eq('play_level', level)
          .eq('metric_column', metric);
        if (count) results[metric] = count;
      }
      return { data: Object.entries(results).map(([k, v]) => ({ metric_column: k, count: v })) };
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Analysis Complete\n');
}

main().catch(console.error);
