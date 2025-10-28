'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface StaffDetailsTabProps {
  staff: {
    id: string;
    user_id: string;
    role: string;
    is_active: boolean;
    profile: {
      first_name: string | null;
      last_name: string | null;
      email: string;
      phone: string | null;
      app_role: 'super_admin' | 'admin' | 'coach' | 'athlete';
    };
  };
  onUpdate: () => void;
}

export default function StaffDetailsTab({ staff, onUpdate }: StaffDetailsTabProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [firstName, setFirstName] = useState(staff.profile.first_name || '');
  const [lastName, setLastName] = useState(staff.profile.last_name || '');
  const [phone, setPhone] = useState(staff.profile.phone || '');
  const [role, setRole] = useState<'super_admin' | 'admin' | 'coach'>(
    staff.profile.app_role === 'super_admin' ? 'super_admin' :
    staff.profile.app_role === 'admin' ? 'admin' : 'coach'
  );
  const [isActive, setIsActive] = useState(staff.is_active);

  async function handleSave() {
    if (!firstName || !lastName) {
      alert('First name and last name are required');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        app_role: role
      })
      .eq('id', staff.user_id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      alert('Failed to update profile');
      setSaving(false);
      return;
    }

    // Update staff record (use 'admin' for staff table if super_admin)
    const staffRole = role === 'super_admin' ? 'admin' : role;
    const { error: staffError } = await supabase
      .from('staff')
      .update({
        role: staffRole,
        is_active: isActive
      })
      .eq('id', staff.id);

    if (staffError) {
      console.error('Error updating staff:', staffError);
      alert('Failed to update staff record');
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
    onUpdate();
  }

  function handleCancel() {
    // Reset to original values
    setFirstName(staff.profile.first_name || '');
    setLastName(staff.profile.last_name || '');
    setPhone(staff.profile.phone || '');
    setRole(staff.profile.app_role as 'admin' | 'coach');
    setIsActive(staff.is_active);
    setEditing(false);
  }

  async function handleDelete() {
    if (deleteConfirmation !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/staff/${staff.id}/delete`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        router.push('/dashboard/staff');
      } else {
        alert(data.error || 'Failed to delete staff member');
        setDeleting(false);
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('An error occurred while deleting staff member');
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Staff Details</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Edit Details
          </button>
        )}
      </div>

      {/* Details Form */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              First Name <span className="text-red-400">*</span>
            </label>
            {editing ? (
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            ) : (
              <div className="px-4 py-2 text-white">{staff.profile.first_name}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Last Name <span className="text-red-400">*</span>
            </label>
            {editing ? (
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            ) : (
              <div className="px-4 py-2 text-white">{staff.profile.last_name}</div>
            )}
          </div>
        </div>

        {/* Email (Read Only) */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-500">
            {staff.profile.email}
          </div>
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
          {editing ? (
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(555) 123-4567"
            />
          ) : (
            <div className="px-4 py-2 text-white">{staff.profile.phone || 'Not set'}</div>
          )}
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Role <span className="text-red-400">*</span>
          </label>
          {editing ? (
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'super_admin' | 'admin' | 'coach')}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="coach" className="bg-black">Coach</option>
              <option value="admin" className="bg-black">Admin</option>
              <option value="super_admin" className="bg-black">Super Admin</option>
            </select>
          ) : (
            <div className="px-4 py-2">
              <span className={`inline-flex px-3 py-1 rounded-md text-sm font-medium ${
                staff.profile.app_role === 'super_admin'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : staff.profile.app_role === 'admin'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {staff.profile.app_role === 'super_admin' ? 'Super Admin' :
                 staff.profile.app_role === 'admin' ? 'Admin' : 'Coach'}
              </span>
            </div>
          )}
        </div>

        {/* Active Status */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
          {editing ? (
            <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <span className="text-sm text-white">Active Staff Member</span>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
            </label>
          ) : (
            <div className="px-4 py-2">
              <span className={`inline-flex px-3 py-1 rounded-md text-sm font-medium ${
                staff.is_active
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {staff.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          )}
          {editing && (
            <p className="text-xs text-gray-500 mt-1">
              Inactive staff cannot log in or access the system
            </p>
          )}
        </div>

        {/* Action Buttons (Only in Edit Mode) */}
        {editing && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Danger Zone - Delete Staff (only if not super_admin) */}
      {staff.profile.app_role !== 'super_admin' && (
        <div className="mt-8 bg-white/5 border border-red-500/20 rounded-xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h3>
          <p className="text-sm text-gray-400 mb-4">
            Deleting this staff member will permanently remove their profile, login account, and all associated data.
          </p>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-medium transition-colors"
          >
            Delete Staff Member
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-red-500/30 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-red-400 mb-4">Delete Staff Member</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete <strong className="text-white">{staff.profile.first_name} {staff.profile.last_name}</strong>?
            </p>
            <p className="text-sm text-gray-400 mb-6">
              This will permanently delete:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-400 mb-6 space-y-1">
              <li>Staff profile and details</li>
              <li>Login account and authentication</li>
              <li>Coach assignments (if applicable)</li>
              <li>All permissions and access</li>
            </ul>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Type <span className="text-red-400 font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2 bg-white/10 border border-red-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmation('');
                }}
                disabled={deleting}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmation !== 'DELETE'}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
