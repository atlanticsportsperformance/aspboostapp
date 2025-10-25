const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://tadqnotafpeasaevofjc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZHFub3RhZnBlYXNhZXZvZmpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc4MDQ3NSwiZXhwIjoyMDc2MzU2NDc1fQ.voO4qnBRdfAXVM92zsGjpKb8hbTV-zVmAGvK5-nLCUo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running exercise_tags migration...\n');

  const sql = fs.readFileSync('supabase/migrations/20251025000000_create_exercise_tags.sql', 'utf8');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      console.error('❌ Migration failed:', error);

      // Try running it in parts if exec_sql doesn't exist
      console.log('\n⚠️  Trying alternative method...\n');

      // Create table
      const { error: createError } = await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS exercise_tags (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name text NOT NULL,
            category text NOT NULL CHECK (category IN ('throwing', 'hitting', 'strength_conditioning')),
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            UNIQUE(name, category)
          );
        `
      });

      if (createError) {
        console.log('⚠️  Please run the migration manually in Supabase SQL Editor:');
        console.log('https://supabase.com/dashboard/project/tadqnotafpeasaevofjc/sql');
        console.log('\n--- Copy and paste this SQL: ---\n');
        console.log(sql);
        return;
      }
    }

    console.log('✅ Migration completed successfully!');

    // Verify the table was created
    const { data: tags, error: selectError } = await supabase
      .from('exercise_tags')
      .select('*')
      .limit(5);

    if (!selectError) {
      console.log(`\n✅ Table created! Found ${tags?.length || 0} tags migrated.`);
      if (tags && tags.length > 0) {
        console.log('\nSample tags:');
        tags.forEach(tag => {
          console.log(`  - ${tag.name} (${tag.category})`);
        });
      }
    }

  } catch (err) {
    console.error('❌ Error:', err);
    console.log('\n⚠️  Please run the migration manually in Supabase SQL Editor.');
  }
}

runMigration();
