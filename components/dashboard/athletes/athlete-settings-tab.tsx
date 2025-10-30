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

  // Blast Motion linking state
  const [blastSearching, setBlastSearching] = useState(false);
  const [blastMatches, setBlastMatches] = useState<any[]>([]);
  const [selectedBlastPlayer, setSelectedBlastPlayer] = useState<number | null>(null);
  const [blastMessage, setBlastMessage] = useState('');
  const [blastLinking, setBlastLinking] = useState(false);
  const [blastSyncing, setBlastSyncing] = useState(false);

  // Unlink confirmation modals
  const [showValdUnlinkModal, setShowValdUnlinkModal] = useState(false);
  const [valdUnlinkInput, setValdUnlinkInput] = useState('');
  const [showBlastUnlinkModal, setShowBlastUnlinkModal] = useState(false);
  const [blastUnlinkInput, setBlastUnlinkInput] = useState('');

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

  function handleUnlinkVALD() {
    setShowValdUnlinkModal(true);
  }

  async function confirmUnlinkVALD() {
    if (valdUnlinkInput !== 'Unlink Profile') {
      return;
    }

    setValdLinking(true);
    setValdMessage('');
    setShowValdUnlinkModal(false);
    setValdUnlinkInput('');

    try {
      const response = await fetch('/api/athletes/unlink-vald', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: athlete.id
        })
      });

      const data = await response.json();

      if (response.ok) {
        setValdMessage('✅ VALD profile unlinked successfully!');
        // Update local athlete data
        athlete.vald_profile_id = null;

        // Refresh page to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setValdMessage('❌ Error unlinking: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error unlinking VALD:', error);
      setValdMessage('❌ Failed to unlink VALD profile');
    } finally {
      setValdLinking(false);
      setTimeout(() => setValdMessage(''), 5000);
    }
  }

  async function handleSearchBlast() {
    if (!athlete.first_name || !athlete.last_name) {
      setBlastMessage('❌ Athlete must have first and last name to search Blast Motion');
      setTimeout(() => setBlastMessage(''), 3000);
      return;
    }

    setBlastSearching(true);
    setBlastMessage('');
    setBlastMatches([]);

    try {
      const searchName = `${athlete.first_name} ${athlete.last_name}`;
      const response = await fetch(`/api/blast-motion/search-players?name=${encodeURIComponent(searchName)}`);
      const data = await response.json();

      if (response.ok && data.results) {
        setBlastMatches(data.results);
        if (data.results.length === 0) {
          setBlastMessage(`No Blast Motion players found for "${searchName}"`);
        } else {
          setBlastMessage(`✅ Found ${data.results.length} Blast Motion player(s)`);
        }
      } else {
        setBlastMessage('❌ Error searching Blast Motion: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error searching Blast Motion:', error);
      setBlastMessage('❌ Failed to search Blast Motion');
    } finally {
      setBlastSearching(false);
      setTimeout(() => setBlastMessage(''), 5000);
    }
  }

  async function handleLinkBlast() {
    if (!selectedBlastPlayer) {
      setBlastMessage('❌ Please select a Blast Motion player to link');
      setTimeout(() => setBlastMessage(''), 3000);
      return;
    }

    setBlastLinking(true);
    setBlastMessage('');

    try {
      const selectedPlayer = blastMatches.find(p => p.id === selectedBlastPlayer);
      if (!selectedPlayer) {
        throw new Error('Selected player not found');
      }

      const response = await fetch(`/api/athletes/${athlete.id}/blast/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blast_player_id: selectedPlayer.id,
          blast_user_id: selectedPlayer.blast_user_id,
          blast_external_id: selectedPlayer.external_id
        })
      });

      const data = await response.json();

      if (response.ok) {
        setBlastMessage('✅ Blast Motion player linked successfully!');
        // Update local athlete data
        athlete.blast_player_id = selectedPlayer.id;
        athlete.blast_user_id = selectedPlayer.blast_user_id;
        setBlastMatches([]);
        setSelectedBlastPlayer(null);

        // Refresh page to show updated Blast status
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setBlastMessage('❌ Error linking Blast Motion: ' + (data.message || data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error linking Blast Motion:', error);
      setBlastMessage('❌ Failed to link Blast Motion player');
    } finally {
      setBlastLinking(false);
      setTimeout(() => setBlastMessage(''), 5000);
    }
  }

  async function handleSyncBlast() {
    setBlastSyncing(true);
    setBlastMessage('');

    try {
      const response = await fetch(`/api/athletes/${athlete.id}/blast/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysBack: 365 })
      });

      const data = await response.json();

      if (response.ok) {
        setBlastMessage(`✅ Synced ${data.results.inserted} swings (${data.results.skipped} already existed)`);
        // Update local athlete data
        athlete.blast_synced_at = new Date().toISOString();
      } else {
        setBlastMessage('❌ Error syncing: ' + (data.message || data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error syncing Blast Motion:', error);
      setBlastMessage('❌ Failed to sync swing data');
    } finally {
      setBlastSyncing(false);
      setTimeout(() => setBlastMessage(''), 5000);
    }
  }

  function handleUnlinkBlast() {
    setShowBlastUnlinkModal(true);
  }

  async function confirmUnlinkBlast() {
    if (blastUnlinkInput !== 'Unlink Player') {
      return;
    }

    setBlastLinking(true);
    setBlastMessage('');
    setShowBlastUnlinkModal(false);
    setBlastUnlinkInput('');

    try {
      const response = await fetch(`/api/athletes/${athlete.id}/blast/link`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setBlastMessage('✅ Blast Motion player unlinked successfully!');
        // Update local athlete data
        athlete.blast_player_id = null;
        athlete.blast_user_id = null;
        athlete.blast_synced_at = null;

        // Refresh page to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setBlastMessage('❌ Error unlinking: ' + (data.message || data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error unlinking Blast Motion:', error);
      setBlastMessage('❌ Failed to unlink Blast Motion player');
    } finally {
      setBlastLinking(false);
      setTimeout(() => setBlastMessage(''), 5000);
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
            <div className="space-y-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
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

              {/* Sync Buttons */}
              {canEditProfile && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setValdMessage('');
                      fetch(`/api/athletes/${athlete.id}/vald/sync?daysBack=30`, {
                        method: 'POST',
                      })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success) {
                            setValdMessage(`✅ Synced ${data.tests_synced} test(s) from last 30 days`);
                          } else {
                            setValdMessage('❌ Error: ' + (data.error || 'Unknown error'));
                          }
                        })
                        .catch(err => setValdMessage('❌ Failed to sync'))
                        .finally(() => setTimeout(() => setValdMessage(''), 5000));
                    }}
                    className="px-3 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] text-black rounded-lg transition-colors font-medium text-xs flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync 30d
                  </button>
                  <button
                    onClick={() => {
                      setValdMessage('');
                      fetch(`/api/athletes/${athlete.id}/vald/sync?daysBack=365`, {
                        method: 'POST',
                      })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success) {
                            setValdMessage(`✅ Synced ${data.tests_synced} test(s) from last 365 days`);
                          } else {
                            setValdMessage('❌ Error: ' + (data.error || 'Unknown error'));
                          }
                        })
                        .catch(err => setValdMessage('❌ Failed to sync'))
                        .finally(() => setTimeout(() => setValdMessage(''), 5000));
                    }}
                    className="px-3 py-2 border border-[#9BDDFF] bg-[#9BDDFF]/10 hover:bg-[#9BDDFF]/20 text-[#9BDDFF] rounded-lg transition-colors font-medium text-xs flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Full Sync 365d
                  </button>
                </div>
              )}

              {/* Unlink Button */}
              {canEditProfile && (
                <button
                  onClick={handleUnlinkVALD}
                  disabled={valdLinking}
                  className="w-full px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs"
                >
                  Unlink Profile
                </button>
              )}
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

        {/* Blast Motion Integration */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-white">Blast Motion</h3>
            {athlete.blast_player_id && (
              <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded text-emerald-400 text-xs font-semibold">
                ✓ Linked
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Link to sync hitting & swing data
          </p>

          {/* Current Blast Motion Status */}
          {athlete.blast_player_id ? (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-emerald-400 font-medium text-xs">Player Linked</p>
                    <p className="text-emerald-200 text-xs mt-1">
                      Player ID: {athlete.blast_player_id}
                    </p>
                    {athlete.blast_synced_at && (
                      <p className="text-emerald-200 text-xs mt-1">
                        Last synced: {new Date(athlete.blast_synced_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sync Buttons */}
              {canEditProfile && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setBlastSyncing(true);
                      setBlastMessage('');
                      fetch(`/api/athletes/${athlete.id}/blast/sync`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ daysBack: 30 })
                      })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success) {
                            setBlastMessage(`✅ Synced ${data.results.inserted} swings (${data.results.skipped} existed)`);
                            athlete.blast_synced_at = new Date().toISOString();
                          } else {
                            setBlastMessage('❌ Error: ' + (data.message || 'Unknown error'));
                          }
                        })
                        .catch(err => setBlastMessage('❌ Failed to sync'))
                        .finally(() => {
                          setBlastSyncing(false);
                          setTimeout(() => setBlastMessage(''), 5000);
                        });
                    }}
                    disabled={blastSyncing}
                    className="px-3 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs flex items-center justify-center gap-1.5"
                  >
                    {blastSyncing ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-solid border-black border-r-transparent"></div>
                        Syncing...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Sync 30d
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSyncBlast}
                    disabled={blastSyncing}
                    className="px-3 py-2 border border-[#9BDDFF] bg-[#9BDDFF]/10 hover:bg-[#9BDDFF]/20 text-[#9BDDFF] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs flex items-center justify-center gap-1.5"
                  >
                    {blastSyncing ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                        Syncing...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Full Sync 365d
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Unlink Button */}
              {canEditProfile && (
                <button
                  onClick={handleUnlinkBlast}
                  disabled={blastLinking}
                  className="w-full px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs"
                >
                  Unlink Player
                </button>
              )}
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
                    Search to link existing player
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search Button */}
          {!athlete.blast_player_id && canEditProfile && (
            <button
              onClick={handleSearchBlast}
              disabled={blastSearching || !athlete.first_name || !athlete.last_name}
              className="w-full px-3 py-2 bg-[#9BDDFF] text-black rounded-lg hover:bg-[#7BC5F0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs mb-3"
            >
              {blastSearching ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-black border-r-transparent"></div>
                  Searching...
                </span>
              ) : (
                'Search Blast Motion'
              )}
            </button>
          )}

          {/* Permission denied message */}
          {!athlete.blast_player_id && !canEditProfile && (
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-center mb-3">
              <p className="text-amber-400 text-xs">
                🔒 No permission to link
              </p>
            </div>
          )}

          {/* Success/Error Message */}
          {blastMessage && (
            <div className={`p-2 rounded-lg text-xs mb-3 ${
              blastMessage.startsWith('✅')
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {blastMessage}
            </div>
          )}

          {/* Search Results */}
          {blastMatches.length > 0 && canEditProfile && (
            <div className="space-y-2">
              <p className="text-xs text-white font-medium">Select player to link:</p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {blastMatches.map((player: any) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setSelectedBlastPlayer(player.id)}
                    className={`w-full px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedBlastPlayer === player.id
                        ? 'bg-emerald-500/30 border border-emerald-500'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">
                          {player.name}
                        </p>
                        {player.email && (
                          <p className="text-emerald-300 text-xs mt-0.5 truncate">
                            {player.email}
                          </p>
                        )}
                        <div className="flex gap-3 mt-1">
                          {player.position && (
                            <p className="text-gray-400 text-xs">
                              {player.position}
                            </p>
                          )}
                          {player.jersey_number && (
                            <p className="text-gray-400 text-xs">
                              #{player.jersey_number}
                            </p>
                          )}
                          <p className="text-gray-400 text-xs">
                            {player.total_swings} swings
                          </p>
                        </div>
                      </div>
                      {selectedBlastPlayer === player.id && (
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
                onClick={handleLinkBlast}
                disabled={!selectedBlastPlayer || blastLinking}
                className="w-full px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs"
              >
                {blastLinking ? 'Linking...' : 'Link Selected Player'}
              </button>
            </div>
          )}
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

      {/* VALD Unlink Confirmation Modal */}
      {showValdUnlinkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">Unlink VALD Profile</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Are you sure you want to unlink this VALD profile?
                </p>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm font-medium">
                    ⚠️ This action cannot be undone. All synced test data will be permanently deleted.
                  </p>
                </div>
                <p className="text-gray-300 text-sm mb-2">
                  Type <span className="font-bold text-white">Unlink Profile</span> to confirm:
                </p>
                <input
                  type="text"
                  value={valdUnlinkInput}
                  onChange={(e) => setValdUnlinkInput(e.target.value)}
                  placeholder="Unlink Profile"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowValdUnlinkModal(false);
                  setValdUnlinkInput('');
                }}
                disabled={valdLinking}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnlinkVALD}
                disabled={valdLinking || valdUnlinkInput !== 'Unlink Profile'}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {valdLinking ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                    Unlinking...
                  </>
                ) : (
                  'Unlink Profile'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blast Motion Unlink Confirmation Modal */}
      {showBlastUnlinkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">Unlink Blast Motion Player</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Are you sure you want to unlink this Blast Motion player?
                </p>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm font-medium">
                    ⚠️ This action cannot be undone. All synced swing data will be permanently deleted.
                  </p>
                </div>
                <p className="text-gray-300 text-sm mb-2">
                  Type <span className="font-bold text-white">Unlink Player</span> to confirm:
                </p>
                <input
                  type="text"
                  value={blastUnlinkInput}
                  onChange={(e) => setBlastUnlinkInput(e.target.value)}
                  placeholder="Unlink Player"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBlastUnlinkModal(false);
                  setBlastUnlinkInput('');
                }}
                disabled={blastLinking}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnlinkBlast}
                disabled={blastLinking || blastUnlinkInput !== 'Unlink Player'}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {blastLinking ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                    Unlinking...
                  </>
                ) : (
                  'Unlink Player'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
