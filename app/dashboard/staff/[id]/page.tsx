'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Import tab components
import StaffDetailsTab from '@/components/dashboard/staff/staff-details-tab';
import StaffPermissionsTab from '@/components/dashboard/staff/staff-permissions-tab';
import StaffAthletesGroupsTab from '@/components/dashboard/staff/staff-athletes-groups-tab';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  app_role: 'admin' | 'coach' | 'athlete';
}

interface StaffMember {
  id: string;
  user_id: string;
  org_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  profile: Profile;
}

const tabs = [
  { id: 'details', label: 'Details' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'assignments', label: 'Athletes & Groups', coachOnly: false },
];

export default function StaffDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const staffId = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);
  const [activeTab, setActiveTab] = useState<string>('details');

  useEffect(() => {
    setMounted(true);
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchStaffData();
  }, [staffId]);

  async function fetchStaffData() {
    const supabase = createClient();

    // Get staff member
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .single();

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      setLoading(false);
      return;
    }

    if (!staff) {
      setLoading(false);
      return;
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', staff.user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    setStaffData({
      ...staff,
      profile: profile!
    });
    setLoading(false);
  }

  function updateTabInUrl(tabId: string) {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    router.push(url.pathname + url.search, { scroll: false });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading staff member...</p>
        </div>
      </div>
    );
  }

  if (!staffData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-400">Staff member not found</p>
          <Link href="/dashboard/staff" className="text-[#9BDDFF] hover:underline mt-2 inline-block">
            Return to Staff
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${staffData.profile.first_name} ${staffData.profile.last_name}`.trim();
  const isCoach = staffData.profile.app_role === 'coach';

  // Filter tabs based on role
  const visibleTabs = tabs.filter(tab => !tab.coachOnly || isCoach);

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/10">
        <div className="p-4 lg:p-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/dashboard/staff')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Staff</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Avatar and Name */}
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] flex items-center justify-center text-black font-bold text-2xl flex-shrink-0">
              {staffData.profile.first_name?.[0]}
              {staffData.profile.last_name?.[0]}
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">{fullName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`px-2.5 py-1 rounded-md text-sm font-medium ${
                  staffData.profile.app_role === 'admin'
                    ? 'bg-purple-500/10 text-purple-400'
                    : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {staffData.profile.app_role === 'admin' ? 'Admin' : 'Coach'}
                </span>
                <span className={`px-2.5 py-1 rounded-md text-sm font-medium ${
                  staffData.is_active
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-gray-500/10 text-gray-400'
                }`}>
                  {staffData.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Desktop */}
        <div className="hidden lg:block border-t border-white/10">
          <div className="flex items-center px-6">
            <div className="flex gap-1">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => updateTabInUrl(tab.id)}
                  className={`px-4 py-3 font-medium transition-all duration-200 border-b-2 ${
                    activeTab === tab.id
                      ? 'border-[#9BDDFF] text-white'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs - Mobile Dropdown */}
        <div className="lg:hidden border-t border-white/10 px-4 py-3">
          <select
            value={activeTab}
            onChange={(e) => updateTabInUrl(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
          >
            {visibleTabs.map((tab) => (
              <option key={tab.id} value={tab.id} className="bg-[#0A0A0A]">
                {tab.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 lg:p-6">
        {activeTab === 'details' && (
          <StaffDetailsTab
            staff={staffData}
            onUpdate={fetchStaffData}
          />
        )}
        {activeTab === 'permissions' && (
          <StaffPermissionsTab
            staff={staffData}
          />
        )}
        {activeTab === 'assignments' && (
          <StaffAthletesGroupsTab
            staffMember={staffData}
          />
        )}
      </div>
    </div>
  );
}
