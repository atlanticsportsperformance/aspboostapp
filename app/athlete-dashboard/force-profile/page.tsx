'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ForceOverviewSection from '@/components/dashboard/athletes/force-profile/force-overview-section';

export default function AthleteForceProfilePage() {
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
          router.push('/athlete-dashboard');
          return;
        }

        setAthleteId(athlete.id);
        setAthleteName(`${athlete.first_name} ${athlete.last_name}`);
      } catch (err) {
        console.error('Error loading athlete:', err);
        router.push('/athlete-dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadAthlete();
  }, [router]);

  const handleNavigateToTest = (testType: 'cmj' | 'sj' | 'hj' | 'ppu' | 'imtp') => {
    router.push(`/athlete-dashboard/tests/${testType}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading force profile...</p>
        </div>
      </div>
    );
  }

  if (!athleteId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Force Profile</h1>
            <p className="text-sm text-gray-400">{athleteName}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        <ForceOverviewSection
          athleteId={athleteId}
          isFullscreen={false}
          onNavigateToTest={handleNavigateToTest}
        />
      </div>
    </div>
  );
}
