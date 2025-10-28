/**
 * Check the schema of percentile_metric_mappings table
 */

import { createClient } from '@supabase/supabase-js';

async function checkMappingsSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking percentile_metric_mappings schema...\n');

  const { data: mappings } = await supabase
    .from('percentile_metric_mappings')
    .select('*')
    .limit(5);

  if (!mappings || mappings.length === 0) {
    console.error('❌ No mappings found');
    return;
  }

  console.log(`📊 Sample row from percentile_metric_mappings:\n`);
  console.log(JSON.stringify(mappings[0], null, 2));

  console.log(`\n📋 All columns in percentile_metric_mappings:\n`);
  Object.keys(mappings[0]).forEach(key => {
    console.log(`   - ${key}: ${mappings[0][key]}`);
  });

  console.log(`\n📊 All mappings:\n`);
  mappings.forEach(mapping => {
    console.log(`${mapping.test_type} - ${mapping.metric_name}:`);
    Object.keys(mapping).forEach(key => {
      if (key !== 'id' && key !== 'created_at') {
        console.log(`   ${key}: ${mapping[key]}`);
      }
    });
    console.log('');
  });
}

checkMappingsSchema().catch(console.error);
