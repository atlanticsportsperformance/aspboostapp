// Check what enum values exist for relationships.relation column
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRelationEnum() {
  console.log('🔍 Checking relationships table schema...\n');

  // Try to get enum values by querying pg_enum
  const { data: enumData, error: enumError } = await supabase.rpc('get_enum_values', {
    enum_name: 'relation_type'
  }).catch(() => ({ data: null, error: null }));

  if (enumData) {
    console.log('✅ Found relation_type enum values:', enumData);
  }

  // Check existing relationships to see what values are used
  const { data: relationships, error: relError } = await supabase
    .from('relationships')
    .select('relation')
    .limit(20);

  if (relError) {
    console.error('❌ Error querying relationships:', relError);
  } else {
    console.log('\n📋 Existing relation values in use:');
    const uniqueRelations = [...new Set(relationships?.map(r => r.relation) || [])];
    uniqueRelations.forEach(rel => console.log(`  - ${rel}`));
  }

  // Try inserting with different values to see which works
  console.log('\n🧪 Testing possible enum values...');

  const testValues = ['self', 'Self', 'athlete', 'Athlete', 'primary', 'Primary'];

  for (const testValue of testValues) {
    const { error } = await supabase
      .from('relationships')
      .insert({
        org_id: null,
        contact_a_id: '00000000-0000-0000-0000-000000000000', // Fake ID
        athlete_id: '00000000-0000-0000-0000-000000000000', // Fake ID
        relation: testValue,
      });

    if (error) {
      if (error.message.includes('invalid input value')) {
        console.log(`  ❌ "${testValue}" - INVALID`);
      } else if (error.message.includes('foreign key') || error.message.includes('violates')) {
        console.log(`  ✅ "${testValue}" - VALID (enum accepted, failed on FK constraint)`);
      } else {
        console.log(`  ⚠️  "${testValue}" - ${error.message}`);
      }
    } else {
      console.log(`  ✅ "${testValue}" - VALID (inserted successfully)`);
      // Clean up test record
      await supabase
        .from('relationships')
        .delete()
        .eq('relation', testValue)
        .eq('contact_a_id', '00000000-0000-0000-0000-000000000000');
    }
  }
}

checkRelationEnum().catch(console.error);
