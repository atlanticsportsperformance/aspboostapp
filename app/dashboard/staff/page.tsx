'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { AddStaffDialog } from '@/components/dashboard/staff/add-staff-dialog';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  app_role: string | null;
}

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  hire_date: string | null;
  profile?: Profile;
}

const roleColors = {
  owner: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  super_admin: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-400/40',
  admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  coach: 'bg-green-500/20 text-green-400 border-green-500/30',
  intern: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function StaffPage() {
  const [mounted, setMounted] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive' | 'coaches' | 'admins'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function fetchStaff() {
    const supabase = createClient();

    console.log('=== STAFF PAGE LOADING ===');

    // Step 1: Get all staff
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('1. STAFF QUERY:', {
      count: staffData?.length,
      data: staffData,
      error: staffError
    });

    if (staffError) {
      console.error('Staff query error:', staffError);
      setLoading(false);
      return;
    }

    if (!staffData || staffData.length === 0) {
      console.warn('⚠️ No staff found in database');
      setStaff([]);
      setFilteredStaff([]);
      setLoading(false);
      return;
    }

    // Step 2: Get all user_ids from staff
    const userIds = staffData.map(s => s.user_id);
    console.log('2. Fetching profiles for user IDs:', userIds);

    // Step 3: Get profiles for those user_ids
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    console.log('3. PROFILES QUERY:', {
      count: profilesData?.length,
      data: profilesData,
      error: profilesError
    });

    if (profilesError) {
      console.error('Profiles query error:', profilesError);
    }

    // Step 4: Merge staff with profiles
    const staffWithProfiles = staffData.map(s => ({
      ...s,
      profile: profilesData?.find(p => p.id === s.user_id)
    }));

    console.log('4. MERGED STAFF WITH PROFILES:', staffWithProfiles);
    console.log('Sample staff member:', staffWithProfiles[0]);

    setStaff(staffWithProfiles);
    setFilteredStaff(staffWithProfiles);
    setLoading(false);
  }

  useEffect(() => {
    fetchStaff();
  }, []);

  // Filter staff when filter or search changes
  useEffect(() => {
    let filtered = [...staff];

    // Apply active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter(s => s.is_active);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(s => !s.is_active);
    } else if (activeFilter === 'coaches') {
      filtered = filtered.filter(s => s.role === 'coach' && s.is_active);
    } else if (activeFilter === 'admins') {
      filtered = filtered.filter(s => {
        const isAdminRole = s.role === 'admin' || s.role === 'owner';
        const isSuperAdmin = s.profile?.app_role === 'super_admin';
        return (isAdminRole || isSuperAdmin) && s.is_active;
      });
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => {
        const name = s.profile
          ? `${s.profile.first_name || ''} ${s.profile.last_name || ''}`.toLowerCase()
          : '';
        const email = (s.profile?.email || '').toLowerCase();
        const role = s.role.toLowerCase();

        return name.includes(query) || email.includes(query) || role.includes(query);
      });
    }

    setFilteredStaff(filtered);
  }, [activeFilter, searchQuery, staff]);

  const activeStaff = staff.filter(s => s.is_active);
  const totalStaff = staff.length;
  const totalActive = activeStaff.length;
  const totalCoaches = activeStaff.filter(s => s.role === 'coach').length;
  const totalAdmins = activeStaff.filter(s => {
    const isAdminRole = s.role === 'admin' || s.role === 'owner';
    const isSuperAdmin = s.profile?.app_role === 'super_admin';
    return isAdminRole || isSuperAdmin;
  }).length;

  console.log('STATS:', { totalStaff, totalActive, totalCoaches, totalAdmins });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading staff...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Staff</h1>
          <p className="text-gray-400 mt-1">Manage coaches, admins, and staff members</p>
        </div>
        {/* Desktop Add Button */}
        <button
          onClick={() => setShowAddDialog(true)}
          className="hidden sm:inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black font-semibold rounded-lg transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Staff
        </button>
      </div>

      {/* Search Bar and Filter Dropdown */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search staff by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative sm:w-56">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as any)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent pr-10"
          >
            <option value="all" className="bg-[#0A0A0A] text-white">
              All Staff ({staff.length})
            </option>
            <option value="active" className="bg-[#0A0A0A] text-white">
              Active ({activeStaff.length})
            </option>
            <option value="inactive" className="bg-[#0A0A0A] text-white">
              Inactive ({staff.filter(s => !s.is_active).length})
            </option>
            <option value="coaches" className="bg-[#0A0A0A] text-white">
              Coaches ({totalCoaches})
            </option>
            <option value="admins" className="bg-[#0A0A0A] text-white">
              Admins ({totalAdmins})
            </option>
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-6">
          <div className="flex items-center justify-between mb-1 lg:mb-2">
            <p className="text-gray-400 text-xs lg:text-sm font-medium">Total Staff</p>
            <div className="h-6 w-6 lg:h-10 lg:w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="h-3 w-3 lg:h-5 lg:w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xl lg:text-3xl font-bold text-white">{totalStaff}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-6">
          <div className="flex items-center justify-between mb-1 lg:mb-2">
            <p className="text-gray-400 text-xs lg:text-sm font-medium">Active</p>
            <div className="h-6 w-6 lg:h-10 lg:w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="h-3 w-3 lg:h-5 lg:w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xl lg:text-3xl font-bold text-white">{totalActive}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-6">
          <div className="flex items-center justify-between mb-1 lg:mb-2">
            <p className="text-gray-400 text-xs lg:text-sm font-medium">Coaches</p>
            <div className="h-6 w-6 lg:h-10 lg:w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <svg className="h-3 w-3 lg:h-5 lg:w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xl lg:text-3xl font-bold text-white">{totalCoaches}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-6">
          <div className="flex items-center justify-between mb-1 lg:mb-2">
            <p className="text-gray-400 text-xs lg:text-sm font-medium">Admins</p>
            <div className="h-6 w-6 lg:h-10 lg:w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <svg className="h-3 w-3 lg:h-5 lg:w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <p className="text-xl lg:text-3xl font-bold text-white">{totalAdmins}</p>
        </div>
      </div>

      {/* Staff Table (Desktop) */}
      <div className="hidden lg:block bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Email</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Role</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Phone</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <p className="text-gray-400">No staff members found matching your filters</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const fullName = member.profile
                    ? `${member.profile.first_name || ''} ${member.profile.last_name || ''}`.trim()
                    : `Staff #${member.id.slice(0, 8)}`;

                  // Determine display role and color
                  const isSuperAdmin = member.profile?.app_role === 'super_admin';
                  const displayRole = isSuperAdmin ? 'super_admin' : member.role;
                  const roleLabel = isSuperAdmin ? 'Super Admin' : member.role.charAt(0).toUpperCase() + member.role.slice(1);
                  const roleColor = roleColors[displayRole as keyof typeof roleColors] || roleColors.intern;

                  return (
                    <tr
                      key={member.id}
                      onClick={() => router.push(`/dashboard/staff/${member.id}`)}
                      className="border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] flex items-center justify-center text-black font-bold">
                            {member.profile?.first_name?.[0] || 'S'}
                            {member.profile?.last_name?.[0] || ''}
                          </div>
                          <p className="text-white font-medium">{fullName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-400 text-sm">{member.profile?.email || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-md text-sm font-medium border ${roleColor}`}>
                          {roleLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-400 text-sm">{member.profile?.phone || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-sm font-medium ${
                          member.is_active
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Cards (Mobile) */}
      <div className="lg:hidden space-y-3">
        {filteredStaff.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400">No staff members found matching your filters</p>
          </div>
        ) : (
          filteredStaff.map((member) => {
            const fullName = member.profile
              ? `${member.profile.first_name || ''} ${member.profile.last_name || ''}`.trim()
              : `Staff #${member.id.slice(0, 8)}`;

            // Determine display role and color
            const isSuperAdmin = member.profile?.app_role === 'super_admin';
            const displayRole = isSuperAdmin ? 'super_admin' : member.role;
            const roleLabel = isSuperAdmin ? 'Super Admin' : member.role.charAt(0).toUpperCase() + member.role.slice(1);
            const roleColor = roleColors[displayRole as keyof typeof roleColors] || roleColors.intern;

            return (
              <div
                key={member.id}
                onClick={() => router.push(`/dashboard/staff/${member.id}`)}
                className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                    {member.profile?.first_name?.[0] || 'S'}
                    {member.profile?.last_name?.[0] || ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-white font-semibold text-base">
                        {fullName}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-medium border ${roleColor}`}>
                        {roleLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{member.profile?.email || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400 mb-0.5">Phone</p>
                    <span className="text-white font-medium">
                      {member.profile?.phone || 'Not set'}
                    </span>
                  </div>

                  <div>
                    <p className="text-gray-400 mb-0.5">Status</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      member.is_active
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mobile Floating Add Button */}
      <button
        onClick={() => setShowAddDialog(true)}
        className="sm:hidden fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[#9BDDFF] to-[#7BC5F0] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
      >
        <svg className="w-7 h-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Add Staff Dialog */}
      {showAddDialog && (
        <AddStaffDialog
          onClose={() => setShowAddDialog(false)}
          onSuccess={async () => {
            setShowAddDialog(false);
            await fetchStaff();
          }}
        />
      )}
    </div>
  );
}
