import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findTablesWithCreatedBy() {
  const orphanedIds = [
    'b7cc4843-7506-462a-8bc7-da5057845a92',
    '41850383-10b6-4efe-a2e7-63a606f0885f',
    '13eb2baf-1a27-463c-9294-7cf700e06071'
  ];

  const tablesToCheck = [
    'training_plans',
    'routines',
    'workouts',
    'exercises',
    'groups',
    'athlete_workout_instances',
    'workout_instances',
    'plans',
  ];

  console.log('Checking which tables have created_by/assigned_by for orphaned users...\n');

  for (const table of tablesToCheck) {
    try {
      // Check created_by
      const { data: createdByData, error: createdByError } = await supabase
        .from(table)
        .select('id, created_by')
        .in('created_by', orphanedIds)
        .limit(5);

      if (!createdByError && createdByData && createdByData.length > 0) {
        console.log(`✓ ${table}.created_by: ${createdByData.length} records need nullification`);
      }

      // Check assigned_by
      const { data: assignedByData, error: assignedByError } = await supabase
        .from(table)
        .select('id, assigned_by')
        .in('assigned_by', orphanedIds)
        .limit(5);

      if (!assignedByError && assignedByData && assignedByData.length > 0) {
        console.log(`✓ ${table}.assigned_by: ${assignedByData.length} records need nullification`);
      }

    } catch (e: any) {
      // Table doesn't exist or doesn't have the column
      console.log(`⨯ ${table}: doesn't exist or no created_by/assigned_by column`);
    }
  }
}

findTablesWithCreatedBy().catch(console.error);
