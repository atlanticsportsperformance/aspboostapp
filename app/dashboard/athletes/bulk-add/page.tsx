'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface AthleteRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  sex: 'M' | 'F' | '';
  primaryPosition: string;
  secondaryPosition: string;
  playLevel: 'Youth' | 'High School' | 'College' | 'Pro' | '';
  gradYear: string;
  phone: string;
  createLogin: boolean;
  password: string;

  // Integration matching
  valdProfile: any | null;
  valdSearching: boolean;
  valdMatched: boolean;

  blastProfile: any | null;
  blastSearching: boolean;
  blastMatched: boolean;

  // Validation
  errors: string[];
  emailExists: boolean;
}

export default function BulkAddAthletesPage() {
  const [rows, setRows] = useState<AthleteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [searchTimers, setSearchTimers] = useState<{ [key: string]: NodeJS.Timeout }>({});

  // Profile selection modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'vald' | 'blast' | null>(null);

  // Initialize with 3 empty rows
  useEffect(() => {
    const supabase = createClient();

    // Get organization ID
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile) {
          setOrganizationId(profile.organization_id);
        }
      }
    });

    setRows([
      createEmptyRow(),
      createEmptyRow(),
      createEmptyRow(),
    ]);
  }, []);

  function createEmptyRow(): AthleteRow {
    return {
      id: crypto.randomUUID(),
      firstName: '',
      lastName: '',
      email: '',
      birthDate: '',
      sex: '',
      primaryPosition: '',
      secondaryPosition: '',
      playLevel: '',
      gradYear: '',
      phone: '',
      createLogin: false,
      password: '',
      valdProfile: null,
      valdSearching: false,
      valdMatched: false,
      blastProfile: null,
      blastSearching: false,
      blastMatched: false,
      errors: [],
      emailExists: false,
    };
  }

  function addRow() {
    setRows([...rows, createEmptyRow()]);
  }

  function removeRow(id: string) {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  }

  function updateRow(id: string, field: keyof AthleteRow, value: any) {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };

        // Clear errors when user updates
        updated.errors = [];

        // Auto-generate password if createLogin is checked and password is empty
        if (field === 'createLogin' && value === true && !updated.password) {
          updated.password = generatePassword();
        }

        // Trigger email check
        if (field === 'email' && value) {
          checkEmailExists(id, value);
        }

        // Trigger VALD search when name or email changes (debounced)
        if ((field === 'firstName' || field === 'lastName' || field === 'email') &&
            (updated.firstName || updated.lastName || updated.email)) {
          // Clear existing timer
          if (searchTimers[`vald-${id}`]) {
            clearTimeout(searchTimers[`vald-${id}`]);
          }
          // Set new timer
          const timer = setTimeout(() => {
            searchVALDProfile(id, updated);
          }, 800);
          setSearchTimers(prev => ({ ...prev, [`vald-${id}`]: timer }));
        }

        // Trigger Blast Motion search when name or email changes (debounced)
        if ((field === 'firstName' || field === 'lastName' || field === 'email') &&
            (updated.firstName || updated.lastName || updated.email)) {
          // Clear existing timer
          if (searchTimers[`blast-${id}`]) {
            clearTimeout(searchTimers[`blast-${id}`]);
          }
          // Set new timer
          const timer = setTimeout(() => {
            searchBlastProfile(id, updated);
          }, 800);
          setSearchTimers(prev => ({ ...prev, [`blast-${id}`]: timer }));
        }

        return updated;
      }
      return row;
    }));
  }

  function generatePassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  function handleSelectValdProfile(rowId: string, profile: any) {
    // Auto-fill fields from VALD profile
    setRows(rows.map(row => {
      if (row.id === rowId) {
        const updated = { ...row };

        // Always update email from VALD
        if (profile.email) {
          updated.email = profile.email;
        }

        // Always update birth date from VALD
        if (profile.dateOfBirth) {
          updated.birthDate = profile.dateOfBirth.split('T')[0];
        }

        // Fill name fields if empty
        if (profile.givenName && !row.firstName) {
          updated.firstName = profile.givenName;
        }
        if (profile.familyName && !row.lastName) {
          updated.lastName = profile.familyName;
        }

        // Mark VALD as linked
        updated.valdProfile = profile;
        updated.valdMatched = true;

        return updated;
      }
      return row;
    }));

    setShowProfileModal(false);
  }

  function handleSelectBlastProfile(rowId: string, profile: any) {
    // Auto-fill fields from Blast Motion
    setRows(rows.map(row => {
      if (row.id === rowId) {
        const updated = { ...row };

        // Always update email from Blast if available
        if (profile.email) {
          updated.email = profile.email;
        }

        // Fill name fields if empty
        if (profile.first_name && !row.firstName) {
          updated.firstName = profile.first_name;
        }
        if (profile.last_name && !row.lastName) {
          updated.lastName = profile.last_name;
        }

        // Fill position if empty
        if (profile.position && !row.primaryPosition) {
          updated.primaryPosition = profile.position;
        }

        // Mark Blast as linked
        updated.blastProfile = profile;
        updated.blastMatched = true;

        return updated;
      }
      return row;
    }));

    setShowProfileModal(false);
  }

  async function checkEmailExists(rowId: string, email: string) {
    if (!email || !email.includes('@')) return;

    try {
      const response = await fetch('/api/athletes/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      setRows(rows => rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            emailExists: data.exists || data.isLinkedToAthlete,
          };
        }
        return row;
      }));
    } catch (error) {
      console.error('Error checking email:', error);
    }
  }

  async function searchVALDProfile(rowId: string, rowData: AthleteRow) {
    if (!rowData.firstName && !rowData.lastName && !rowData.email) return;

    setRows(rows => rows.map(row =>
      row.id === rowId ? { ...row, valdSearching: true } : row
    ));

    try {
      let data;

      // Try email search first if email exists
      if (rowData.email) {
        const emailResponse = await fetch(`/api/vald/search-profile?email=${encodeURIComponent(rowData.email)}`);
        data = await emailResponse.json();

        if (data.found) {
          setRows(rows => rows.map(row => {
            if (row.id === rowId) {
              return {
                ...row,
                valdSearching: false,
                valdMatched: true,
                valdProfile: data.profile,
              };
            }
            return row;
          }));
          return;
        }
      }

      // Try name search if email didn't find anything
      if (rowData.firstName && rowData.lastName) {
        const nameResponse = await fetch(
          `/api/vald/search-by-name?firstName=${encodeURIComponent(rowData.firstName)}&lastName=${encodeURIComponent(rowData.lastName)}`
        );
        data = await nameResponse.json();

        const matched = data.found && data.profiles && data.profiles.length > 0;
        setRows(rows => rows.map(row => {
          if (row.id === rowId) {
            return {
              ...row,
              valdSearching: false,
              valdMatched: matched,
              valdProfile: matched ? data.profiles[0] : null,
            };
          }
          return row;
        }));
      } else {
        setRows(rows => rows.map(row =>
          row.id === rowId ? { ...row, valdSearching: false } : row
        ));
      }
    } catch (error) {
      console.error('Error searching VALD:', error);
      setRows(rows => rows.map(row =>
        row.id === rowId ? { ...row, valdSearching: false } : row
      ));
    }
  }

  async function searchBlastProfile(rowId: string, rowData: AthleteRow) {
    if (!rowData.firstName && !rowData.lastName && !rowData.email) return;

    setRows(rows => rows.map(row =>
      row.id === rowId ? { ...row, blastSearching: true } : row
    ));

    try {
      const searchQuery = rowData.email || `${rowData.firstName} ${rowData.lastName}`.trim();

      const response = await fetch(`/api/blast/search-player?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      setRows(rows => rows.map(row => {
        if (row.id === rowId) {
          const matched = data.players && data.players.length > 0;
          return {
            ...row,
            blastSearching: false,
            blastMatched: matched,
            blastProfile: matched ? data.players[0] : null,
          };
        }
        return row;
      }));
    } catch (error) {
      console.error('Error searching Blast Motion:', error);
      setRows(rows => rows.map(row =>
        row.id === rowId ? { ...row, blastSearching: false } : row
      ));
    }
  }

  function validateRows(): boolean {
    let isValid = true;

    setRows(rows.map(row => {
      const errors: string[] = [];

      // Required fields
      if (!row.firstName.trim()) errors.push('First name required');
      if (!row.lastName.trim()) errors.push('Last name required');
      if (!row.email.trim()) errors.push('Email required');
      if (!row.playLevel) errors.push('Play level required');

      // Email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (row.email && !emailRegex.test(row.email)) {
        errors.push('Invalid email format');
      }

      // Email uniqueness
      if (row.emailExists) {
        errors.push('Email already exists');
      }

      // Check for duplicate emails in rows
      const duplicates = rows.filter(r => r.email === row.email && r.id !== row.id);
      if (duplicates.length > 0 && row.email) {
        errors.push('Duplicate email in list');
      }

      // Login validation
      if (row.createLogin && !row.password) {
        errors.push('Password required for login');
      }

      if (errors.length > 0) {
        isValid = false;
      }

      return { ...row, errors };
    }));

    return isValid;
  }

  async function handleSubmit() {
    if (!validateRows()) {
      alert('Please fix validation errors before submitting');
      return;
    }

    const validRows = rows.filter(row =>
      row.firstName.trim() &&
      row.lastName.trim() &&
      row.email.trim() &&
      row.playLevel
    );

    if (validRows.length === 0) {
      alert('Please add at least one athlete');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/athletes/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athletes: validRows.map(row => ({
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            birthDate: row.birthDate || null,
            sex: row.sex || null,
            positions: [row.primaryPosition, row.secondaryPosition].filter(Boolean),
            playLevel: row.playLevel,
            graduationYear: row.gradYear ? parseInt(row.gradYear) : null,
            phone: row.phone || null,
            createLogin: row.createLogin,
            password: row.password || null,
            linkVALD: row.valdMatched,
            valdProfileId: row.valdProfile?.id || null,
            linkBlastMotion: row.blastMatched,
            blastUserId: row.blastProfile?.blast_user_id || null,
          })),
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Success! Created ${result.successful} of ${result.total} athletes`);

        // Reset rows
        setRows([
          createEmptyRow(),
          createEmptyRow(),
          createEmptyRow(),
        ]);
      } else {
        alert(`Failed to create athletes: ${result.error}`);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Failed to create athletes');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      {/* Header */}
      <div className="max-w-[100vw] mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link
              href="/dashboard/athletes"
              className="text-gray-400 hover:text-white text-sm mb-2 inline-block"
            >
              ← Back to Athletes
            </Link>
            <h1 className="text-3xl font-bold">Bulk Add Athletes</h1>
            <p className="text-gray-400 mt-1">Add multiple athletes at once. Real-time VALD and Blast Motion matching.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addRow}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
            >
              + Add Row
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-gradient-to-r from-[#9BDDFF] to-[#7BC5F0] hover:from-[#8BCDEE] hover:to-[#6BB5E0] text-black font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {submitting ? 'Creating...' : `Create ${rows.filter(r => r.firstName && r.lastName && r.email && r.playLevel).length} Athletes`}
            </button>
          </div>
        </div>
      </div>

      {/* Two-Row Layout for Athletes */}
      <div className="max-w-[100vw] space-y-3">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className={`bg-white/5 border rounded-lg p-3 ${row.errors.length > 0 ? 'border-red-500/50 bg-red-500/10' : 'border-white/10'}`}
          >
            {/* Athlete Number Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-400">#{index + 1}</span>
                {row.valdMatched && (
                  <span className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-semibold rounded">
                    VALD ✓
                  </span>
                )}
                {row.blastMatched && (
                  <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/50 text-blue-400 text-xs font-semibold rounded">
                    BLAST ✓
                  </span>
                )}
              </div>
              <button
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Remove
              </button>
            </div>

            {/* Row 1: Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
              {/* First Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">First Name*</label>
                <input
                  type="text"
                  value={row.firstName}
                  onChange={(e) => updateRow(row.id, 'firstName', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#9BDDFF]"
                  placeholder="First"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Last Name*</label>
                <input
                  type="text"
                  value={row.lastName}
                  onChange={(e) => updateRow(row.id, 'lastName', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#9BDDFF]"
                  placeholder="Last"
                />
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1">Email*</label>
                <input
                  type="email"
                  value={row.email}
                  onChange={(e) => updateRow(row.id, 'email', e.target.value)}
                  className={`w-full bg-white/5 border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#9BDDFF] ${
                    row.emailExists ? 'border-red-500' : 'border-white/10'
                  }`}
                  placeholder="email@example.com"
                />
                {row.emailExists && (
                  <p className="text-xs text-red-400 mt-1">Email exists</p>
                )}
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Birth Date</label>
                <input
                  type="date"
                  value={row.birthDate}
                  onChange={(e) => updateRow(row.id, 'birthDate', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#9BDDFF]"
                />
              </div>
            </div>

            {/* Row 2: Athletic Info & Account */}
            <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
              {/* Sex */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Sex</label>
                <select
                  value={row.sex}
                  onChange={(e) => updateRow(row.id, 'sex', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#9BDDFF]"
                >
                  <option value="">-</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </div>

              {/* Primary Position */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Position</label>
                <input
                  type="text"
                  value={row.primaryPosition}
                  onChange={(e) => updateRow(row.id, 'primaryPosition', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#9BDDFF]"
                  placeholder="P"
                />
              </div>

              {/* Secondary Position */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Secondary</label>
                <input
                  type="text"
                  value={row.secondaryPosition}
                  onChange={(e) => updateRow(row.id, 'secondaryPosition', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#9BDDFF]"
                  placeholder="OF"
                />
              </div>

              {/* Play Level */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Play Level*</label>
                <select
                  value={row.playLevel}
                  onChange={(e) => updateRow(row.id, 'playLevel', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#9BDDFF]"
                >
                  <option value="">Select</option>
                  <option value="Youth">Youth</option>
                  <option value="High School">HS</option>
                  <option value="College">College</option>
                  <option value="Pro">Pro</option>
                </select>
              </div>

              {/* Grad Year */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Grad Year</label>
                <input
                  type="number"
                  value={row.gradYear}
                  onChange={(e) => updateRow(row.id, 'gradYear', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#9BDDFF]"
                  placeholder="2025"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={row.phone}
                  onChange={(e) => updateRow(row.id, 'phone', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#9BDDFF]"
                  placeholder="555-1234"
                />
              </div>

              {/* Create Login */}
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={row.createLogin}
                    onChange={(e) => updateRow(row.id, 'createLogin', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-xs text-gray-300">Login</span>
                </label>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Password</label>
                <input
                  type="text"
                  value={row.password}
                  onChange={(e) => updateRow(row.id, 'password', e.target.value)}
                  disabled={!row.createLogin}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#9BDDFF] disabled:opacity-50"
                  placeholder="Auto"
                />
              </div>
            </div>

            {/* Row 3: Integration Status */}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
              {/* VALD Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">VALD ForceDecks</label>
                {row.valdSearching ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="h-4 w-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-xs text-gray-400">Searching...</span>
                  </div>
                ) : row.valdMatched && row.valdProfile ? (
                  <button
                    onClick={() => {
                      setSelectedRowId(row.id);
                      setModalType('vald');
                      setShowProfileModal(true);
                    }}
                    className="w-full px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 rounded text-sm font-semibold transition-all"
                  >
                    ✓ {row.valdProfile.givenName} {row.valdProfile.familyName}
                  </button>
                ) : (
                  <div className="text-sm text-gray-600 py-2">No match found</div>
                )}
              </div>

              {/* Blast Motion Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Blast Motion</label>
                {row.blastSearching ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="h-4 w-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-xs text-gray-400">Searching...</span>
                  </div>
                ) : row.blastMatched && row.blastProfile ? (
                  <button
                    onClick={() => {
                      setSelectedRowId(row.id);
                      setModalType('blast');
                      setShowProfileModal(true);
                    }}
                    className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 rounded text-sm font-semibold transition-all"
                  >
                    ✓ {row.blastProfile.name}
                  </button>
                ) : (
                  <div className="text-sm text-gray-600 py-2">No match found</div>
                )}
              </div>
            </div>

            {/* Validation Errors */}
            {row.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">
                  {row.errors.join(', ')}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Profile Selection Modal */}
      {showProfileModal && selectedRowId && modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowProfileModal(false)}>
          <div className="bg-[#0A0A0A] border border-white/20 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  {modalType === 'vald' ? (
                    <>
                      <span className="text-2xl">⚡</span>
                      VALD Profile Found
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">⚾</span>
                      Blast Motion Player Found
                    </>
                  )}
                </h3>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {modalType === 'vald' && (() => {
                const row = rows.find(r => r.id === selectedRowId);
                const profile = row?.valdProfile;
                if (!profile) return null;

                return (
                  <div className="space-y-4">
                    <div className="p-6 bg-white/5 border-2 border-emerald-500/50 rounded-xl">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <h4 className="text-xl font-semibold text-white">
                              {profile.givenName} {profile.familyName}
                            </h4>
                            <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded">
                              VALD PROFILE
                            </span>
                          </div>

                          {profile.email ? (
                            <p className="text-emerald-300 text-base font-medium flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {profile.email}
                            </p>
                          ) : (
                            <p className="text-amber-400 text-base italic flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              No email in VALD
                            </p>
                          )}

                          <p className="text-gray-400 text-base flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            DOB: {new Date(profile.dateOfBirth).toLocaleDateString()}
                          </p>

                          <p className="text-gray-500 text-sm font-mono mt-3">
                            Profile ID: {profile.profileId}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSelectValdProfile(selectedRowId, profile)}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all"
                      >
                        Link & Auto-Fill Data
                      </button>
                      <button
                        onClick={() => setShowProfileModal(false)}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })()}

              {modalType === 'blast' && (() => {
                const row = rows.find(r => r.id === selectedRowId);
                const profile = row?.blastProfile;
                if (!profile) return null;

                return (
                  <div className="space-y-4">
                    <div className="p-6 bg-white/5 border-2 border-blue-500/50 rounded-xl">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <h4 className="text-xl font-semibold text-white">
                              {profile.name}
                            </h4>
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded">
                              BLAST MOTION
                            </span>
                          </div>

                          {profile.email ? (
                            <p className="text-blue-300 text-base font-medium flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {profile.email}
                            </p>
                          ) : (
                            <p className="text-amber-400 text-base italic flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              No email in Blast Motion
                            </p>
                          )}

                          {profile.position && (
                            <p className="text-gray-400 text-base flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                              </svg>
                              Position: {profile.position}
                            </p>
                          )}

                          {profile.total_actions > 0 && (
                            <p className="text-gray-400 text-base flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              {profile.total_actions} swings recorded
                            </p>
                          )}

                          <p className="text-gray-500 text-sm font-mono mt-3">
                            Blast ID: {profile.blast_user_id}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSelectBlastProfile(selectedRowId, profile)}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
                      >
                        Link & Auto-Fill Data
                      </button>
                      <button
                        onClick={() => setShowProfileModal(false)}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
