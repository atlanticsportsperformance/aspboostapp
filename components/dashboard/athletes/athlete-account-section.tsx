'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStaffPermissions } from '@/lib/auth/use-staff-permissions';

interface AthleteAccountSectionProps {
  athlete: {
    id: string;
    user_id: string | null;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    is_active: boolean;
  };
  onUpdate?: () => void;
  onDeleteAthlete?: () => void;
}

export default function AthleteAccountSection({ athlete, onUpdate, onDeleteAthlete }: AthleteAccountSectionProps) {
  const [showUpdatePasswordDialog, setShowUpdatePasswordDialog] = useState(false);
  const [showMagicLinkDialog, setShowMagicLinkDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Update Password Dialog State
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Magic Link State
  const [magicLinkUrl, setMagicLinkUrl] = useState('');
  const [magicLinkExpiry, setMagicLinkExpiry] = useState('');

  // Create Login Account Dialog State
  const [showCreateLoginDialog, setShowCreateLoginDialog] = useState(false);
  const [createLoginPassword, setCreateLoginPassword] = useState('');
  const [showCreateLoginPassword, setShowCreateLoginPassword] = useState(false);

  // Delete Confirmation Dialog State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Permissions state
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'coach' | 'athlete'>('coach');
  const { permissions } = useStaffPermissions(userId);

  const hasLoginAccount = !!athlete.user_id;
  const supabase = createClient();

  // Load user and permissions on mount
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('app_role')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserRole(profile.app_role);
        }
      }
    }
    loadUser();
  }, []);

  // Check if user can edit athlete profiles
  const canEditProfile = userRole === 'super_admin' || permissions?.can_edit_athlete_profile;

  const generateRandomPassword = (forCreateLogin = false) => {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    password = password.split('').sort(() => Math.random() - 0.5).join('');

    if (forCreateLogin) {
      setCreateLoginPassword(password);
    } else {
      setNewPassword(password);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      setError('Please enter a password');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/athletes/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: athlete.id,
          userId: athlete.user_id,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setSuccess(`✅ Password updated successfully! New password: ${newPassword}`);
      setTimeout(() => {
        setShowUpdatePasswordDialog(false);
        setNewPassword('');
        setShowNewPassword(false);
        setSuccess(null);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/athletes/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: athlete.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email');
      }

      setSuccess('✅ Password reset email sent! Check their inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMagicLink = async (sendViaEmail: boolean = false) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/athletes/generate-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: athlete.email,
          sendViaEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate magic link');
      }

      if (sendViaEmail) {
        setSuccess('✅ Magic link sent via email!');
      } else {
        setMagicLinkUrl(data.magicLink);
        setMagicLinkExpiry(data.expiresAt);
        setShowMagicLinkDialog(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoginAccount = async () => {
    if (!createLoginPassword) {
      setError('Please enter a password or generate one');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/athletes/create-login-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: athlete.id,
          email: athlete.email,
          firstName: athlete.first_name,
          lastName: athlete.last_name,
          password: createLoginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create login account');
      }

      setSuccess(`✅ Login account created! Password: ${createLoginPassword} (Make sure to save this!)`);
      setShowCreateLoginDialog(false);
      setCreateLoginPassword('');
      setShowCreateLoginPassword(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActiveStatus = async () => {
    const newStatus = !athlete.is_active;
    const confirmMessage = newStatus
      ? 'Activate this athlete account? They will be able to log in.'
      : 'Deactivate this athlete account? They will be blocked from logging in (data preserved).';

    if (!confirm(confirmMessage)) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/athletes/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: athlete.id,
          isActive: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      setSuccess(`✅ Account ${newStatus ? 'activated' : 'deactivated'}!`);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg">
            <svg className="w-6 h-6 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Login Account</h3>
            <p className="text-gray-400 text-sm">Manage athlete login credentials and access</p>
          </div>
        </div>

        {/* Active Status Badge */}
        <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
          athlete.is_active
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
        }`}>
          {athlete.is_active ? '● Active' : '● Inactive'}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
          {success}
        </div>
      )}

      {!hasLoginAccount ? (
        // No login account - show create button
        <div className="text-center py-8">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <p className="text-gray-400 mb-4">No login account exists for this athlete</p>
          {canEditProfile ? (
            <button
              onClick={() => setShowCreateLoginDialog(true)}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] text-black rounded-lg font-medium hover:from-[#7BC5F0] hover:to-[#5AB3E8] transition-all disabled:opacity-50"
            >
              Create Login Account
            </button>
          ) : (
            <p className="text-amber-400 text-sm">
              🔒 You don't have permission to create login accounts
            </p>
          )}
        </div>
      ) : (
        // Has login account - show management options
        canEditProfile ? (
          <div className="space-y-3">
          {/* Account Status Toggle */}
          <button
            onClick={handleToggleActiveStatus}
            disabled={loading}
            className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-colors disabled:opacity-50 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${athlete.is_active ? 'bg-emerald-400' : 'bg-gray-400'}`}></div>
                <span className="text-white font-medium">
                  {athlete.is_active ? 'Deactivate Account' : 'Activate Account'}
                </span>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm mt-1 ml-5">
              {athlete.is_active ? 'Block login (preserves all data)' : 'Allow login access'}
            </p>
          </button>

          {/* Update Password */}
          <button
            onClick={() => setShowUpdatePasswordDialog(true)}
            disabled={loading}
            className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-colors disabled:opacity-50 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span className="text-white font-medium">Update Password</span>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm mt-1 ml-8">Set a new password for this athlete</p>
          </button>

          {/* Send Password Reset Email */}
          <button
            onClick={handleSendPasswordResetEmail}
            disabled={loading}
            className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-colors disabled:opacity-50 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-white font-medium">Send Password Reset Email</span>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm mt-1 ml-8">Let athlete set their own password via email</p>
          </button>

          {/* Send Magic Link (Email) */}
          <button
            onClick={() => handleGenerateMagicLink(true)}
            disabled={loading}
            className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-colors disabled:opacity-50 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-white font-medium">Send Magic Link (Email)</span>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm mt-1 ml-8">One-time login link sent to email</p>
          </button>

          {/* Generate Magic Link (Shareable) */}
          <button
            onClick={() => handleGenerateMagicLink(false)}
            disabled={loading}
            className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-colors disabled:opacity-50 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-white font-medium">Generate Magic Link (Shareable)</span>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm mt-1 ml-8">Copy link to text or share (expires in 1 hour)</p>
          </button>
        </div>
        ) : (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-amber-400 text-sm">
              🔒 You don't have permission to manage this athlete's account. Contact an admin if you need to update passwords or generate login links.
            </p>
          </div>
        )
      )}

      {/* Update Password Dialog */}
      {showUpdatePasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-semibold text-xl mb-4">Update Password</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  New Password
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent pr-10"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    >
                      {showNewPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUpdatePasswordDialog(false);
                  setNewPassword('');
                  setShowNewPassword(false);
                  setError(null);
                }}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePassword}
                disabled={loading || !newPassword}
                className="flex-1 px-4 py-2.5 bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] text-black rounded-lg font-medium hover:from-[#7BC5F0] hover:to-[#5AB3E8] transition-all disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Magic Link Dialog */}
      {showMagicLinkDialog && magicLinkUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl w-full max-w-lg p-6">
            <h3 className="text-white font-semibold text-xl mb-4">Magic Link Generated</h3>

            <div className="mb-4">
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Shareable Login Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={magicLinkUrl}
                  readOnly
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(magicLinkUrl);
                    alert('Copied to clipboard!');
                  }}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                ⏱️ Expires: {new Date(magicLinkExpiry).toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
              <p className="text-amber-300 text-sm">
                <strong>⚠️ Security Notice:</strong> This link allows one-time login without a password.
                Share it only via secure channels (text message, Signal, etc). It expires in 1 hour.
              </p>
            </div>

            <button
              onClick={() => {
                setShowMagicLinkDialog(false);
                setMagicLinkUrl('');
              }}
              className="w-full px-4 py-2.5 bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] text-black rounded-lg font-medium hover:from-[#7BC5F0] hover:to-[#5AB3E8] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Login Account Dialog */}
      {showCreateLoginDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-semibold text-xl mb-4">Create Login Account</h3>

            {/* Show athlete info */}
            <div className="mb-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-gray-400 text-sm mb-2">Creating login account for:</p>
              <p className="text-white font-medium">{athlete.first_name} {athlete.last_name}</p>
              <p className="text-gray-400 text-sm mt-1">
                📧 Email: <span className="text-white font-mono">{athlete.email}</span>
              </p>
              <p className="text-gray-500 text-xs mt-2">
                The athlete will use this email to log in. You're setting their initial password below.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Initial Password <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showCreateLoginPassword ? 'text' : 'password'}
                      value={createLoginPassword}
                      onChange={(e) => setCreateLoginPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent pr-10"
                      placeholder="Enter password or generate"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreateLoginPassword(!showCreateLoginPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    >
                      {showCreateLoginPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => generateRandomPassword(true)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
                {createLoginPassword && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    💡 Make sure to save this password - give it to the athlete so they can log in
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateLoginDialog(false);
                  setCreateLoginPassword('');
                  setShowCreateLoginPassword(false);
                  setError(null);
                }}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLoginAccount}
                disabled={loading || !createLoginPassword}
                className="flex-1 px-4 py-2.5 bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] text-black rounded-lg font-medium hover:from-[#7BC5F0] hover:to-[#5AB3E8] transition-all disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone - Delete Athlete */}
      {onDeleteAthlete && (
        <div className="mt-6 pt-6 border-t border-red-500/20">
          <h4 className="text-base font-bold text-red-400 mb-2">Danger Zone</h4>
          <p className="text-sm text-gray-400 mb-3">
            Deleting this athlete will permanently remove all their data including workouts, progress tracking, and records (except force plate data). This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-lg transition-colors border border-red-500/20 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Athlete
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && onDeleteAthlete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-red-500/30 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-xl">Delete Athlete</h3>
                <p className="text-gray-400 text-sm">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm font-medium mb-2">⚠️ Warning: This will permanently delete:</p>
              <ul className="text-red-300 text-sm space-y-1 ml-4 list-disc">
                <li>Athlete profile and personal information</li>
                <li>All workouts and routines</li>
                <li>All workout instances and progress</li>
                <li>All plan assignments</li>
                <li>Training tags and group memberships</li>
                <li>Login account (if exists)</li>
              </ul>
              <p className="text-amber-400 text-sm mt-3">
                ✅ <strong>Force plate data will be preserved</strong> (athlete_percentile_contributions)
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Type <span className="font-mono text-white font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Type DELETE here"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-4 py-2.5 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmText === 'DELETE') {
                    setShowDeleteDialog(false);
                    setDeleteConfirmText('');
                    onDeleteAthlete();
                  }
                }}
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
