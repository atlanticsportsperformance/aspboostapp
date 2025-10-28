import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { StaffPermissions } from './permissions';

/**
 * React hook to fetch and manage staff permissions
 */
export function useStaffPermissions(staffId: string | null) {
  const [permissions, setPermissions] = useState<StaffPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staffId) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    async function fetchPermissions() {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('staff_permissions')
        .select('*')
        .eq('staff_id', staffId)
        .single();

      if (fetchError) {
        console.error('Error fetching staff permissions:', fetchError);
        setError(fetchError.message);
        setPermissions(null);
      } else {
        setPermissions(data);
      }

      setLoading(false);
    }

    fetchPermissions();
  }, [staffId]);

  return { permissions, loading, error };
}
