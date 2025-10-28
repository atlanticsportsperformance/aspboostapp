/**
 * Hook to get current user with role from Supabase
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserWithRole } from './roles';

export function useUserRole() {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      try {
        // Get current auth user
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        // Get profile with role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, email, app_role, org_id')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.error('Error loading user profile:', error);
          setUser(null);
          setLoading(false);
          return;
        }

        setUser({
          id: profile.id,
          email: profile.email,
          app_role: profile.app_role,
          org_id: profile.org_id,
        });
      } catch (err) {
        console.error('Error in useUserRole:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
