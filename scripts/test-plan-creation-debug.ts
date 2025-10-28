import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPlanCreation() {
  console.log('\n=== DEBUG: Plan Creation Issue ===\n');

  // 1. Check if we can get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('1. Current User:');
  if (userError) {
    console.log('   ERROR:', userError);
  } else if (!user) {
    console.log('   No user authenticated');
  } else {
    console.log('   ✓ User ID:', user.id);
    console.log('   ✓ Email:', user.email);
  }

  if (!user) {
    console.log('\nCannot proceed without authenticated user');
    return;
  }

  // 2. Check staff table structure
  console.log('\n2. Checking staff table:');
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (staffError) {
    console.log('   ERROR:', staffError);
  } else if (!staffData) {
    console.log('   No staff record found for user');
  } else {
    console.log('   ✓ Staff Record:', staffData);
  }

  // 3. Check profiles table for org info
  console.log('\n3. Checking profiles table:');
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.log('   ERROR:', profileError);
  } else if (!profileData) {
    console.log('   No profile found');
  } else {
    console.log('   ✓ Profile:', profileData);
  }

  // 4. Check training_plans table structure
  console.log('\n4. Checking training_plans table structure:');
  const { data: samplePlan, error: planError } = await supabase
    .from('training_plans')
    .select('*')
    .limit(1)
    .single();

  if (planError) {
    console.log('   ERROR:', planError);
  } else if (!samplePlan) {
    console.log('   No existing plans');
  } else {
    console.log('   ✓ Sample Plan columns:', Object.keys(samplePlan));
  }

  // 5. Try to determine the correct organization_id
  console.log('\n5. Determining organization_id:');
  if (profileData && 'organization_id' in profileData) {
    console.log('   ✓ Found organization_id in profiles:', profileData.organization_id);
  } else if (staffData && 'org_id' in staffData) {
    console.log('   ✓ Found org_id in staff:', staffData.org_id);
  } else if (profileData && 'org_id' in profileData) {
    console.log('   ✓ Found org_id in profiles:', (profileData as any).org_id);
  } else {
    console.log('   ✗ Could not find organization_id in any table');
    console.log('   Profile keys:', profileData ? Object.keys(profileData) : 'N/A');
    console.log('   Staff keys:', staffData ? Object.keys(staffData) : 'N/A');
  }

  console.log('\n=== END DEBUG ===\n');
}

debugPlanCreation().catch(console.error);
