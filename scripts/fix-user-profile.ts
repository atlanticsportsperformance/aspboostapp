import { createClient } from '@supabase/supabase-js';

async function fixUserProfile() {
  console.log('🔧 Fixing User Profile\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('❌ Not authenticated. Please log in first.');
    console.log('\nRun this script while logged into your app.');
    return;
  }

  console.log(`✅ Authenticated as: ${user.email}\n`);
  console.log(`User ID: ${user.id}\n`);

  // Check if profile exists
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (existingProfile) {
    console.log('✅ Profile exists:\n');
    console.log(JSON.stringify(existingProfile, null, 2));
    console.log('\nNo fix needed!');
    return;
  }

  console.log('❌ Profile not found. Creating one...\n');

  // Create profile
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      app_role: 'super_admin', // Change this if needed
      org_id: null, // Will need to be set to an actual org
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Error creating profile:', createError);
    return;
  }

  console.log('✅ Profile created:\n');
  console.log(JSON.stringify(newProfile, null, 2));
  console.log('\n⚠️  IMPORTANT: You need to set org_id manually!');
  console.log('Run this SQL in Supabase Studio:\n');
  console.log(`UPDATE profiles SET org_id = '<your-org-id>' WHERE id = '${user.id}';`);
}

fixUserProfile();
