'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AthleteDashboardView from '@/components/dashboard/athletes/athlete-dashboard-view';

export default function AthleteDashboardPage() {
  const router = useRouter();
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAthlete() {
      try {
        const supabase = createClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push('/athlete-login');
          return;
        }

        // Get athlete profile linked to this user
        const { data: athlete, error: athleteError } = await supabase
          .from('athletes')
          .select('id, first_name, last_name')
          .eq('user_id', user.id)
          .single();

        if (athleteError || !athlete) {
          console.error('Failed to load athlete profile:', athleteError);
          router.push('/athlete-login');
          return;
        }

        setAthleteId(athlete.id);
        setAthleteName(`${athlete.first_name} ${athlete.last_name}`);
      } catch (err) {
        console.error('Error loading athlete:', err);
        router.push('/athlete-login');
      } finally {
        setLoading(false);
      }
    }

    loadAthlete();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!athleteId) {
    return null;
  }

  return <AthleteDashboardView athleteId={athleteId} fullName={athleteName} />;
}
