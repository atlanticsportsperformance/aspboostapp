'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { MaxTrackerPanel } from '@/components/dashboard/athletes/max-tracker-panel';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
}

interface Athlete {
  id: string;
  user_id: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  grad_year: number | null;
  is_active: boolean;
  created_at: string;
}

export default function PersonalRecordsPage() {
  const router = useRouter();
  const params = useParams();
  const athleteId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function fetchAthleteData() {
      const supabase = createClient();

      // Get athlete
      const { data: athleteData, error: athleteError } = await supabase
        .from('athletes')
        .select('*')
        .eq('id', athleteId)
        .single();

      if (athleteError || !athleteData) {
        console.error('Athlete not found:', athleteError);
        router.push('/dashboard/athletes');
        return;
      }

      setAthlete(athleteData);

      // Get profile if user_id exists
      if (athleteData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', athleteData.user_id)
          .single();

        setProfile(profileData);
      }

      setLoading(false);
    }

    fetchAthleteData();
  }, [athleteId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading personal records...</p>
        </div>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-400">Athlete not found</p>
        </div>
      </div>
    );
  }

  const fullName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : `Athlete #${athlete.id.slice(0, 8)}`;

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/10">
        <div className="p-4 lg:p-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push(`/dashboard/athletes/${athleteId}`)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to {fullName}</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#9BDDFF] to-[#A08845] flex items-center justify-center text-black font-bold text-2xl flex-shrink-0">
              {profile?.first_name?.[0] || 'A'}
              {profile?.last_name?.[0] || ''}
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">Personal Records</h1>
              <p className="text-gray-400 mt-1">{fullName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-8">
        <MaxTrackerPanel athleteId={athleteId} />
      </div>
    </div>
  );
}
