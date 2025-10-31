-- TEMPORARY FIX: Disable triggers that are causing IMTP storage to fail
-- This allows IMTP tests to be stored while we fix the underlying function

-- First, let's see what triggers exist
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table IN ('cmj_tests', 'sj_tests', 'hj_tests', 'ppu_tests', 'imtp_tests')
  AND trigger_name LIKE '%contribution%'
ORDER BY event_object_table, trigger_name;

-- If there are triggers named like 'add_percentile_contribution_trigger' or similar,
-- uncomment and run these (replace TRIGGER_NAME with actual name):

-- DROP TRIGGER IF EXISTS add_percentile_contribution_trigger ON imtp_tests;
-- DROP TRIGGER IF EXISTS add_percentile_contribution_trigger ON cmj_tests;
-- DROP TRIGGER IF EXISTS add_percentile_contribution_trigger ON sj_tests;
-- DROP TRIGGER IF EXISTS add_percentile_contribution_trigger ON hj_tests;
-- DROP TRIGGER IF EXISTS add_percentile_contribution_trigger ON ppu_tests;

SELECT '✅ Check trigger names above, then uncomment DROP statements if needed' AS status;
