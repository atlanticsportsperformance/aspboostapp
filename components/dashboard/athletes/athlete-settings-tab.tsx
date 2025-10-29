'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AthleteAccountSection from './athlete-account-section';
import { useStaffPermissions } from '@/lib/auth/use-staff-permissions';

interface ViewType {
  id: string;
  name: string;
  description: string | null;
}

interface AthleteSettingsTabProps {
  athleteData: any;
  onDeleteAthlete?: () => void;
}

export default function AthleteSettingsTab({ athleteData, onDeleteAthlete }: AthleteSettingsTabProps) {
  const { athlete } = athleteData;
  const [viewTypes, setViewTypes] = useState<ViewType[]>([]);
  const [selectedViewTypeId, setSelectedViewTypeId] = useState<string>(athlete.view_type_id || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // VALD linking state
  const [valdSearching, setValdSearching] = useState(false);
  const [valdMatches, setValdMatches] = useState<any[]>([]);
  const [selectedValdProfile, setSelectedValdProfile] = useState<string>('');
  const [valdMessage, setValdMessage] = useState('');
  const [valdLinking, setValdLinking] = useState(false);

  // Permissions state
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'coach' | 'athlete'>('coach');
  const { permissions } = useStaffPermissions(userId);

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

  useEffect(() => {
    fetchViewTypes();
  }, []);

  async function fetchViewTypes() {
    setLoading(true);

    try {
      // Use the athlete's org_id (already in athleteData)
      const orgId = athlete.org_id;

      if (!orgId) {
        console.error('No org_id found for athlete');
        setLoading(false);
        return;
      }

      console.log('Fetching view types for org:', orgId);

      // Fetch view types for this org
      const { data, error } = await supabase
        .from('athlete_view_types')
        .select('id, name, description')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Error fetching view types:', error);
      } else {
        console.log('Fetched view types:', data);
        setViewTypes(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveViewType() {
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('athletes')
      .update({
        view_type_id: selectedViewTypeId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', athlete.id);

    if (error) {
      console.error('Error updating athlete view type:', error);
      setMessage('❌ Failed to update athlete view type');
    } else {
      setMessage('✅ Athlete view type updated successfully!');
      // Update the local athlete data
      athlete.view_type_id = selectedViewTypeId || null;
    }

    setTimeout(() => setMessage(''), 3000);
    setSaving(false);
  }

  async function handleSearchVALD() {
    if (!athlete.first_name || !athlete.last_name) {
      setValdMessage('❌ Athlete must have first and last name to search VALD');
      setTimeout(() => setValdMessage(''), 3000);
      return;
    }

    setValdSearching(true);
    setValdMessage('');
    setValdMatches([]);

    try {
      const response = await fetch(`/api/vald/search-by-name?firstName=${encodeURIComponent(athlete.first_name)}&lastName=${encodeURIComponent(athlete.last_name)}`);
      const data = await response.json();

      if (response.ok && data.profiles) {
        setValdMatches(data.profiles);
        if (data.profiles.length === 0) {
          setValdMessage(`No VALD profiles found for "${athlete.first_name} ${athlete.last_name}"`);
        } else {
          setValdMessage(`✅ Found ${data.profiles.length} VALD profile(s)`);
        }
      } else {
        setValdMessage('❌ Error searching VALD: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error searching VALD:', error);
      setValdMessage('❌ Failed to search VALD');
    } finally {
      setValdSearching(false);
      setTimeout(() => setValdMessage(''), 5000);
    }
  }

  async function handleLinkVALD() {
    if (!selectedValdProfile) {
      setValdMessage('❌ Please select a VALD profile to link');
      setTimeout(() => setValdMessage(''), 3000);
      return;
    }

    setValdLinking(true);
    setValdMessage('');

    try {
      const response = await fetch('/api/athletes/link-vald', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: athlete.id,
          valdProfileId: selectedValdProfile
        })
      });

      const data = await response.json();

      if (response.ok) {
        setValdMessage('✅ VALD profile linked successfully!');
        // Update local athlete data
        athlete.vald_profile_id = selectedValdProfile;
        setValdMatches([]);
        setSelectedValdProfile('');

        // Refresh page to show updated VALD status
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setValdMessage('❌ Error linking VALD: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error linking VALD:', error);
      setValdMessage('❌ Failed to link VALD profile');
    } finally {
      setValdLinking(false);
      setTimeout(() => setValdMessage(''), 5000);
    }
  }

  // Check if user can edit athlete profiles
  const canEditProfile = userRole === 'super_admin' || permissions?.can_edit_athlete_profile;

  return (
    <div className="space-y-4">
      {/* Two Column Grid Layout for Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* VALD Force Plates Integration */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-white">VALD Force Plates</h3>
            {athlete.vald_profile_id && (
              <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded text-emerald-400 text-xs font-semibold">
                ✓ Linked
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Link to sync force plate test data
          </p>

          {/* Current VALD Status */}
          {athlete.vald_profile_id ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-emerald-400 font-medium text-xs">Profile Linked</p>
                  <p className="text-emerald-200 text-xs mt-1 font-mono break-all">{athlete.vald_profile_id}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-amber-400 font-medium text-xs">Not Linked</p>
                  <p className="text-amber-200 text-xs mt-1">
                    Search to link existing profile
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search Button */}
          {!athlete.vald_profile_id && canEditProfile && (
            <button
              onClick={handleSearchVALD}
              disabled={valdSearching || !athlete.first_name || !athlete.last_name}
              className="w-full px-3 py-2 bg-[#9BDDFF] text-black rounded-lg hover:bg-[#7BC5F0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs mb-3"
            >
              {valdSearching ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-black border-r-transparent"></div>
                  Searching...
                </span>
              ) : (
                `Search VALD`
              )}
            </button>
          )}

          {/* Permission denied message */}
          {!athlete.vald_profile_id && !canEditProfile && (
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-center mb-3">
              <p className="text-amber-400 text-xs">
                🔒 No permission to link
              </p>
            </div>
          )}

          {/* Success/Error Message */}
          {valdMessage && (
            <div className={`p-2 rounded-lg text-xs mb-3 ${
              valdMessage.startsWith('✅')
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {valdMessage}
            </div>
          )}

          {/* Search Results */}
          {valdMatches.length > 0 && canEditProfile && (
            <div className="space-y-2">
              <p className="text-xs text-white font-medium">Select profile to link:</p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {valdMatches.map((profile: any) => (
                  <button
                    key={profile.profileId}
                    type="button"
                    onClick={() => setSelectedValdProfile(profile.profileId)}
                    className={`w-full px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedValdProfile === profile.profileId
                        ? 'bg-emerald-500/30 border border-emerald-500'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">
                          {profile.givenName} {profile.familyName}
                        </p>
                        {profile.email && (
                          <p className="text-emerald-300 text-xs mt-0.5 truncate">
                            {profile.email}
                          </p>
                        )}
                        <p className="text-gray-400 text-xs mt-0.5">
                          DOB: {new Date(profile.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedValdProfile === profile.profileId && (
                        <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Link Button */}
              <button
                onClick={handleLinkVALD}
                disabled={!selectedValdProfile || valdLinking}
                className="w-full px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs"
              >
                {valdLinking ? 'Linking...' : 'Link Selected Profile'}
              </button>
            </div>
          )}
        </div>

        {/* Blast Motion Integration - Placeholder */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-white">Blast Motion</h3>
            <span className="px-2 py-0.5 bg-gray-500/20 border border-gray-500/40 rounded text-gray-400 text-xs font-semibold">
              Coming Soon
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Link to sync hitting & swing data
          </p>

          {/* Placeholder Status */}
          <div className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg mb-3">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-gray-400 font-medium text-xs">Not Available</p>
                <p className="text-gray-500 text-xs mt-1">
                  Integration in development
                </p>
              </div>
            </div>
          </div>

          {/* Disabled Button */}
          <button
            disabled
            className="w-full px-3 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed opacity-50 font-medium text-xs"
          >
            Search Blast Motion
          </button>
        </div>
      </div>

      {/* Athlete View Type Selection */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h3 className="text-base font-semibold text-white mb-2">Athlete View Type</h3>
        <p className="text-xs text-gray-400 mb-3">
          Select the training focus category for this athlete
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#9BDDFF] border-r-transparent"></div>
              <p className="mt-2 text-gray-400 text-xs">Loading...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedViewTypeId}
              onChange={(e) => setSelectedViewTypeId(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] [&>option]:bg-[#1a1a1a] [&>option]:text-white"
            >
              <option value="">No specific type</option>
              {viewTypes.map((vt) => (
                <option key={vt.id} value={vt.id}>
                  {vt.name}
                </option>
              ))}
            </select>
            {selectedViewTypeId && viewTypes.find(vt => vt.id === selectedViewTypeId)?.description && (
              <p className="text-xs text-gray-500">
                {viewTypes.find(vt => vt.id === selectedViewTypeId)?.description}
              </p>
            )}

            {/* Success/Error Message */}
            {message && (
              <div className={`p-2 rounded-lg text-xs ${
                message.startsWith('✅')
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {message}
              </div>
            )}

            {selectedViewTypeId !== (athlete.view_type_id || '') && (
              <button
                onClick={handleSaveViewType}
                disabled={saving}
                className="px-3 py-2 bg-[#9BDDFF] text-black rounded-lg hover:bg-[#7BC5F0] disabled:opacity-50 transition-colors font-medium text-xs"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Login Account Management */}
      <AthleteAccountSection
        athlete={athlete}
        onUpdate={() => {
          // Refresh athlete data if needed
          window.location.reload();
        }}
        onDeleteAthlete={onDeleteAthlete}
      />
    </div>
  );
}
