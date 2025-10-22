'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  title: string | null;
  certifications: string[] | null;
  is_active: boolean;
  hire_date: string | null;
  profile?: Profile;
}

const roleColors = {
  owner: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  coach: 'bg-green-500/20 text-green-400 border-green-500/30',
  intern: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
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
      setLoading(false);
    }

    fetchStaff();
  }, []);

  const activeStaff = staff.filter(s => s.is_active);
  const inactiveStaff = staff.filter(s => !s.is_active);
  const totalStaff = staff.length;
  const totalActive = activeStaff.length;
  const totalCoaches = activeStaff.filter(s => s.role === 'coach').length;
  const totalAdmins = activeStaff.filter(s => s.role === 'admin' || s.role === 'owner').length;

  console.log('STATS:', { totalStaff, totalActive, totalCoaches, totalAdmins });

  const handleAddStaff = () => {
    alert('Add Staff Member\n\nThis will open a modal in the full implementation.');
  };

  const handleEdit = (staffId: string) => {
    alert(`Edit staff member: ${staffId}\n\nThis will open an edit modal in the full implementation.`);
  };

  const handleDeactivate = (staffId: string) => {
    alert(`Deactivate staff member: ${staffId}\n\nThis will prompt for confirmation in the full implementation.`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white/20 border-r-white"></div>
          <p className="mt-4 text-sm text-white/50">Loading staff...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Staff Management</h1>
          <p className="text-gray-400">Manage coaches, admins, and staff members</p>
        </div>
        <button
          onClick={handleAddStaff}
          className="mt-4 sm:mt-0 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-all"
        >
          Add Staff Member
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
          <div className="text-gray-400 text-sm mb-1">Total Staff</div>
          <div className="text-white text-3xl font-bold">{totalStaff}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
          <div className="text-gray-400 text-sm mb-1">Active</div>
          <div className="text-white text-3xl font-bold">{totalActive}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
          <div className="text-gray-400 text-sm mb-1">Coaches</div>
          <div className="text-white text-3xl font-bold">{totalCoaches}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
          <div className="text-gray-400 text-sm mb-1">Admins</div>
          <div className="text-white text-3xl font-bold">{totalAdmins}</div>
        </div>
      </div>

      {/* Active Staff Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <div className="p-4 sm:p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Active Staff Members</h2>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 font-medium text-sm p-4">Name</th>
                <th className="text-left text-gray-400 font-medium text-sm p-4">Role</th>
                <th className="text-left text-gray-400 font-medium text-sm p-4">Title</th>
                <th className="text-left text-gray-400 font-medium text-sm p-4">Certifications</th>
                <th className="text-left text-gray-400 font-medium text-sm p-4">Status</th>
                <th className="text-left text-gray-400 font-medium text-sm p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeStaff.map((member) => {
                const fullName = member.profile
                  ? `${member.profile.first_name || ''} ${member.profile.last_name || ''}`.trim()
                  : 'Unknown';
                const roleColor = roleColors[member.role as keyof typeof roleColors] || roleColors.intern;

                return (
                  <tr
                    key={member.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <div className="text-white font-medium">{fullName}</div>
                      <div className="text-gray-400 text-sm">{member.profile?.email}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${roleColor}`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300">{member.title || '—'}</td>
                    <td className="p-4 text-gray-300">
                      {member.certifications && member.certifications.length > 0
                        ? member.certifications.join(', ')
                        : '—'}
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        Active
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(member.id)}
                          className="px-3 py-1 text-sm text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeactivate(member.id)}
                          className="px-3 py-1 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden p-4 space-y-4">
          {activeStaff.map((member) => {
            const fullName = member.profile
              ? `${member.profile.first_name || ''} ${member.profile.last_name || ''}`.trim()
              : 'Unknown';
            const roleColor = roleColors[member.role as keyof typeof roleColors] || roleColors.intern;

            return (
              <div
                key={member.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-white font-medium">{fullName}</div>
                    <div className="text-gray-400 text-sm">{member.profile?.email}</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${roleColor}`}>
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                </div>

                {member.title && (
                  <div className="text-sm">
                    <span className="text-gray-400">Title: </span>
                    <span className="text-gray-300">{member.title}</span>
                  </div>
                )}

                {member.certifications && member.certifications.length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-400">Certifications: </span>
                    <span className="text-gray-300">{member.certifications.join(', ')}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                    Active
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(member.id)}
                      className="px-3 py-1 text-sm text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeactivate(member.id)}
                      className="px-3 py-1 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activeStaff.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            No active staff members found. Check the browser console (F12) for query details.
          </div>
        )}
      </div>

      {/* Inactive Staff Section */}
      {inactiveStaff.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="w-full p-4 sm:p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
          >
            <h2 className="text-xl font-semibold text-white">
              Inactive Staff Members ({inactiveStaff.length})
            </h2>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${showInactive ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showInactive && (
            <div className="border-t border-white/10 p-4 space-y-3">
              {inactiveStaff.map((member) => {
                const fullName = member.profile
                  ? `${member.profile.first_name || ''} ${member.profile.last_name || ''}`.trim()
                  : 'Unknown';
                const roleColor = roleColors[member.role as keyof typeof roleColors] || roleColors.intern;

                return (
                  <div
                    key={member.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between opacity-60"
                  >
                    <div>
                      <div className="text-white font-medium">{fullName}</div>
                      <div className="text-gray-400 text-sm">{member.profile?.email}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${roleColor}`}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
