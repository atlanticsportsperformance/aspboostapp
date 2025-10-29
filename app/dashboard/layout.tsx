'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

const navLinks = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/athletes', label: 'Athletes', icon: '🏃' },
  { href: '/dashboard/staff', label: 'Staff', icon: '👥', adminOnly: true },
  { href: '/dashboard/groups', label: 'Groups', icon: '👫' },
];

const adminLinks = [
  { href: '/dashboard/coaches', label: 'Coaches Dashboard', icon: '🎯', superAdminOnly: true },
  { href: '/dashboard/admin', label: 'Settings', icon: '⚙️', superAdminOnly: true },
];

const programmingLinks = [
  { href: '/dashboard/exercises', label: 'Exercises', icon: '💪' },
  { href: '/dashboard/routines', label: 'Routines', icon: '🔄' },
  { href: '/dashboard/workouts', label: 'Workouts', icon: '🏋️' },
  { href: '/dashboard/plans', label: 'Plans', icon: '📋' },
];

const quickActions = [
  { label: 'Add Athlete', icon: '➕', action: 'add-athlete' },
  { label: 'Schedule', icon: '📅', action: 'schedule' },
  { label: 'Assign Plan', icon: '📋', action: 'assign-plan' },
  { label: 'Quick Log', icon: '✍️', action: 'quick-log' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [programmingOpen, setProgrammingOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isImmersiveRoute, setIsImmersiveRoute] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Fix hydration mismatch by only rendering interactive parts after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if we're in an immersive route (workout execution) - client-side only
  useEffect(() => {
    setIsImmersiveRoute(pathname?.includes('/execute') || false);
  }, [pathname]);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();

      console.log('=== LAYOUT AUTH DEBUG ===');

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('Auth error:', authError);
      }

      console.log('Current user:', user);
      console.log('User ID:', user?.id);

      if (authError || !user) {
        router.push('/sign-in');
        return;
      }

      setUser(user);

      // Get user profile using correct column name: app_role (not role)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, app_role, email')
        .eq('id', user.id)
        .single();

      console.log('Profile query result:', profileData);
      console.log('Profile error:', profileError);

      if (profileError) {
        console.error('Failed to load profile:', profileError);
      }

      setProfile(profileData);
    }

    loadUser();
  }, [router]);

  // Get user initials
  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  const displayName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : user?.email || 'User';

  const displayRole = profile?.app_role
    ? profile.app_role.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'User';

  const handleQuickAction = (action: string) => {
    alert(`Quick action: ${action}\n\nThis will open a modal in the full implementation.`);
  };

  // If immersive route, skip the dashboard chrome entirely
  if (isImmersiveRoute) {
    return <>{children}</>;
  }

  // If athlete, skip the navigation entirely
  const isAthlete = profile?.app_role === 'athlete';

  if (isAthlete) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Mobile Branding */}
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] shadow-lg shadow-[#9BDDFF]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-black font-bold text-sm">A</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm">ASP Boost+</h1>
            </div>
          </div>

          {/* Hamburger button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
          >
            {sidebarOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-[#0A0A0A] lg:bg-white/[0.02] border-r border-white/10 flex flex-col h-screen fixed top-0 left-0 lg:sticky lg:top-0 z-50 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] shadow-lg shadow-[#9BDDFF]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-black font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg">ASP Boost+</h1>
              <p className="text-gray-400 text-xs">Atlantic Sports Performance</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navLinks
            .filter((link) => {
              // Hide Staff tab from coaches
              if (link.adminOnly && profile?.app_role === 'coach') {
                return false;
              }
              return true;
            })
            .map((link) => {
              const isActive = mounted && pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 text-gray-400 hover:text-white hover:bg-white/5"
                  style={isActive ? {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'white'
                  } : undefined}
                >
                  <span className="text-lg">{link.icon}</span>
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              );
            })}


          {/* Programming Section - Collapsible */}
          <div className="pt-4">
            <button
              onClick={() => setProgrammingOpen(!programmingOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 text-gray-400 hover:text-white hover:bg-white/5"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">📋</span>
                <span className="text-sm font-medium">Programming</span>
              </div>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${programmingOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {programmingOpen && (
              <div className="mt-1 space-y-1">
                {programmingLinks.map((link) => {
                  const isActive = mounted && pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center space-x-3 px-3 py-2 ml-3 rounded-lg transition-all duration-200 text-gray-400 hover:text-white hover:bg-white/5"
                      style={isActive ? {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: 'white'
                      } : undefined}
                    >
                      <span className="text-lg">{link.icon}</span>
                      <span className="text-sm font-medium">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hitting Link */}
          <div className="pt-4">
            <Link
              href="/dashboard/hitting"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 text-gray-400 hover:text-white hover:bg-white/5"
              style={mounted && pathname === '/dashboard/hitting' ? {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'white'
              } : undefined}
            >
              <span className="text-lg">⚾</span>
              <span className="text-sm font-medium">Hitting</span>
            </Link>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-white/10 space-y-3">
          {/* Admin Links (for super_admin) */}
          {profile?.app_role === 'super_admin' && (
            <>
              <Link
                href="/dashboard/coaches"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  mounted && pathname === '/dashboard/coaches'
                    ? 'bg-white/5 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-lg">🎯</span>
                <span className="text-sm font-medium">Coaches Dashboard</span>
              </Link>
              <Link
                href="/dashboard/admin"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  mounted && pathname === '/dashboard/admin'
                    ? 'bg-white/5 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-lg">⚙️</span>
                <span className="text-sm font-medium">Settings</span>
              </Link>
            </>
          )}

          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{displayName}</p>
              <p className="text-gray-400 text-xs truncate">{displayRole}</p>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push('/sign-in');
            }}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-0 pt-[52px] lg:pt-0 pb-20 lg:pb-0">
        {children}
      </main>

    </div>
  );
}
