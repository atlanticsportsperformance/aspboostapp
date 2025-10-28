import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public'
    }
  }
);

async function createFunction() {
  console.log('Creating delete_auth_user_cascade function...\n');

  const functionSQL = `
CREATE OR REPLACE FUNCTION delete_auth_user_cascade(user_id_to_delete UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  deleted_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Delete from public schema tables that reference the user

  -- Delete athlete records
  DELETE FROM public.athletes WHERE user_id = user_id_to_delete;
  IF FOUND THEN
    deleted_tables := array_append(deleted_tables, 'athletes');
  END IF;

  -- Delete staff records
  DELETE FROM public.staff WHERE user_id = user_id_to_delete;
  IF FOUND THEN
    deleted_tables := array_append(deleted_tables, 'staff');
  END IF;

  -- Delete coach_athletes assignments
  DELETE FROM public.coach_athletes WHERE coach_id = user_id_to_delete;
  IF FOUND THEN
    deleted_tables := array_append(deleted_tables, 'coach_athletes');
  END IF;

  -- Delete profile
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  IF FOUND THEN
    deleted_tables := array_append(deleted_tables, 'profiles');
  END IF;

  -- Delete from auth.identities (must come before auth.users)
  DELETE FROM auth.identities WHERE user_id = user_id_to_delete;
  IF FOUND THEN
    deleted_tables := array_append(deleted_tables, 'auth.identities');
  END IF;

  -- Delete from auth.sessions
  DELETE FROM auth.sessions WHERE user_id = user_id_to_delete;
  IF FOUND THEN
    deleted_tables := array_append(deleted_tables, 'auth.sessions');
  END IF;

  -- Delete from auth.mfa_factors (if exists)
  BEGIN
    DELETE FROM auth.mfa_factors WHERE user_id = user_id_to_delete;
    IF FOUND THEN
      deleted_tables := array_append(deleted_tables, 'auth.mfa_factors');
    END IF;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
  END;

  -- Delete from auth.refresh_tokens
  DELETE FROM auth.refresh_tokens WHERE user_id = user_id_to_delete;
  IF FOUND THEN
    deleted_tables := array_append(deleted_tables, 'auth.refresh_tokens');
  END IF;

  -- Finally, delete from auth.users
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  IF FOUND THEN
    deleted_tables := array_append(deleted_tables, 'auth.users');
  ELSE
    RAISE EXCEPTION 'User not found: %', user_id_to_delete;
  END IF;

  -- Return success with list of deleted tables
  result := json_build_object(
    'success', true,
    'user_id', user_id_to_delete,
    'deleted_from_tables', deleted_tables
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- Return error details
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_detail', SQLSTATE
  );
END;
$$;
  `;

  try {
    // Try using SQL editor approach
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        body: JSON.stringify({
          query: functionSQL
        })
      }
    );

    console.log('Response status:', response.status);
    const data = await response.text();
    console.log('Response:', data);

  } catch (e: any) {
    console.error('Error creating function:', e.message);
  }

  console.log('\n📝 The SQL function needs to be created manually in Supabase SQL Editor');
  console.log('Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
  console.log('\nCopy and paste the SQL from: scripts/create-delete-auth-user-function.sql');
  console.log('\nAfter creating the function, update the API to use it.');
}

createFunction().catch(console.error);
