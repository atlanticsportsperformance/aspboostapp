'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkUserAndRedirect() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Check if user is an athlete
      const { data: profile } = await supabase
        .from('profiles')
        .select('app_role')
        .eq('id', user.id)
        .single();

      if (profile?.app_role === 'athlete') {
        // Redirect athlete to athlete dashboard
        router.push('/athlete-dashboard');
      } else {
        // Redirect coach/admin to main dashboard
        router.push('/dashboard');
      }
    }

    checkUserAndRedirect();
  }, [router]);

  // Show blank black screen while checking - no flash
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
    </div>
  );
}
