import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server client - for server components and API routes
// Uses cookies for session management
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from Server Component - can't set cookies
            // This is expected in some cases
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Called from Server Component - can't remove cookies
            // This is expected in some cases
          }
        },
      },
    }
  );
}

// Service role client - bypasses RLS, use only in trusted API routes
// DO NOT expose this client to the frontend!
export function createServiceRoleClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key
    {
      cookies: {
        get() { return undefined; },
        set() {},
        remove() {},
      },
    }
  );
}

// Helper to get current user from server
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
}