import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUnusedTables() {
  const tablesToCheck = [
    'crm_notes',
    'crm_tasks',
    'documents',
    'contacts',
    'events',
    'events_attending',
    'events_attendees',
  ];

  console.log('Checking if tables exist and have data...\n');

  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(5);

      if (error) {
        console.log(`❌ ${table}: Does not exist or error - ${error.message}`);
      } else {
        console.log(`✓ ${table}: EXISTS with ${count || 0} records`);
        if (count && count > 0) {
          console.log(`   Sample:`, data?.[0]);
        }
      }
    } catch (e: any) {
      console.log(`❌ ${table}: Error - ${e.message}`);
    }
  }

  console.log('\n=== Recommendation ===');
  console.log('Tables with 0 records can be safely dropped.');
  console.log('Tables with data should be reviewed before dropping.');
}

checkUnusedTables().catch(console.error);
