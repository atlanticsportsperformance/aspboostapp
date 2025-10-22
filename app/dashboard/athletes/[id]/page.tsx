'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Import tab components
import OverviewTab from '@/components/dashboard/athletes/athlete-overview-tab';
import CalendarTab from '@/components/dashboard/athletes/athlete-calendar-tab';
import TrainingTab from '@/components/dashboard/athletes/athlete-training-tab';
import PerformanceTab from '@/components/dashboard/athletes/athlete-performance-tab';
import NotesDocumentsTab from '@/components/dashboard/athletes/athlete-notes-documents-tab';

interface AthleteData {
  athlete: any;
  profile: any;
  teams: any[];
  currentPlan: any;
  planAssignment: any;
}

export default function AthleteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const athleteId = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [athleteData, setAthleteData] = useState<AthleteData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    setMounted(true);
    // Get tab from URL if present
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchAthleteData() {
      const supabase = createClient();

      console.log('=== ATHLETE DETAIL PAGE LOADING ===');
      console.log('Athlete ID:', athleteId);

      // Step 1: Get athlete
      const { data: athlete, error: athleteError } = await supabase
        .from('athletes')
        .select('*')
        .eq('id', athleteId)
        .single();

      console.log('1. Athlete:', athlete, athleteError);

      if (athleteError || !athlete) {
        console.error('Athlete not found:', athleteError);
        router.push('/dashboard/athletes');
        return;
      }

      // Step 2: Get profile if user_id exists
      let profile = null;
      if (athlete.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', athlete.user_id)
          .single();

        console.log('2. Profile:', profileData, profileError);
        profile = profileData;
      }

      // Step 3: Get teams
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select('jersey_number, status, teams(id, name, level)')
        .eq('athlete_id', athleteId)
        .eq('status', 'active');

      console.log('3. Team members:', teamMembersData, teamMembersError);

      const teams = (teamMembersData || []).map((tm: any) => ({
        ...tm.teams,
        jersey_number: tm.jersey_number
      }));

      // Step 4: Get active plan assignment
      const { data: planAssignmentData, error: planAssignmentError } = await supabase
        .from('plan_assignments')
        .select('*, plans(id, name, description, total_weeks, created_by)')
        .eq('athlete_id', athleteId)
        .eq('is_active', true)
        .single();

      console.log('4. Plan assignment:', planAssignmentData, planAssignmentError);

      const currentPlan = planAssignmentData?.plans || null;
      const planAssignment = planAssignmentData || null;

      setAthleteData({
        athlete,
        profile,
        teams,
        currentPlan,
        planAssignment
      });

      setLoading(false);
    }

    fetchAthleteData();
  }, [athleteId, router]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'calendar', label: 'Calendar & Programming', icon: '📅' },
    { id: 'history', label: 'Training History', icon: '💪' },
    { id: 'performance', label: 'Performance & KPIs', icon: '📈' },
    { id: 'notes', label: 'Notes & Documents', icon: '📝' }
  ];

  const updateTabInUrl = (tabId: string) => {
    setActiveTab(tabId);
    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.pushState({}, '', url.toString());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#C9A857] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading athlete profile...</p>
        </div>
      </div>
    );
  }

  if (!athleteData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-400">Athlete not found</p>
          <Link href="/dashboard/athletes" className="text-[#C9A857] hover:underline mt-2 inline-block">
            Return to Athletes
          </Link>
        </div>
      </div>
    );
  }

  const { athlete, profile } = athleteData;
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
              onClick={() => router.push('/dashboard/athletes')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Athletes</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar and Name */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#C9A857] to-[#A08845] flex items-center justify-center text-black font-bold text-2xl flex-shrink-0">
                {profile?.first_name?.[0] || 'A'}
                {profile?.last_name?.[0] || ''}
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">{fullName}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {athlete.primary_position && (
                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-md text-sm font-medium">
                      {athlete.primary_position}
                    </span>
                  )}
                  {athlete.grad_year && (
                    <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-md text-sm font-medium">
                      Class of {athlete.grad_year}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Desktop */}
        <div className="hidden lg:block border-t border-white/10">
          <div className="flex gap-1 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => updateTabInUrl(tab.id)}
                className={`px-4 py-3 font-medium transition-all duration-200 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-[#C9A857] text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
                style={mounted && activeTab === tab.id ? {} : undefined}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs - Mobile Dropdown */}
        <div className="lg:hidden border-t border-white/10 px-4 py-3">
          <select
            value={activeTab}
            onChange={(e) => updateTabInUrl(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C9A857]"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.icon} {tab.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 lg:p-8">
        {activeTab === 'overview' && <OverviewTab athleteData={athleteData} />}
        {activeTab === 'calendar' && <CalendarTab athleteId={athleteId} />}
        {activeTab === 'history' && <TrainingTab athleteId={athleteId} />}
        {activeTab === 'performance' && <PerformanceTab athleteId={athleteId} />}
        {activeTab === 'notes' && <NotesDocumentsTab athleteId={athleteId} />}
      </div>
    </div>
  );
}
