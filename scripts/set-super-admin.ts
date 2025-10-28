import { createClient } from '@supabase/supabase-js';

async function setSuperAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const email = 'info@atlanticperformancetraining.com';

  console.log(`Setting ${email} as super_admin...`);

  // Update the profile to super_admin role
  const { data, error } = await supabase
    .from('profiles')
    .update({ app_role: 'super_admin' })
    .eq('email', email)
    .select();

  if (error) {
    console.error('❌ Error updating profile:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error(`❌ No profile found with email: ${email}`);
    console.log('\nMake sure you have created an account with this email first!');
    process.exit(1);
  }

  console.log('✅ Successfully set as super_admin!');
  console.log('Updated profile:', data[0]);
  console.log('\n🎉 You now have full unrestricted access to the platform!');
}

setSuperAdmin();
