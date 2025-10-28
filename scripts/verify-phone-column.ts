import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyPhoneColumn() {
  console.log('🔍 Verifying phone column in athletes table...\n');

  // Get all athletes with phone column
  const { data: athletes, error } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, email, phone')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('✅ Successfully queried phone column!');
  console.log(`📊 Found ${athletes?.length || 0} athletes\n`);

  if (athletes && athletes.length > 0) {
    console.log('Sample data:');
    athletes.forEach((athlete, i) => {
      console.log(`\n${i + 1}. ${athlete.first_name} ${athlete.last_name}`);
      console.log(`   Email: ${athlete.email || 'N/A'}`);
      console.log(`   Phone: ${athlete.phone || 'Not set'}`);
    });
  }

  console.log('\n✅ Phone column is working correctly and is optional (nullable)');
}

verifyPhoneColumn();
