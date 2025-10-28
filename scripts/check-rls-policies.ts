import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

// Test with BOTH service role (bypasses RLS) and anon key (respects RLS)
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkRLS() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           RLS POLICY DIAGNOSTIC                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 1. Test with service role (should return all records)
  console.log('1️⃣  SERVICE ROLE CLIENT (bypasses RLS):');
  const { data: serviceStaff, error: serviceError } = await serviceClient
    .from('staff')
    .select('id, user_id, role');

  console.log(`   Staff count: ${serviceStaff?.length || 0}`);
  if (serviceError) console.log('   Error:', serviceError);

  // 2. Test with anon key + no auth (should fail or return 0)
  console.log('\n2️⃣  ANON CLIENT WITHOUT AUTH (respects RLS):');
  const { data: anonStaff, error: anonError } = await anonClient
    .from('staff')
    .select('id, user_id, role');

  console.log(`   Staff count: ${anonStaff?.length || 0}`);
  if (anonError) console.log('   Error:', anonError.message);

  // 3. Test with anon key + Mike Johnson's auth
  console.log('\n3️⃣  ANON CLIENT AS MIKE JOHNSON (owner@elitebaseball.com):');
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: 'owner@elitebaseball.com',
    password: 'password123'
  });

  if (signInError) {
    console.log('   ❌ Failed to sign in:', signInError.message);
  } else {
    console.log('   ✅ Signed in successfully');

    const { data: mikeStaff, error: mikeError } = await anonClient
      .from('staff')
      .select('id, user_id, role');

    console.log(`   Staff count: ${mikeStaff?.length || 0}`);
    if (mikeError) console.log('   Error:', mikeError.message);

    if (mikeStaff && mikeStaff.length === 0) {
      console.log('   🔴 RLS IS BLOCKING ACCESS - This is the problem!');
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           DIAGNOSTIC COMPLETE                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

checkRLS();
