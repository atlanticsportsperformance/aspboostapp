/**
 * Vercel Cron Job: Monthly Percentile Lookup Rebuild
 * Runs on the 1st of each month at 12:01 AM EST
 * Rebuilds percentile_lookup table from Driveline seed data + athlete contributions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📊 Starting monthly percentile lookup rebuild...');
    console.log(`Timestamp: ${new Date().toISOString()}`);

    const supabase = createServiceRoleClient();

    // Call the rebuild_percentile_lookup stored procedure
    console.log('Calling rebuild_percentile_lookup() stored procedure...');

    const { data: stats, error: rebuildError } = await supabase
      .rpc('rebuild_percentile_lookup');

    if (rebuildError) {
      console.error('Failed to rebuild percentile_lookup:', rebuildError);
      return NextResponse.json(
        { error: 'Failed to rebuild percentile_lookup', details: rebuildError.message },
        { status: 500 }
      );
    }

    console.log('✅ Rebuilt percentile_lookup table');

    // Group stats by metric and play level
    const summary: Record<string, Record<string, number>> = {};
    let totalRows = 0;

    stats?.forEach((row: any) => {
      if (!summary[row.out_metric_column]) {
        summary[row.out_metric_column] = {};
      }
      summary[row.out_metric_column][row.out_play_level] = parseInt(row.out_row_count);
      totalRows += parseInt(row.out_row_count);
    });

    console.log('\n📊 Rebuild summary:');
    console.log(`  Total rows inserted: ${totalRows}`);
    console.log('  Breakdown by metric and play level:');
    Object.entries(summary).forEach(([metric, levels]) => {
      console.log(`    ${metric}:`);
      Object.entries(levels).forEach(([level, count]) => {
        console.log(`      ${level}: ${count} rows`);
      });
    });

    return NextResponse.json({
      success: true,
      message: `Percentile lookup rebuilt successfully: ${totalRows} rows inserted`,
      timestamp: new Date().toISOString(),
      summary: {
        totalRows,
        breakdown: summary,
      },
    });
  } catch (err) {
    console.error('Monthly percentile rebuild error:', err);
    return NextResponse.json(
      {
        error: 'Failed to execute monthly percentile rebuild',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
