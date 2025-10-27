import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBodyweightColumn() {
  const { data } = await serviceSupabase
    .from('cmj_tests')
    .select('*')
    .limit(1);

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]).filter(k =>
      k.includes('body') || k.includes('mass') || k.includes('weight')
    );
    console.log('Bodyweight-related columns:', columns);
    columns.forEach(col => {
      console.log(`  ${col}: ${data[0][col]}`);
    });
  }
}

checkBodyweightColumn();
