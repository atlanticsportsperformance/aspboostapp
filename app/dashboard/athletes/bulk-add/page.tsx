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

      {/* Table */}
      <div className="max-w-[100vw] overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[150px]">First Name*</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[150px]">Last Name*</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[200px]">Email*</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[140px]">Birth Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[80px]">Sex</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[150px]">Position</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[150px]">Secondary Pos</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[140px]">Play Level*</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[120px]">Grad Year</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[150px]">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[100px]">Login?</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[150px]">Password</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[100px]">VALD</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[100px]">Blast</th>
              <th className="px-4 py-3 text-left text-sm font-semibold min-w-[80px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={`border-b border-white/10 hover:bg-white/5 ${row.errors.length > 0 ? 'bg-red-500/10' : ''}`}
              >
                {/* Row Number */}
                <td className="px-4 py-2 text-sm text-gray-400">{index + 1}</td>

                {/* First Name */}
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={row.firstName}
                    onChange={(e) => updateRow(row.id, 'firstName', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#9BDDFF]"
                    placeholder="First name"
                  />
                </td>

                {/* Last Name */}
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={row.lastName}
                    onChange={(e) => updateRow(row.id, 'lastName', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#9BDDFF]"
                    placeholder="Last name"
                  />
                </td>

                {/* Email */}
                <td className="px-4 py-2">
                  <input
                    type="email"
                    value={row.email}
                    onChange={(e) => updateRow(row.id, 'email', e.target.value)}
                    className={`w-full bg-white/5 border rounded px-3 py-2 text-sm focus:outline-none focus:border-[#9BDDFF] ${
                      row.emailExists ? 'border-red-500' : 'border-white/10'
                    }`}
                    placeholder="email@example.com"
                  />
                  {row.emailExists && (
                    <p className="text-xs text-red-400 mt-1">Email exists</p>
                  )}
                </td>

                {/* Birth Date */}
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={row.birthDate}
                    onChange={(e) => updateRow(row.id, 'birthDate', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#9BDDFF]"
                  />
                </td>

                {/* Sex */}
                <td className="px-4 py-2">
                  <select
                    value={row.sex}
                    onChange={(e) => updateRow(row.id, 'sex', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#9BDDFF]"
                  >
                    <option value="">-</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </td>

                {/* Primary Position */}
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={row.primaryPosition}
                    onChange={(e) => updateRow(row.id, 'primaryPosition', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#9BDDFF]"
                    placeholder="Pitcher"
                  />
                </td>

                {/* Secondary Position */}
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={row.secondaryPosition}
                    onChange={(e) => updateRow(row.id, 'secondaryPosition', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#9BDDFF]"
                    placeholder="Outfield"
                  />
                </td>

                {/* Play Level */}
                <td className="px-4 py-2">
                  <select
                    value={row.playLevel}
                    onChange={(e) => updateRow(row.id, 'playLevel', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#9BDDFF]"
                  >
                    <option value="">Select</option>
                    <option value="Youth">Youth</option>
                    <option value="High School">High School</option>
                    <option value="College">College</option>
                    <option value="Pro">Pro</option>
                  </select>
                </td>

                {/* Grad Year */}
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={row.gradYear}
                    onChange={(e) => updateRow(row.id, 'gradYear', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#9BDDFF]"
                    placeholder="2025"
                  />
                </td>

                {/* Phone */}
                <td className="px-4 py-2">
                  <input
                    type="tel"
                    value={row.phone}
                    onChange={(e) => updateRow(row.id, 'phone', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#9BDDFF]"
                    placeholder="555-1234"
                  />
                </td>

                {/* Create Login */}
                <td className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={row.createLogin}
                    onChange={(e) => updateRow(row.id, 'createLogin', e.target.checked)}
                    className="w-4 h-4"
                  />
                </td>

                {/* Password */}
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={row.password}
                    onChange={(e) => updateRow(row.id, 'password', e.target.value)}
                    disabled={!row.createLogin}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#9BDDFF] disabled:opacity-50"
                    placeholder="Auto-generated"
                  />
                </td>

                {/* VALD Status */}
                <td className="px-4 py-2 text-center">
                  {row.valdSearching ? (
                    <span className="text-xs text-yellow-400">🔍</span>
                  ) : row.valdMatched ? (
                    <span className="text-xs text-green-400" title={`Found: ${row.valdProfile?.name}`}>✓</span>
                  ) : (
                    <span className="text-xs text-gray-600">-</span>
                  )}
                </td>

                {/* Blast Status */}
                <td className="px-4 py-2 text-center">
                  {row.blastSearching ? (
                    <span className="text-xs text-yellow-400">🔍</span>
                  ) : row.blastMatched ? (
                    <span className="text-xs text-green-400" title={`Found: ${row.blastProfile?.name}`}>✓</span>
                  ) : (
                    <span className="text-xs text-gray-600">-</span>
                  )}
                </td>

                {/* Remove Button */}
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Validation Errors Summary */}
      {rows.some(row => row.errors.length > 0) && (
        <div className="max-w-[100vw] mx-auto mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3 className="font-semibold text-red-400 mb-2">Validation Errors:</h3>
          <ul className="space-y-1">
            {rows.map((row, index) =>
              row.errors.length > 0 && (
                <li key={row.id} className="text-sm text-red-300">
                  Row {index + 1}: {row.errors.join(', ')}
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
