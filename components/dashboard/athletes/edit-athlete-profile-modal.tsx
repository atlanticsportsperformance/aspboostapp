'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface EditAthleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  athleteData: any;
}

export default function EditAthleteProfileModal({
  isOpen,
  onClose,
  onSuccess,
  athleteData
}: EditAthleteProfileModalProps) {
  const { athlete, profile } = athleteData;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [primaryPosition, setPrimaryPosition] = useState('');
  const [secondaryPosition, setSecondaryPosition] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [playLevel, setPlayLevel] = useState<'Youth' | 'High School' | 'College' | 'Pro'>('High School');
  const [notes, setNotes] = useState('');

  // Track original play level and VALD data status
  const [originalPlayLevel, setOriginalPlayLevel] = useState<string>('');
  const [hasValdData, setHasValdData] = useState(false);

  useEffect(() => {
    if (isOpen && athlete) {
      // Populate form with current data
      setEmail(profile?.email || athlete.email || '');
      setPhone(athlete.phone || profile?.phone || '');
      setBirthDate(athlete.date_of_birth ? athlete.date_of_birth.split('T')[0] : '');
      setPrimaryPosition(athlete.primary_position || '');
      setSecondaryPosition(athlete.secondary_position || '');
      setGradYear(athlete.grad_year?.toString() || '');
      setPlayLevel(athlete.play_level || 'High School');
      setOriginalPlayLevel(athlete.play_level || 'High School');
      setNotes(athlete.notes || '');

      // Check if athlete has VALD data synced
      checkValdData();
    }
  }, [isOpen, athlete, profile]);

  const checkValdData = async () => {
    if (!athlete?.id) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('vald_tests')
        .select('id')
        .eq('athlete_id', athlete.id)
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasValdData(true);
      } else {
        setHasValdData(false);
      }
    } catch (err) {
      console.error('Error checking VALD data:', err);
      setHasValdData(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if play level changed and athlete has VALD data
    const playLevelChanged = playLevel !== originalPlayLevel;
    if (playLevelChanged && hasValdData) {
      const confirmed = window.confirm(
        `⚠️ Play Level Change Detected\n\n` +
        `This athlete has force plate data synced.\n\n` +
        `Changing from "${originalPlayLevel}" to "${playLevel}" will recalculate their Force Profile composite score using ${playLevel} percentile thresholds.\n\n` +
        `The radar chart and individual metric rankings will update immediately.\n\n` +
        `Historical test data will remain unchanged.\n\n` +
        `Continue?`
      );

      if (!confirmed) {
        return; // User cancelled
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (!email) {
        throw new Error('Email is required');
      }

      if (!playLevel) {
        throw new Error('Play level is required');
      }

      const supabase = createClient();

      // Update athlete record
      const { error: athleteError } = await supabase
        .from('athletes')
        .update({
          email,
          phone: phone || null,
          date_of_birth: birthDate || null,
          primary_position: primaryPosition || null,
          secondary_position: secondaryPosition || null,
          grad_year: gradYear ? parseInt(gradYear) : null,
          play_level: playLevel,
          notes: notes || null,
        })
        .eq('id', athlete.id);

      if (athleteError) {
        console.error('Athlete update error:', athleteError);
        throw new Error(athleteError.message || JSON.stringify(athleteError));
      }

      // If play level changed and has VALD data, trigger Force Profile recalculation
      if (playLevelChanged && hasValdData) {
        console.log(`[EditAthleteProfile] Play level changed from ${originalPlayLevel} to ${playLevel}, triggering Force Profile recalculation...`);

        try {
          const recalcResponse = await fetch(`/api/athletes/${athlete.id}/vald/recalculate-force-profile`, {
            method: 'POST',
          });

          const recalcData = await recalcResponse.json();

          if (recalcResponse.ok) {
            console.log('[EditAthleteProfile] Force Profile recalculated:', recalcData);
            alert(
              `✅ Profile updated successfully!\n\n` +
              `Force Profile recalculated with ${playLevel} percentile thresholds.\n` +
              `Processed ${recalcData.tests_processed} test(s).\n` +
              `New composite score: ${recalcData.composite_score || 'N/A'}th percentile`
            );
          } else {
            console.warn('[EditAthleteProfile] Force Profile recalculation failed:', recalcData);
            alert(
              `✅ Profile updated successfully!\n\n` +
              `⚠️ Force Profile recalculation failed: ${recalcData.error || 'Unknown error'}\n\n` +
              `You can manually sync VALD data to update percentiles.`
            );
          }
        } catch (recalcErr) {
          console.error('[EditAthleteProfile] Error recalculating Force Profile:', recalcErr);
          alert(
            `✅ Profile updated successfully!\n\n` +
            `⚠️ Could not recalculate Force Profile automatically.\n\n` +
            `Please manually sync VALD data to update percentiles.`
          );
        }
      } else {
        alert('✅ Profile updated successfully!');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : (typeof err === 'object' && err !== null)
          ? JSON.stringify(err)
          : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Edit Athlete Profile</h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Contact Information */}
            <div>
              <h3 className="text-white font-semibold text-lg mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Athletic Information */}
            <div>
              <h3 className="text-white font-semibold text-lg mb-4">Athletic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Primary Position
                  </label>
                  <input
                    type="text"
                    value={primaryPosition}
                    onChange={(e) => setPrimaryPosition(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                    placeholder="e.g., QB, WR, RB"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Secondary Position
                  </label>
                  <input
                    type="text"
                    value={secondaryPosition}
                    onChange={(e) => setSecondaryPosition(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Graduation Year
                  </label>
                  <input
                    type="number"
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    min="2020"
                    max="2040"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                    placeholder="2025"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Play Level <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={playLevel}
                    onChange={(e) => setPlayLevel(e.target.value as any)}
                    required
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                  >
                    <option value="Youth" className="bg-[#0A0A0A]">Youth</option>
                    <option value="High School" className="bg-[#0A0A0A]">High School</option>
                    <option value="College" className="bg-[#0A0A0A]">College</option>
                    <option value="Pro" className="bg-[#0A0A0A]">Pro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <h3 className="text-white font-semibold text-lg mb-4">Notes</h3>
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Athlete Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent resize-none"
                  placeholder="Add any notes about this athlete (training preferences, injuries, goals, etc.)"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-[#0A0A0A] border-t border-white/10 p-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-2.5 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black rounded-lg transition-all disabled:opacity-50 font-semibold"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
