'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AddAthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAthleteModal({ isOpen, onClose, onSuccess }: AddAthleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Personal Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');

  // Athletic Information
  const [primaryPosition, setPrimaryPosition] = useState('');
  const [secondaryPosition, setSecondaryPosition] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [playLevel, setPlayLevel] = useState<'Youth' | 'High School' | 'College' | 'Pro'>('High School');

  // VALD Integration Options
  const [createValdProfile, setCreateValdProfile] = useState(true);
  const [linkExistingVald, setLinkExistingVald] = useState(false);
  const [existingValdProfileId, setExistingValdProfileId] = useState('');
  const [searchingVald, setSearchingVald] = useState(false);
  const [valdSearchResult, setValdSearchResult] = useState<any>(null);
  const [hasSearchedEmail, setHasSearchedEmail] = useState(false);
  const [valdNameMatches, setValdNameMatches] = useState<any[]>([]);

  // DISABLED: Email search causes too many false matches
  // // Auto-search VALD when email is entered (debounced)
  // useEffect(() => {
  //   if (!email || !isOpen) return;
  //   // Reset search state when email changes
  //   setValdSearchResult(null);
  //   setHasSearchedEmail(false);
  //   // Debounce: wait 800ms after user stops typing
  //   const timer = setTimeout(() => {
  //     handleSearchValdProfile(true); // true = silent/auto search
  //   }, 800);
  //   return () => clearTimeout(timer);
  // }, [email, isOpen]);

  // Auto-search VALD by name (debounced) - PRIMARY SEARCH METHOD
  useEffect(() => {
    if (!firstName || !lastName || !isOpen) {
      setValdNameMatches([]);
      return;
    }

    // Debounce: wait 800ms after user stops typing
    const timer = setTimeout(() => {
      handleSearchValdByName(true); // true = silent/auto search
    }, 800);

    return () => clearTimeout(timer);
  }, [firstName, lastName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!firstName || !lastName || !email) {
        throw new Error('First name, last name, and email are required');
      }

      if (createValdProfile && !birthDate) {
        throw new Error('Birth date is required to create a VALD profile');
      }

      if (linkExistingVald && !existingValdProfileId) {
        throw new Error('Please enter the VALD profile ID to link');
      }

      // Call API endpoint to create athlete
      const response = await fetch('/api/athletes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phone || null,
          birthDate: birthDate || null,
          sex,
          primaryPosition: primaryPosition || null,
          secondaryPosition: secondaryPosition || null,
          gradYear: gradYear ? parseInt(gradYear) : null,
          playLevel,
          createValdProfile,
          linkExistingVald,
          existingValdProfileId: existingValdProfileId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create athlete');
      }

      // Success!
      alert(`✅ Athlete created successfully!${data.vald_profile_created ? '\n🔗 VALD profile created and linked' : ''}${data.vald_profile_linked ? '\n🔗 Existing VALD profile linked' : ''}`);

      // Reset form
      resetForm();

      // Close modal and refresh list
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating athlete:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchValdByName = async (isAutoSearch = false) => {
    if (!firstName || !lastName) {
      return;
    }

    try {
      const response = await fetch(`/api/vald/search-by-name?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search VALD profiles by name');
      }

      if (data.found && data.profiles && data.profiles.length > 0) {
        console.log(`Found ${data.profiles.length} VALD profile(s) matching name`);
        setValdNameMatches(data.profiles);
      } else {
        setValdNameMatches([]);
      }
    } catch (err) {
      console.error('Error searching VALD profiles by name:', err);
      // Silent failure for auto-search
      setValdNameMatches([]);
    }
  };

  const handleSearchValdProfile = async (isAutoSearch = false) => {
    if (!email) {
      if (!isAutoSearch) {
        setError('Please enter an email address first');
      }
      return;
    }

    // Validate email format before searching
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      // Don't show error for auto-search, user is still typing
      if (!isAutoSearch) {
        setError('Please enter a valid email address');
      }
      return;
    }

    setSearchingVald(true);
    setValdSearchResult(null);
    if (!isAutoSearch) {
      setError(null);
    }

    try {
      const response = await fetch(`/api/vald/search-profile?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search VALD profile');
      }

      setValdSearchResult(data);
      setHasSearchedEmail(true);

      if (data.found) {
        // Existing VALD profile found
        setExistingValdProfileId(data.profile.profileId);

        // Only auto-fill and auto-link if names match or are empty
        const valdFirstName = data.profile.givenName?.toLowerCase().trim();
        const valdLastName = data.profile.familyName?.toLowerCase().trim();
        const enteredFirstName = firstName?.toLowerCase().trim();
        const enteredLastName = lastName?.toLowerCase().trim();

        const namesMatch = (
          (!enteredFirstName || valdFirstName === enteredFirstName) &&
          (!enteredLastName || valdLastName === enteredLastName)
        );

        if (namesMatch) {
          // Names match or are empty - safe to auto-link
          setLinkExistingVald(true);
          setCreateValdProfile(false);

          // Auto-fill fields if empty
          if (!firstName && data.profile.givenName) setFirstName(data.profile.givenName);
          if (!lastName && data.profile.familyName) setLastName(data.profile.familyName);
          if (!birthDate && data.profile.dateOfBirth) setBirthDate(data.profile.dateOfBirth.split('T')[0]);
        } else {
          // Names don't match - don't auto-link, let user decide
          // Keep the name they entered, don't overwrite
          setLinkExistingVald(false);
        }
      } else {
        // No VALD profile found - suggest creating new one
        if (!linkExistingVald) {
          setCreateValdProfile(true);
        }
      }
    } catch (err) {
      console.error('Error searching VALD profile:', err);
      // Only show error for manual searches, not auto-searches
      if (!isAutoSearch) {
        setError(err instanceof Error ? err.message : 'Unknown error searching VALD profile');
      }
    } finally {
      setSearchingVald(false);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setBirthDate('');
    setSex('M');
    setPrimaryPosition('');
    setSecondaryPosition('');
    setGradYear('');
    setPlayLevel('High School');
    setCreateValdProfile(true);
    setLinkExistingVald(false);
    setExistingValdProfileId('');
    setSearchingVald(false);
    setValdSearchResult(null);
    setHasSearchedEmail(false);
    setValdNameMatches([]);
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Add New Athlete</h2>
            <p className="text-gray-400 text-sm mt-1">Create a new athlete profile with optional VALD integration</p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-red-400 font-semibold">Error</h4>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                  placeholder="John"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent pr-10"
                    placeholder="john.doe@example.com"
                  />
                  {searchingVald && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-5 w-5 border-2 border-white/20 border-t-[#9BDDFF] rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                {email && hasSearchedEmail && (
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                    {valdSearchResult?.found ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-emerald-400">VALD profile found - will link existing account</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>No VALD profile found - will create new profile</span>
                      </>
                    )}
                  </p>
                )}
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
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Birth Date {createValdProfile && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required={createValdProfile}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Sex {createValdProfile && <span className="text-red-400">*</span>}
                </label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as 'M' | 'F')}
                  required={createValdProfile}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                >
                  <option value="M" className="bg-[#0A0A0A]">Male</option>
                  <option value="F" className="bg-[#0A0A0A]">Female</option>
                </select>
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
                  Play Level
                </label>
                <select
                  value={playLevel}
                  onChange={(e) => setPlayLevel(e.target.value as any)}
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

          {/* VALD Integration - Automatic Detection */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              VALD ForceDecks Integration
            </h3>

            {/* Automatic VALD Status - NAME SEARCH ONLY */}
            {valdNameMatches.length > 0 ? (
              /* Found matching VALD profiles by name */
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <div className="flex gap-3">
                    <svg className="w-6 h-6 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-emerald-400 font-semibold">Existing VALD Profile(s) Found</h4>
                      <p className="text-emerald-300 text-sm mt-1">
                        Found {valdNameMatches.length} VALD profile(s) matching "{firstName} {lastName}"
                      </p>
                      <p className="text-emerald-200 text-xs mt-2">
                        Select the correct profile below to link and sync test data.
                      </p>

                      {/* Show name-based matches */}
                      <div className="mt-3 pt-3 border-t border-emerald-500/20">
                        <p className="text-emerald-200 text-xs font-semibold mb-2">
                          Select profile to link:
                        </p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {valdNameMatches.map((profile: any) => (
                            <button
                              key={profile.profileId}
                              type="button"
                              onClick={() => {
                                setExistingValdProfileId(profile.profileId);
                                setLinkExistingVald(true);
                                setCreateValdProfile(false);
                                if (profile.dateOfBirth && !birthDate) {
                                  setBirthDate(profile.dateOfBirth.split('T')[0]);
                                }
                              }}
                              className={`w-full px-3 py-2.5 rounded text-left transition-colors ${
                                existingValdProfileId === profile.profileId
                                  ? 'bg-emerald-500/30 border-2 border-emerald-500'
                                  : 'bg-white/5 hover:bg-white/10 border border-white/10'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-white text-sm font-medium">
                                    {profile.givenName} {profile.familyName}
                                  </p>
                                  <p className="text-gray-400 text-xs mt-0.5">
                                    DOB: {new Date(profile.dateOfBirth).toLocaleDateString()}
                                  </p>
                                  <p className="text-gray-500 text-xs font-mono mt-0.5">
                                    ID: {profile.profileId}
                                  </p>
                                </div>
                                {existingValdProfileId === profile.profileId && (
                                  <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setLinkExistingVald(false);
                            setCreateValdProfile(true);
                            setExistingValdProfileId('');
                          }}
                          className="w-full mt-3 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-300 text-sm transition-colors"
                        >
                          Create new VALD profile instead
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : firstName && lastName ? (
              /* No matches found - will create new */
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-blue-400 font-semibold">No Existing VALD Profile</h4>
                    <p className="text-blue-300 text-sm mt-1">
                      No VALD profile found for "{firstName} {lastName}"
                    </p>
                    <p className="text-blue-200 text-xs mt-2">
                      A new VALD profile will be automatically created. Birth date and sex are required.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Waiting for name input */
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold">Enter Name to Check VALD</h4>
                    <p className="text-gray-400 text-sm mt-1">
                      We'll automatically search for existing VALD profiles when you enter first and last name.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* OLD COMPLEX LOGIC - REMOVED */}
            {false && valdSearchResult?.found ? (
              <div className="space-y-4">
                {/* Check if names match */}
                {(() => {
                  const valdFirstName = valdSearchResult.profile.givenName?.toLowerCase().trim();
                  const valdLastName = valdSearchResult.profile.familyName?.toLowerCase().trim();
                  const enteredFirstName = firstName?.toLowerCase().trim();
                  const enteredLastName = lastName?.toLowerCase().trim();

                  const namesMatch = (
                    (!enteredFirstName || valdFirstName === enteredFirstName) &&
                    (!enteredLastName || valdLastName === enteredLastName)
                  );

                  if (!namesMatch && enteredFirstName && enteredLastName) {
                    // Names don't match - show warning
                    return (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex gap-3">
                          <svg className="w-6 h-6 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="flex-1">
                            <h4 className="text-yellow-400 font-semibold">Name Mismatch Detected</h4>
                            <div className="text-yellow-300 text-sm mt-2 space-y-1">
                              <p>
                                <span className="font-medium">VALD has:</span> {valdSearchResult.profile.givenName} {valdSearchResult.profile.familyName}
                              </p>
                              <p>
                                <span className="font-medium">You entered:</span> {firstName} {lastName}
                              </p>
                            </div>
                            <p className="text-yellow-200 text-xs mt-3">
                              The email <span className="font-mono">{email}</span> is registered to a different athlete in VALD.
                            </p>
                            <div className="mt-3 pt-3 border-t border-yellow-500/20">
                              <p className="text-yellow-200 text-xs font-semibold mb-2">What would you like to do?</p>
                              <div className="space-y-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Ignore the mismatch - proceed with the athlete you entered
                                    // This overrides the warning and doesn't link to the wrong VALD profile
                                    setLinkExistingVald(false);
                                    setCreateValdProfile(true);
                                    setExistingValdProfileId('');
                                    setValdSearchResult(null); // Clear the mismatch warning
                                  }}
                                  className="w-full px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded text-emerald-200 text-sm font-medium transition-colors text-left"
                                >
                                  ✓ This is a VALD data error - ignore and proceed with <strong>{firstName} {lastName}</strong>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Link to the VALD profile and use their name
                                    setFirstName(valdSearchResult.profile.givenName);
                                    setLastName(valdSearchResult.profile.familyName);
                                    setLinkExistingVald(true);
                                    setCreateValdProfile(false);
                                  }}
                                  className="w-full px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded text-yellow-200 text-sm transition-colors text-left"
                                >
                                  Link to <strong>{valdSearchResult.profile.givenName} {valdSearchResult.profile.familyName}</strong>'s VALD account
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Create new VALD profile for the athlete you're entering
                                    setLinkExistingVald(false);
                                    setCreateValdProfile(true);
                                    setExistingValdProfileId('');
                                  }}
                                  className="w-full px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-blue-200 text-sm transition-colors text-left"
                                >
                                  Create new VALD profile for <strong>{firstName} {lastName}</strong> (use different email)
                                </button>
                              </div>

                              {/* Show name-based matches if available */}
                              {valdNameMatches.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-yellow-500/20">
                                  <p className="text-yellow-200 text-xs font-semibold mb-2">
                                    Or link to one of these {valdNameMatches.length} profile(s) with matching name:
                                  </p>
                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {valdNameMatches.map((profile: any) => (
                                      <button
                                        key={profile.profileId}
                                        type="button"
                                        onClick={() => {
                                          setExistingValdProfileId(profile.profileId);
                                          setLinkExistingVald(true);
                                          setCreateValdProfile(false);
                                          if (profile.dateOfBirth && !birthDate) {
                                            setBirthDate(profile.dateOfBirth.split('T')[0]);
                                          }
                                        }}
                                        className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-left transition-colors"
                                      >
                                        <p className="text-white text-sm font-medium">
                                          {profile.givenName} {profile.familyName}
                                        </p>
                                        <p className="text-gray-400 text-xs mt-0.5">
                                          DOB: {new Date(profile.dateOfBirth).toLocaleDateString()}
                                        </p>
                                        <p className="text-gray-500 text-xs font-mono">
                                          ID: {profile.profileId}
                                        </p>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // Names match - show success
                    return (
                      <>
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <div className="flex gap-3">
                            <svg className="w-6 h-6 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                              <h4 className="text-emerald-400 font-semibold">Existing VALD Profile Detected</h4>
                              <p className="text-emerald-300 text-sm mt-1">
                                {valdSearchResult.profile.givenName} {valdSearchResult.profile.familyName}
                              </p>
                              <p className="text-emerald-300/70 text-xs mt-0.5">
                                Profile ID: {valdSearchResult.profile.profileId}
                              </p>
                              <p className="text-emerald-200 text-xs mt-2">
                                This athlete's existing VALD profile will be automatically linked. All past test data will be synced.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Option to override and create new */}
                        <button
                          type="button"
                          onClick={() => {
                            setLinkExistingVald(false);
                            setCreateValdProfile(true);
                            setExistingValdProfileId('');
                          }}
                          className="text-xs text-gray-400 hover:text-white transition-colors underline"
                        >
                          Create new VALD profile instead (not recommended)
                        </button>
                      </>
                    );
                  }
                })()}
              </div>
            ) : hasSearchedEmail && valdSearchResult ? (
              <div className="space-y-4">
                {/* Check if we have name-based matches */}
                {valdNameMatches.length > 0 ? (
                  /* Found by name but not by email - likely email is missing in VALD */
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex gap-3">
                      <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <h4 className="text-blue-400 font-semibold">No Email Match, But Name Match Found</h4>
                        <p className="text-blue-300 text-sm mt-1">
                          No VALD profile found with email <span className="font-mono">{email}</span>, but found {valdNameMatches.length} profile(s) with matching name.
                        </p>
                        <p className="text-blue-200 text-xs mt-2">
                          This likely means the VALD profile exists but doesn't have an email address on file.
                        </p>

                        {/* Show name-based matches */}
                        <div className="mt-3 pt-3 border-t border-blue-500/20">
                          <p className="text-blue-200 text-xs font-semibold mb-2">
                            Select a profile to link:
                          </p>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {valdNameMatches.map((profile: any) => (
                              <button
                                key={profile.profileId}
                                type="button"
                                onClick={() => {
                                  setExistingValdProfileId(profile.profileId);
                                  setLinkExistingVald(true);
                                  setCreateValdProfile(false);
                                  if (profile.dateOfBirth && !birthDate) {
                                    setBirthDate(profile.dateOfBirth.split('T')[0]);
                                  }
                                }}
                                className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-left transition-colors"
                              >
                                <p className="text-white text-sm font-medium">
                                  {profile.givenName} {profile.familyName}
                                </p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                  DOB: {new Date(profile.dateOfBirth).toLocaleDateString()}
                                </p>
                                <p className="text-gray-500 text-xs font-mono">
                                  ID: {profile.profileId}
                                </p>
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setLinkExistingVald(false);
                              setCreateValdProfile(true);
                              setExistingValdProfileId('');
                            }}
                            className="w-full mt-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-blue-200 text-sm transition-colors"
                          >
                            Or create new VALD profile instead
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* No email match AND no name match - truly new */
                  <>
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex gap-3">
                        <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <div className="flex-1">
                          <h4 className="text-blue-400 font-semibold">No Existing VALD Profile</h4>
                          <p className="text-blue-300 text-sm mt-1">
                            A new VALD profile will be automatically created for this athlete.
                          </p>
                          <p className="text-blue-200 text-xs mt-2">
                            Birth date and sex are required to create a VALD profile.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Option to link existing manually */}
                    <details className="text-sm">
                      <summary className="text-gray-400 hover:text-white cursor-pointer transition-colors">
                        Have a VALD Profile ID? Click to link manually
                      </summary>
                      <div className="mt-3">
                        <input
                          type="text"
                          value={existingValdProfileId}
                          onChange={(e) => {
                            setExistingValdProfileId(e.target.value);
                            if (e.target.value) {
                              setLinkExistingVald(true);
                              setCreateValdProfile(false);
                            }
                          }}
                          placeholder="Enter VALD Profile ID"
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1.5">
                          Only use this if you know the exact Profile ID from VALD Hub.
                        </p>
                      </div>
                    </details>
                  </>
                )}
              </div>
            ) : (
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold">Enter Email to Check VALD</h4>
                    <p className="text-gray-400 text-sm mt-1">
                      We'll automatically check if this athlete has an existing VALD profile when you enter their email.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
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
              className="px-6 py-2.5 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black rounded-lg transition-all disabled:opacity-50 font-semibold flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Athlete
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
