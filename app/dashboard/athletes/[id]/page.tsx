'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Import tab components
import OverviewTab from '@/components/dashboard/athletes/athlete-overview-tab';
import CalendarTab from '@/components/dashboard/athletes/athlete-calendar-tab';
import PerformanceTab from '@/components/dashboard/athletes/athlete-performance-tab';
import ForceProfileTab from '@/components/dashboard/athletes/athlete-force-profile-tab';
import AthleteSettingsTab from '@/components/dashboard/athletes/athlete-settings-tab';
import ManageTagsModal from '@/components/dashboard/athletes/manage-tags-modal';
import AthleteDashboardView from '@/components/dashboard/athletes/athlete-dashboard-view';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
}

interface Team {
  id: string;
  name: string;
  level: string;
  jersey_number?: string | null;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  total_weeks: number;
  created_by: string;
}

interface PlanAssignment {
  id: string;
  athlete_id: string;
  plan_id: string;
  is_active: boolean;
  start_date: string;
  plans?: Plan;
}

interface Athlete {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  grad_year: number | null;
  is_active: boolean;
  created_at: string;
}

interface AthleteData {
  athlete: Athlete;
  profile: Profile | null;
  teams: Team[];
  currentPlan: Plan | null;
  planAssignment: PlanAssignment | null;
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
  const [showManageTagsModal, setShowManageTagsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isAthleteView, setIsAthleteView] = useState(false);

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

      // Check if logged-in user is viewing their own athlete profile
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('app_role')
        .eq('id', user?.id)
        .single();

      console.log('User profile:', userProfile);

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

      // Check if this is athlete viewing their own profile
      if (userProfile?.app_role === 'athlete' && athlete.user_id === user?.id) {
        setIsAthleteView(true);
        console.log('🏃 Athlete viewing their own profile - switching to athlete dashboard');
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

      // Step 3: Get groups (new system)
      const { data: groupMembersData, error: groupMembersError } = await supabase
        .from('group_members')
        .select(`
          id,
          role,
          joined_at,
          groups(id, name, color, description)
        `)
        .eq('athlete_id', athleteId);

      console.log('3. Group members:', groupMembersData, groupMembersError);

      // Format groups data for compatibility (keeping teams variable name for now)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const teams = (groupMembersData || []).map((gm: any) => ({
        id: gm.groups?.id,
        name: gm.groups?.name,
        level: gm.role, // Use role instead of level (member/leader/captain)
        color: gm.groups?.color,
        jersey_number: null // No jersey numbers in new system
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
    { id: 'performance', label: 'Programming KPIs', icon: '📈' },
    { id: 'force-profile', label: 'Force Profile', icon: '⚡' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  const updateTabInUrl = (tabId: string) => {
    setActiveTab(tabId);
    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.pushState({}, '', url.toString());
  };

  const handleDeleteAthlete = async () => {
    if (!athleteData) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/athletes/${athleteId}/delete`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete athlete');
      }

      // Success! Show message and redirect
      alert(`✅ ${data.message}`);
      router.push('/dashboard/athletes');
    } catch (error) {
      console.error('Error deleting athlete:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to delete athlete'}`);
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
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
          <Link href="/dashboard/athletes" className="text-[#9BDDFF] hover:underline mt-2 inline-block">
            Return to Athletes
          </Link>
        </div>
      </div>
    );
  }

  const { athlete, profile } = athleteData;
  // Names are stored directly on athlete table now
  const fullName = athlete.first_name && athlete.last_name
    ? `${athlete.first_name} ${athlete.last_name}`.trim()
    : `Athlete #${athlete.id.slice(0, 8)}`;

  // If athlete is viewing their own profile, show the athlete dashboard
  if (isAthleteView) {
    return <AthleteDashboardView athleteId={athleteId} fullName={fullName} />;
  }

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

          <div className="flex items-center gap-4">
            {/* Avatar and Name */}
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] flex items-center justify-center text-black font-bold text-2xl flex-shrink-0">
              {athlete.first_name?.[0] || 'A'}
              {athlete.last_name?.[0] || ''}
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

        {/* Tabs - Desktop */}
        <div className="hidden lg:block border-t border-white/10">
          <div className="flex items-center justify-between px-6">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => updateTabInUrl(tab.id)}
                  className={`px-4 py-3 font-medium transition-all duration-200 border-b-2 ${
                    activeTab === tab.id
                      ? 'border-[#9BDDFF] text-white'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                  style={mounted && activeTab === tab.id ? {} : undefined}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Action Buttons removed - now in Overview tab */}
          </div>
        </div>

        {/* Tabs - Mobile Dropdown */}
        <div className="lg:hidden border-t border-white/10 px-4 py-3 space-y-3">
          <select
            value={activeTab}
            onChange={(e) => updateTabInUrl(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.icon} {tab.label}
              </option>
            ))}
          </select>

          {/* Action Buttons removed - now in Overview tab */}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-3 lg:p-4">
        {/* Manage Tags Modal - Renders here but button is in header */}
        {showManageTagsModal && (
          <ManageTagsModal
            athleteId={athleteId}
            onClose={() => setShowManageTagsModal(false)}
            onSuccess={() => {
              // Force refresh by re-mounting the component
              setShowManageTagsModal(false);
              // Trigger a re-render by updating state
              setMounted(false);
              setTimeout(() => setMounted(true), 0);
            }}
          />
        )}

        {activeTab === 'overview' && mounted && (
          <OverviewTab
            athleteData={athleteData}
            onManageTags={() => setShowManageTagsModal(true)}
            onDeleteAthlete={() => setShowDeleteModal(true)}
          />
        )}
        {activeTab === 'calendar' && <CalendarTab athleteId={athleteId} />}
        {activeTab === 'performance' && <PerformanceTab athleteId={athleteId} />}
        {activeTab === 'force-profile' && <ForceProfileTab athleteId={athleteId} athleteName={fullName} />}
        {activeTab === 'settings' && (
          <AthleteSettingsTab
            athleteData={athleteData}
            onDeleteAthlete={() => setShowDeleteModal(true)}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">Delete Athlete</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Are you sure you want to delete <span className="text-white font-semibold">{fullName}</span>?
                </p>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
                  <p className="text-red-400 text-sm font-medium">
                    ⚠️ This action cannot be undone. This will permanently delete:
                  </p>
                  <ul className="text-red-400/80 text-xs mt-2 space-y-1 ml-4">
                    <li>• All workout history and logs</li>
                    <li>• All plan assignments</li>
                    <li>• All max records</li>
                    <li>• All group memberships</li>
                    <li>• All notes and documents</li>
                  </ul>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
                  <p className="text-emerald-400 text-xs">
                    ✅ <span className="font-medium">Preserved:</span> VALD test data and percentile contributions will remain in the database for statistical integrity.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAthlete}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
