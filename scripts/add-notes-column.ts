import { createClient } from '@supabase/supabase-js';

async function addNotesColumn() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Adding notes column to athletes table...');

  const { error } = await supabase.rpc('exec_sql', {
    sql_query: `
      ALTER TABLE athletes
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `
  });

  if (error) {
    // If RPC doesn't exist, try direct query
    const { error: directError } = await supabase
      .from('athletes')
      .select('notes')
      .limit(1);

    if (directError && directError.message.includes('column "notes" does not exist')) {
      console.error('❌ Notes column does not exist. Please run this SQL manually in Supabase dashboard:');
      console.log('\nALTER TABLE athletes ADD COLUMN IF NOT EXISTS notes TEXT;\n');
    } else if (!directError) {
      console.log('✅ Notes column already exists!');
    } else {
      console.error('Error checking notes column:', directError);
    }
  } else {
    console.log('✅ Notes column added successfully!');
  }
}

addNotesColumn();
