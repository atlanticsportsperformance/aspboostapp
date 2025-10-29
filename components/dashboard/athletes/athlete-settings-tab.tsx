'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AthleteAccountSection from './athlete-account-section';

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

  const supabase = createClient();

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

  return (
    <div className="space-y-4">
      {/* Athlete View Type Selection */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6">
        <h3 className="text-lg lg:text-xl font-bold text-white mb-2">Athlete View Type</h3>
        <p className="text-sm text-gray-400 mb-4">
          Select the training focus category for this athlete. This helps organize and customize their experience.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#9BDDFF] border-r-transparent"></div>
              <p className="mt-2 text-gray-400 text-sm">Loading view types...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                View Type
              </label>
              <select
                value={selectedViewTypeId}
                onChange={(e) => setSelectedViewTypeId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] [&>option]:bg-[#1a1a1a] [&>option]:text-white"
              >
                <option value="">No specific type</option>
                {viewTypes.map((vt) => (
                  <option key={vt.id} value={vt.id}>
                    {vt.name}
                  </option>
                ))}
              </select>
              {selectedViewTypeId && viewTypes.find(vt => vt.id === selectedViewTypeId)?.description && (
                <p className="mt-2 text-xs text-gray-500">
                  {viewTypes.find(vt => vt.id === selectedViewTypeId)?.description}
                </p>
              )}
            </div>

            {/* Success/Error Message */}
            {message && (
              <div className={`p-3 rounded-lg text-sm ${
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
                className="px-4 py-2 bg-[#9BDDFF] text-black rounded-lg hover:bg-[#7BC5F0] disabled:opacity-50 transition-colors font-medium text-sm"
              >
                {saving ? 'Saving...' : 'Save View Type'}
              </button>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-300/80">
              View types can be customized in the Admin Settings. This setting can be changed at any time.
            </p>
          </div>
        </div>
      </div>

      {/* VALD Account Linking */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg lg:text-xl font-bold text-white">VALD Force Plates Integration</h3>
          {athlete.vald_profile_id && (
            <span className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded text-emerald-400 text-xs font-semibold">
              ✓ Linked
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Link this athlete to an existing VALD Force Plates profile to sync test data.
        </p>

        {/* Current VALD Status */}
        {athlete.vald_profile_id ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-emerald-400 font-semibold text-sm">VALD Profile Linked</p>
                <p className="text-emerald-200 text-xs mt-1 font-mono">{athlete.vald_profile_id}</p>
                <p className="text-emerald-300 text-xs mt-2">
                  This athlete's force plate data is syncing from VALD.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-amber-400 font-semibold text-sm">No VALD Profile Linked</p>
                <p className="text-amber-200 text-xs mt-1">
                  Search and link to an existing VALD profile to sync force plate data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search Button */}
        {!athlete.vald_profile_id && (
          <button
            onClick={handleSearchVALD}
            disabled={valdSearching || !athlete.first_name || !athlete.last_name}
            className="w-full px-4 py-2.5 bg-[#9BDDFF] text-black rounded-lg hover:bg-[#7BC5F0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm mb-4"
          >
            {valdSearching ? (
              <span className="flex items-center justify-center gap-2">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-black border-r-transparent"></div>
                Searching VALD...
              </span>
            ) : (
              `Search VALD for "${athlete.first_name} ${athlete.last_name}"`
            )}
          </button>
        )}

        {/* Success/Error Message */}
        {valdMessage && (
          <div className={`p-3 rounded-lg text-sm mb-4 ${
            valdMessage.startsWith('✅')
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {valdMessage}
          </div>
        )}

        {/* Search Results */}
        {valdMatches.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-white font-semibold">Select a VALD profile to link:</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {valdMatches.map((profile: any) => (
                <button
                  key={profile.profileId}
                  type="button"
                  onClick={() => setSelectedValdProfile(profile.profileId)}
                  className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedValdProfile === profile.profileId
                      ? 'bg-emerald-500/30 border-2 border-emerald-500'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">
                        {profile.givenName} {profile.familyName}
                      </p>
                      {profile.email ? (
                        <p className="text-emerald-300 text-xs mt-1">
                          📧 {profile.email}
                        </p>
                      ) : (
                        <p className="text-amber-400 text-xs mt-1 italic">
                          ⚠️ No email in VALD
                        </p>
                      )}
                      <p className="text-gray-400 text-xs mt-1">
                        DOB: {new Date(profile.dateOfBirth).toLocaleDateString()}
                      </p>
                      <p className="text-gray-500 text-xs font-mono mt-1">
                        ID: {profile.profileId}
                      </p>
                    </div>
                    {selectedValdProfile === profile.profileId && (
                      <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {valdLinking ? 'Linking...' : 'Link Selected Profile'}
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-300/80">
              {athlete.vald_profile_id
                ? 'VALD data syncs automatically. Force profile data appears in the Force Profile tab.'
                : 'Search uses the athlete\'s first and last name. Make sure the name matches their VALD profile exactly.'}
            </p>
          </div>
        </div>
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
