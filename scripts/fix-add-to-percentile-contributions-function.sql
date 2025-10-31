-- Drop the old broken function
DROP FUNCTION IF EXISTS add_to_percentile_contributions(uuid, text, text);

-- Since this function is not being used by the application code,
-- and the trigger auto_add_contribution_from_history() handles this correctly,
-- we can just drop it entirely.

SELECT '✅ Dropped broken add_to_percentile_contributions function' AS status;
SELECT 'The auto_add_contribution_from_history trigger handles contributions correctly' AS note;
