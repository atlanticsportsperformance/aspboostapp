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
