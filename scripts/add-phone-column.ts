import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addPhoneColumn() {
  console.log('🔄 Adding phone column to athletes table...\n');

  try {
    // Add phone column to athletes table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE athletes
        ADD COLUMN IF NOT EXISTS phone TEXT;

        COMMENT ON COLUMN athletes.phone IS 'Optional contact phone number for athlete';
      `
    });

    if (error) {
      // If RPC doesn't exist, try direct query
      const { error: directError } = await supabase
        .from('athletes')
        .select('phone')
        .limit(1);

      if (directError && directError.message.includes('column "phone" does not exist')) {
        console.log('⚠️  Phone column does not exist. Please run the SQL migration manually in Supabase SQL Editor:');
        console.log('\n---SQL MIGRATION---');
        console.log('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS phone TEXT;');
        console.log('COMMENT ON COLUMN athletes.phone IS \'Optional contact phone number for athlete\';');
        console.log('-------------------\n');
        console.log('📋 Or use the SQL file: scripts/add-phone-column.sql');
        return;
      }
    }

    // Verify the column exists
    const { data: testData, error: testError } = await supabase
      .from('athletes')
      .select('id, phone')
      .limit(1);

    if (testError) {
      console.error('❌ Error verifying phone column:', testError.message);
      console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
      console.log('\nALTER TABLE athletes ADD COLUMN IF NOT EXISTS phone TEXT;');
      console.log('COMMENT ON COLUMN athletes.phone IS \'Optional contact phone number for athlete\';');
      return;
    }

    console.log('✅ Phone column successfully added to athletes table!');
    console.log('✅ Column is nullable (optional) as requested');
    console.log('\n📊 Test query result:', testData);

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
    console.log('\nALTER TABLE athletes ADD COLUMN IF NOT EXISTS phone TEXT;');
    console.log('COMMENT ON COLUMN athletes.phone IS \'Optional contact phone number for athlete\';');
  }
}

addPhoneColumn();
