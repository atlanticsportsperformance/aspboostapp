// Hitting Dashboard - Display Blast Motion Data
// Route: /dashboard/hitting

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { HittingDashboard } from '@/components/dashboard/hitting/hitting-dashboard';

export default async function HittingPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  // Only allow coaches, admins, and super_admins
  if (!['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Hitting Dashboard</h1>
        <p className="text-gray-600 mt-2">
          View Blast Motion swing data for your athletes
        </p>
      </div>

      <HittingDashboard orgId={profile.org_id} />
    </div>
  );
}
