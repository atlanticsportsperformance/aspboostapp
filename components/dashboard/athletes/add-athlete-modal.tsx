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
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');

  // Athletic Information
  const [primaryPosition, setPrimaryPosition] = useState('');
  const [secondaryPosition, setSecondaryPosition] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [playLevel, setPlayLevel] = useState<'Youth' | 'High School' | 'College' | 'Pro' | ''>('');

  // Account Status
  const [isActive, setIsActive] = useState(true);

  // Login Account Options - Always create login accounts
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Email auth check
  const [emailAuthStatus, setEmailAuthStatus] = useState<{
    checking: boolean;
    hasAuthAccount: boolean;
    isLinkedToAthlete: boolean;
    isStaffAccount?: boolean;
    staffRole?: string;
    staffName?: string;
    athleteName?: string;
    message?: string;
    cannotCreateAthlete?: boolean;
  }>({
    checking: false,
    hasAuthAccount: false,
    isLinkedToAthlete: false,
  });

  // VALD Integration Options
  const [createValdProfile, setCreateValdProfile] = useState(true);
  const [linkExistingVald, setLinkExistingVald] = useState(false);
  const [existingValdProfileId, setExistingValdProfileId] = useState('');
  const [searchingVald, setSearchingVald] = useState(false);
  const [valdSearchResult, setValdSearchResult] = useState<any>(null);
  const [hasSearchedEmail, setHasSearchedEmail] = useState(false);
  const [valdNameMatches, setValdNameMatches] = useState<any[]>([]);
  const [selectedValdProfile, setSelectedValdProfile] = useState<any>(null);

  // Blast Motion Integration Options
  const [blastMotionMatches, setBlastMotionMatches] = useState<any[]>([]);
  const [searchingBlast, setSearchingBlast] = useState(false);
  const [selectedBlastProfile, setSelectedBlastProfile] = useState<any>(null);

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

  // Auto-check email for existing auth account
  useEffect(() => {
    if (!email || !isOpen) {
      setEmailAuthStatus({
        checking: false,
        hasAuthAccount: false,
        isLinkedToAthlete: false,
      });
      return;
    }

    // Validate email format before checking
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return;
    }

    // Debounce: wait 800ms after user stops typing
    const timer = setTimeout(async () => {
      setEmailAuthStatus(prev => ({ ...prev, checking: true }));

      try {
        const response = await fetch('/api/athletes/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (response.ok) {
          setEmailAuthStatus({
            checking: false,
            hasAuthAccount: data.hasAuthAccount,
            isLinkedToAthlete: data.isLinkedToAthlete,
            isStaffAccount: data.isStaffAccount,
            staffRole: data.staffRole,
            staffName: data.staffName,
            athleteName: data.athleteName,
            message: data.message,
            cannotCreateAthlete: data.cannotCreateAthlete,
          });

          // Clear password if email already has auth account or is staff account
          if (data.hasAuthAccount || data.isStaffAccount) {
            setPassword('');
          }
        } else {
          setEmailAuthStatus({
            checking: false,
            hasAuthAccount: false,
            isLinkedToAthlete: false,
          });
        }
      } catch (err) {
        console.error('Error checking email:', err);
        setEmailAuthStatus({
          checking: false,
          hasAuthAccount: false,
          isLinkedToAthlete: false,
        });
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [email, isOpen]);

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

  // Auto-search Blast Motion by name (debounced)
  useEffect(() => {
    console.log('🔍 Blast Motion Auto-Search Effect Triggered:', { firstName, lastName, email, isOpen });

    if ((!firstName && !lastName && !email) || !isOpen) {
      console.log('⏸️ Skipping Blast search: missing data or modal closed');
      setBlastMotionMatches([]);
      return;
    }

    console.log('⏰ Setting up Blast Motion search timer (800ms)...');

    // Debounce: wait 800ms after user stops typing
    const timer = setTimeout(() => {
      console.log('⏰ Timer fired! Calling handleSearchBlastMotion...');
      handleSearchBlastMotion(true); // true = silent/auto search
    }, 800);

    return () => {
      console.log('🧹 Cleaning up Blast search timer');
      clearTimeout(timer);
    };
  }, [firstName, lastName, email, isOpen]);

  if (!isOpen) return null;

  const generateRandomPassword = () => {
    // Generate a secure random password: 12 characters with letters, numbers, and symbols
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    setPassword(password);
  };

  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(password);
    // Could add a toast notification here if you have one
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!firstName || !lastName || !email) {
        throw new Error('First name, last name, and email are required');
      }

      if (!playLevel) {
        throw new Error('Play level is required');
      }

      if (createValdProfile && !birthDate) {
        throw new Error('Birth date is required to create a VALD profile');
      }

      if (linkExistingVald && !existingValdProfileId) {
        throw new Error('Please enter the VALD profile ID to link');
      }

      // Password is now required (always create login accounts)
      if (!password) {
        throw new Error('Please enter a password or generate a random one');
      }

      // Call API endpoint to create athlete (always create login account)
      const response = await fetch('/api/athletes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          birthDate: birthDate || null,
          sex,
          primaryPosition: primaryPosition || null,
          secondaryPosition: secondaryPosition || null,
          gradYear: gradYear ? parseInt(gradYear) : null,
          playLevel,
          isActive,
          createLoginAccount: true, // Always create login accounts
          password: password,
          createValdProfile,
          linkExistingVald,
          existingValdProfileId: existingValdProfileId || null,
          blastUserId: selectedBlastProfile?.blast_user_id || null,
          blastPlayerId: selectedBlastProfile?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create athlete');
      }

      // Success!
      let successMessage = `✅ Athlete created successfully!`;
      if (data.auth_account_created) successMessage += '\n🔐 Login account created';
      if (data.auth_account_linked) successMessage += '\n🔗 Existing login account linked';
      if (data.vald_profile_created) successMessage += '\n🔗 VALD profile created and linked';
      if (data.vald_profile_linked) successMessage += '\n🔗 Existing VALD profile linked';
      successMessage += `\n\n🔑 Password: ${password}\n(Make sure to save this!)`;

      alert(successMessage);

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

  const handleSearchBlastMotion = async (isAutoSearch = false) => {
    // Always search by name - Blast Motion API doesn't support email search
    // But we can filter results by email after getting them
    const searchQuery = `${firstName} ${lastName}`.trim();

    if (!searchQuery) {
      return;
    }

    console.log(`🔍 Searching Blast Motion for: "${searchQuery}"${email ? ` (will filter by email: ${email})` : ''}`);
    setSearchingBlast(true);

    try {
      const response = await fetch(`/api/blast/search-player?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      console.log('Blast Motion API response:', data);

      if (response.ok && data.success && data.players && data.players.length > 0) {
        console.log(`✅ Found ${data.players.length} Blast Motion player(s):`, data.players);

        // If we have an email, prioritize exact email matches
        if (email && email.trim()) {
          const emailLower = email.trim().toLowerCase();
          const exactMatches = data.players.filter((p: any) =>
            p.email && p.email.toLowerCase() === emailLower
          );

          if (exactMatches.length > 0) {
            console.log(`✅ Found ${exactMatches.length} exact email match(es)`);
            setBlastMotionMatches(exactMatches);
          } else {
            console.log(`⚠️ No exact email match, showing all ${data.players.length} name matches`);
            setBlastMotionMatches(data.players);
          }
        } else {
          setBlastMotionMatches(data.players);
        }
      } else {
        console.log('⚠️ No Blast Motion players found or API returned:', data);
        setBlastMotionMatches([]);
      }
    } catch (err) {
      console.error('❌ Error searching Blast Motion:', err);
      setBlastMotionMatches([]);
    } finally {
      setSearchingBlast(false);
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
    setBirthDate('');
    setSex('M');
    setPrimaryPosition('');
    setSecondaryPosition('');
    setGradYear('');
    setPlayLevel('High School');
    setIsActive(true);
    setPassword('');
    setShowPassword(false);
    setCreateValdProfile(true);
    setLinkExistingVald(false);
    setExistingValdProfileId('');
    setSearchingVald(false);
    setValdSearchResult(null);
    setHasSearchedEmail(false);
    setValdNameMatches([]);
    setSelectedValdProfile(null);
    setBlastMotionMatches([]);
    setSearchingBlast(false);
    setSelectedBlastProfile(null);
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
                  {emailAuthStatus.checking && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-5 w-5 border-2 border-white/20 border-t-[#9BDDFF] rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {/* Auth Account Status */}
                {email && emailAuthStatus.hasAuthAccount && !emailAuthStatus.isStaffAccount && (
                  <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <strong>Login account exists:</strong> {emailAuthStatus.message}
                    </p>
                    {emailAuthStatus.isLinkedToAthlete && (
                      <p className="text-xs text-amber-400 mt-1">
                        ⚠️ This email is already linked to athlete: <strong>{emailAuthStatus.athleteName}</strong>
                      </p>
                    )}
                    {!emailAuthStatus.isLinkedToAthlete && (
                      <p className="text-xs text-emerald-400 mt-1">
                        ✅ Will automatically link existing login account to this athlete profile
                      </p>
                    )}
                  </div>
                )}

                {/* Staff Account Warning in Email Field */}
                {email && emailAuthStatus.isStaffAccount && (
                  <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-300 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <strong>Login account exists:</strong> {emailAuthStatus.message}
                    </p>
                  </div>
                )}

                {email && !emailAuthStatus.checking && !emailAuthStatus.hasAuthAccount && (
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>No existing login account - you can create one below</span>
                  </p>
                )}
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

          {/* Account Status & Login */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="text-2xl">🔐</span>
              Account Status & Login
            </h3>

            {/* Active/Inactive Toggle */}
            <div className="mb-4">
              <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-gray-400'}`}></div>
                  <div>
                    <p className="text-white font-medium">Account Status</p>
                    <p className="text-gray-400 text-sm mt-0.5">
                      {isActive ? 'Active - Can log in and use the app' : 'Inactive - Login disabled (data preserved)'}
                    </p>
                  </div>
                </div>
                <div className="relative inline-block w-12 h-6">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    onClick={() => setIsActive(!isActive)}
                    className={`block w-12 h-6 rounded-full transition-colors ${
                      isActive ? 'bg-emerald-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                        isActive ? 'translate-x-6' : ''
                      }`}
                    ></div>
                  </div>
                </div>
              </label>
            </div>

            {/* Login Account Status/Options */}
            {emailAuthStatus.isStaffAccount ? (
              // Staff/Admin account - cannot create athlete
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-red-400 font-medium">🚫 Staff Account Detected</p>
                    <p className="text-red-300 text-sm mt-1">
                      This email belongs to <strong>{emailAuthStatus.staffName}</strong> ({emailAuthStatus.staffRole})
                    </p>
                    <p className="text-red-200 text-xs mt-2">
                      Staff/Admin/Coach accounts cannot be converted to athlete profiles. Please use a different email address.
                    </p>
                  </div>
                </div>
              </div>
            ) : emailAuthStatus.hasAuthAccount && !emailAuthStatus.isLinkedToAthlete ? (
              // Existing auth account - will auto-link
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-emerald-400 font-medium">✅ Login account will be linked automatically</p>
                    <p className="text-emerald-300 text-sm mt-1">
                      This email already has a login account. We'll link it to this athlete profile so they can log in right away.
                    </p>
                  </div>
                </div>
              </div>
            ) : emailAuthStatus.hasAuthAccount && emailAuthStatus.isLinkedToAthlete ? (
              // Already linked to another athlete - warning
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-amber-400 font-medium">⚠️ Email already in use</p>
                    <p className="text-amber-300 text-sm mt-1">
                      This email is already linked to: <strong>{emailAuthStatus.athleteName}</strong>
                    </p>
                    <p className="text-amber-200 text-xs mt-2">
                      Please use a different email or edit the existing athlete.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Password Field (only show if not staff account and no existing auth account) */}
            {!emailAuthStatus.hasAuthAccount && !emailAuthStatus.isStaffAccount && (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent pr-20"
                        placeholder="Enter password or generate random"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        {password && (
                          <button
                            type="button"
                            onClick={copyPasswordToClipboard}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="Copy to clipboard"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
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
                    </div>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Generate
                    </button>
                  </div>
                  {password && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      💡 Make sure to save this password - the athlete will need it to log in
                    </p>
                  )}
                </div>
              </div>
            )}
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
                                setSelectedValdProfile(profile);
                                setExistingValdProfileId(profile.profileId);
                                setLinkExistingVald(true);
                                setCreateValdProfile(false);

                                // Auto-fill ALL available fields from VALD profile
                                if (profile.email) {
                                  setEmail(profile.email);
                                }
                                if (profile.dateOfBirth) {
                                  setBirthDate(profile.dateOfBirth.split('T')[0]);
                                }
                                // VALD profiles might have first/last name - fill if not set
                                if (profile.givenName && !firstName) {
                                  setFirstName(profile.givenName);
                                }
                                if (profile.familyName && !lastName) {
                                  setLastName(profile.familyName);
                                }
                              }}
                              className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                                existingValdProfileId === profile.profileId
                                  ? 'bg-emerald-500/30 border-2 border-emerald-400 shadow-lg shadow-emerald-500/20'
                                  : 'bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-white text-base font-semibold">
                                      {profile.givenName} {profile.familyName}
                                    </p>
                                    {existingValdProfileId === profile.profileId && (
                                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded">
                                        SELECTED
                                      </span>
                                    )}
                                  </div>
                                  {profile.email ? (
                                    <p className="text-emerald-300 text-sm mt-1 font-medium flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                      {profile.email}
                                    </p>
                                  ) : (
                                    <p className="text-amber-400 text-sm mt-1 italic flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                      No email in VALD
                                    </p>
                                  )}
                                  <p className="text-gray-400 text-sm mt-1.5 flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    DOB: {new Date(profile.dateOfBirth).toLocaleDateString()}
                                  </p>
                                  <p className="text-gray-500 text-xs font-mono mt-1">
                                    Profile ID: {profile.profileId}
                                  </p>
                                </div>
                                <div className="flex-shrink-0">
                                  {existingValdProfileId === profile.profileId ? (
                                    <div className="px-3 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-lg flex items-center gap-1">
                                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Linked
                                    </div>
                                  ) : (
                                    <div className="px-3 py-1.5 bg-white/10 text-white text-sm font-medium rounded-lg">
                                      Select
                                    </div>
                                  )}
                                </div>
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
              /* No name matches found - will search by email then decide */
              <div className="space-y-3">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex gap-3">
                    <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-blue-400 font-semibold">No Name Match in VALD</h4>
                      <p className="text-blue-300 text-sm mt-1">
                        No VALD profile found by name: "{firstName} {lastName}"
                      </p>
                      <p className="text-blue-200 text-xs mt-2">
                        We'll search by <span className="font-semibold">email</span> to check if this athlete exists in VALD.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CRITICAL EMAIL EXPLANATION */}
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex gap-3">
                    <svg className="w-6 h-6 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-purple-400 font-semibold text-sm">🔍 How VALD Linking Works</h4>
                      <div className="text-purple-200 text-xs mt-2 space-y-2">
                        <p className="leading-relaxed">
                          <span className="font-semibold">Step 1:</span> We search VALD by <span className="font-semibold underline">email</span>
                        </p>
                        <p className="leading-relaxed">
                          <span className="font-semibold">✅ If found:</span> We'll link to the existing VALD profile (all test data syncs!)
                        </p>
                        <p className="leading-relaxed">
                          <span className="font-semibold">➕ If not found:</span> We'll create a new VALD profile
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* EMAIL WARNING */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex gap-3">
                    <svg className="w-6 h-6 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-amber-400 font-semibold text-sm">⚠️ Use Their VALD Email</h4>
                      <p className="text-amber-200 text-xs mt-2 leading-relaxed">
                        <span className="font-semibold">CRITICAL:</span> To avoid creating duplicates,
                        use the <span className="font-semibold underline">exact same email</span> as their VALD account.
                      </p>
                      <p className="text-amber-300 text-xs mt-2">
                        Email you entered: <span className="font-mono font-semibold">{email || '(not set yet)'}</span>
                      </p>
                      <p className="text-amber-200 text-xs mt-2 italic">
                        💡 Double-check this matches their VALD email before submitting!
                      </p>
                    </div>
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
          </div>

          {/* Blast Motion Integration */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="text-2xl">⚾</span>
              Blast Motion Integration
            </h3>

            {blastMotionMatches.length > 0 ? (
              /* Found matching Blast Motion profiles */
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex gap-3">
                    <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-blue-400 font-semibold">Blast Motion Player(s) Found</h4>
                      <p className="text-blue-300 text-sm mt-1">
                        Found {blastMotionMatches.length} Blast Motion player(s) matching your search
                      </p>
                      <p className="text-blue-200 text-xs mt-2">
                        Select the correct player below to link hitting metrics.
                      </p>

                      {/* Show Blast Motion matches */}
                      <div className="mt-3 pt-3 border-t border-blue-500/20">
                        <p className="text-blue-200 text-xs font-semibold mb-2">
                          Select player to link:
                        </p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {blastMotionMatches.map((player: any) => (
                            <button
                              key={player.id}
                              type="button"
                              onClick={() => {
                                setSelectedBlastProfile(player);

                                // Auto-fill fields from Blast Motion
                                if (player.email && !email) {
                                  setEmail(player.email);
                                }
                                if (player.first_name && !firstName) {
                                  setFirstName(player.first_name);
                                }
                                if (player.last_name && !lastName) {
                                  setLastName(player.last_name);
                                }
                                if (player.position && !primaryPosition) {
                                  setPrimaryPosition(player.position);
                                }
                              }}
                              className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                                selectedBlastProfile?.id === player.id
                                  ? 'bg-blue-500/30 border-2 border-blue-400 shadow-lg shadow-blue-500/20'
                                  : 'bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-white text-base font-semibold">
                                      {player.name}
                                    </p>
                                    {selectedBlastProfile?.id === player.id && (
                                      <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded">
                                        SELECTED
                                      </span>
                                    )}
                                  </div>
                                  {player.email ? (
                                    <p className="text-blue-300 text-sm mt-1 font-medium flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                      {player.email}
                                    </p>
                                  ) : (
                                    <p className="text-amber-400 text-sm mt-1 italic flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                      No email in Blast Motion
                                    </p>
                                  )}
                                  {player.position && (
                                    <p className="text-gray-400 text-sm mt-1.5 flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                      </svg>
                                      Position: {player.position}
                                    </p>
                                  )}
                                  {player.total_actions > 0 && (
                                    <p className="text-gray-400 text-sm mt-1 flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                      </svg>
                                      {player.total_actions} swings recorded
                                    </p>
                                  )}
                                  <p className="text-gray-500 text-xs font-mono mt-1">
                                    Blast ID: {player.blast_user_id}
                                  </p>
                                </div>
                                <div className="flex-shrink-0">
                                  {selectedBlastProfile?.id === player.id ? (
                                    <div className="px-3 py-1.5 bg-blue-500 text-white text-sm font-semibold rounded-lg flex items-center gap-1">
                                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Linked
                                    </div>
                                  ) : (
                                    <div className="px-3 py-1.5 bg-white/10 text-white text-sm font-medium rounded-lg">
                                      Select
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBlastProfile(null);
                          }}
                          className="w-full mt-3 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-300 text-sm transition-colors"
                        >
                          Don't link Blast Motion
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : searchingBlast ? (
              /* Searching for Blast Motion */
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex gap-3">
                  <div className="h-6 w-6 border-2 border-gray-400 border-t-white rounded-full animate-spin flex-shrink-0"></div>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold">Searching Blast Motion...</h4>
                    <p className="text-gray-400 text-sm mt-1">
                      Looking for players matching your search
                    </p>
                  </div>
                </div>
              </div>
            ) : (firstName || lastName || email) ? (
              /* No Blast Motion matches found */
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-gray-400 font-semibold">No Blast Motion Player Found</h4>
                    <p className="text-gray-500 text-sm mt-1">
                      No player found in Blast Motion matching this name or email. Hitting metrics won't be synced automatically.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Waiting for input */
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold">Enter Name to Check Blast Motion</h4>
                    <p className="text-gray-400 text-sm mt-1">
                      We'll automatically search for existing Blast Motion players when you enter a name or email.
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
              disabled={loading || emailAuthStatus.cannotCreateAthlete}
              className="px-6 py-2.5 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
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
