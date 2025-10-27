import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findScott() {
  const { data } = await supabase
    .from('athletes')
    .select('*')
    .or('first_name.ilike.%scott%,last_name.ilike.%scott%,first_name.ilike.%blew%,last_name.ilike.%blew%');

  console.log('Scott search results:');
  console.log(JSON.stringify(data, null, 2));
}

findScott().catch(console.error);
