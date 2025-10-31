-- Check what the auto_add_contribution_from_history trigger function does

SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'auto_add_contribution_from_history';
