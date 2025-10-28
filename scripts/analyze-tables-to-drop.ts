import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeTables() {
  const tablesToCheck = [
    'crm_notes',
    'crm_tasks',
    'documents',
    'contacts',
    'events_attendees',
  ];

  console.log('=== DETAILED ANALYSIS OF TABLES TO DROP ===\n');

  for (const table of tablesToCheck) {
    console.log(`\n📊 TABLE: ${table}`);
    console.log('─'.repeat(60));

    try {
      // Get total count
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      console.log(`Total records: ${count || 0}`);

      if (count && count > 0) {
        // Get all data
        const { data } = await supabase
          .from(table)
          .select('*')
          .limit(100);

        console.log(`\nAll ${count} records:`);
        data?.forEach((record: any, index: number) => {
          console.log(`\nRecord ${index + 1}:`);
          console.log(JSON.stringify(record, null, 2));

          // Check if created by orphaned users
          if (record.created_by) {
            const orphanedIds = [
              'b7cc4843-7506-462a-8bc7-da5057845a92',
              '41850383-10b6-4efe-a2e7-63a606f0885f',
              '13eb2baf-1a27-463c-9294-7cf700e06071'
            ];
            if (orphanedIds.includes(record.created_by)) {
              console.log('⚠️  Created by ORPHANED user (test data)');
            } else {
              console.log('✓ Created by REAL user');
            }
          }

          if (record.assignee_user_id) {
            const orphanedIds = [
              'b7cc4843-7506-462a-8bc7-da5057845a92',
              '41850383-10b6-4efe-a2e7-63a606f0885f',
              '13eb2baf-1a27-463c-9294-7cf700e06071'
            ];
            if (orphanedIds.includes(record.assignee_user_id)) {
              console.log('⚠️  Assigned to ORPHANED user (test data)');
            }
          }
        });

        // Check if any record NOT created by orphaned users
        const realData = data?.filter((record: any) => {
          const orphanedIds = [
            'b7cc4843-7506-462a-8bc7-da5057845a92',
            '41850383-10b6-4efe-a2e7-63a606f0885f',
            '13eb2baf-1a27-463c-9294-7cf700e06071'
          ];
          return record.created_by && !orphanedIds.includes(record.created_by);
        });

        if (realData && realData.length > 0) {
          console.log(`\n⚠️  WARNING: ${realData.length} records created by REAL users!`);
          console.log('❌ DO NOT DROP - Contains real data');
        } else {
          console.log('\n✓ Safe to drop - All records are test data');
        }
      } else {
        console.log('✓ Safe to drop - Empty table');
      }

    } catch (e: any) {
      console.log(`Error: ${e.message}`);
    }
  }

  console.log('\n\n=== SUMMARY ===');
  console.log('Review the output above to confirm which tables are safe to drop.');
}

analyzeTables().catch(console.error);
