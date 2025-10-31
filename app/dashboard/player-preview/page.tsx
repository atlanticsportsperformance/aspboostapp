'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Athlete {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function PlayerPreviewPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadAthletes();
  }, []);

  async function loadAthletes() {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('app_role', 'athlete')
        .order('last_name', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Failed to load athletes:', error);
        return;
      }

      setAthletes(data || []);
    } catch (err) {
      console.error('Error loading athletes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function searchAthletes(query: string) {
    if (!query.trim()) {
      loadAthletes();
      return;
    }

    try {
      setSearching(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('app_role', 'athlete')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('last_name', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Search error:', error);
        return;
      }

      setAthletes(data || []);
    } catch (err) {
      console.error('Error searching athletes:', err);
    } finally {
      setSearching(false);
    }
  }

  function handlePreview() {
    if (selectedAthleteId) {
      // Redirect to athlete dashboard with preview mode
      router.push(`/dashboard/athletes/${selectedAthleteId}?preview=true`);
    }
  }

  const filteredAthletes = athletes.filter((athlete) => {
    const fullName = `${athlete.first_name} ${athlete.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Player Dashboard Preview</h1>
          <p className="text-gray-400">
            Select an athlete to view their dashboard as they would see it
          </p>
        </div>

        {/* Search and Selection Card */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-6">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Athletes
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchAthletes(e.target.value);
              }}
              placeholder="Search by name or email..."
              className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]/50"
            />
          </div>

          {/* Athlete Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Athlete {filteredAthletes.length > 0 && `(${filteredAthletes.length} found)`}
            </label>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                Loading athletes...
              </div>
            ) : filteredAthletes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No athletes found
              </div>
            ) : (
              <div className="bg-black/40 border border-white/10 rounded-lg max-h-96 overflow-y-auto">
                {filteredAthletes.map((athlete) => (
                  <button
                    key={athlete.id}
                    onClick={() => setSelectedAthleteId(athlete.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 ${
                      selectedAthleteId === athlete.id
                        ? 'bg-[#9BDDFF]/10 border-l-4 border-l-[#9BDDFF]'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">
                          {athlete.first_name} {athlete.last_name}
                        </div>
                        <div className="text-gray-400 text-sm">{athlete.email}</div>
                      </div>
                      {selectedAthleteId === athlete.id && (
                        <svg className="w-5 h-5 text-[#9BDDFF]" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview Button */}
          <button
            onClick={handlePreview}
            disabled={!selectedAthleteId}
            className="w-full px-6 py-3 bg-[#9BDDFF] text-black font-semibold rounded-lg hover:bg-[#B0E5FF] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {selectedAthleteId ? 'View Player Dashboard' : 'Select an athlete to preview'}
          </button>

          {/* Info Note */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-blue-300 text-sm font-medium mb-1">Preview Mode</p>
                <p className="text-blue-300/80 text-sm">
                  You'll see the athlete's dashboard exactly as they would see it. This is useful for testing and troubleshooting the athlete experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
