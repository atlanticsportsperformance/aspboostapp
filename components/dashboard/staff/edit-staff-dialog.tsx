'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface EditStaffDialogProps {
  staff: {
    id: string;
    user_id: string;
    role: string;
    is_active: boolean;
    profile: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      app_role: string;
    };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function EditStaffDialog({ staff, onClose, onSuccess }: EditStaffDialogProps) {
  const [firstName, setFirstName] = useState(staff.profile.first_name || '');
  const [lastName, setLastName] = useState(staff.profile.last_name || '');
  const [phone, setPhone] = useState(staff.profile.phone || '');
  const [role, setRole] = useState<'admin' | 'coach'>(staff.profile.app_role as 'admin' | 'coach');
  const [isActive, setIsActive] = useState(staff.is_active);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!firstName || !lastName) {
      alert('First name and last name are required');
      return;
    }

    setLoading(true);
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
      setLoading(false);
      return;
    }

    // Update staff record
    const { error: staffError } = await supabase
      .from('staff')
      .update({
        role: role,
        is_active: isActive
      })
      .eq('id', staff.id);

    if (staffError) {
      console.error('Error updating staff:', staffError);
      alert('Failed to update staff record');
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Edit Staff Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <input
              type="email"
              value={staff.profile.email}
              disabled
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Role <span className="text-red-400">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'coach')}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <span className="text-sm text-white">Active Staff Member</span>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Inactive staff cannot log in or access the system
            </p>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
