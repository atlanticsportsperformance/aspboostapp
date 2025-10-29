import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedViewTypes() {
  console.log('🌱 Seeding athlete view types...\n');

  const orgId = 'f5b702a1-7c8a-4c67-99f2-ef466cbbfb40';

  // Check if view types already exist for this org
  const { data: existing } = await supabase
    .from('athlete_view_types')
    .select('*')
    .eq('org_id', orgId);

  console.log(`Found ${existing?.length || 0} existing view types for org ${orgId}\n`);

  if (existing && existing.length > 0) {
    console.log('View types already exist:');
    existing.forEach(vt => console.log(`  - ${vt.name}`));
    console.log('\nSkipping seed (already seeded).');
    return;
  }

  // Insert the 4 default view types
  const viewTypes = [
    {
      name: 'Two Way Performance',
      description: 'Athletes training for both hitting and pitching',
      display_order: 1,
      org_id: orgId,
      is_active: true
    },
    {
      name: 'Hitting Performance',
      description: 'Athletes focused on hitting development',
      display_order: 2,
      org_id: orgId,
      is_active: true
    },
    {
      name: 'Pitching Performance',
      description: 'Athletes focused on pitching development',
      display_order: 3,
      org_id: orgId,
      is_active: true
    },
    {
      name: 'Athlete Strength + Conditioning',
      description: 'General strength and conditioning athletes',
      display_order: 4,
      org_id: orgId,
      is_active: true
    }
  ];

  console.log('Inserting view types...\n');

  const { data, error } = await supabase
    .from('athlete_view_types')
    .insert(viewTypes)
    .select();

  if (error) {
    console.error('❌ Error inserting view types:', error);
    return;
  }

  console.log('✅ Successfully inserted view types:\n');
  data?.forEach(vt => {
    console.log(`  ${vt.display_order}. ${vt.name}`);
    console.log(`     ${vt.description}`);
    console.log(`     ID: ${vt.id}\n`);
  });

  console.log('🎉 Seeding complete!');
}

seedViewTypes().catch(console.error);
