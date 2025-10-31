-- Check what triggers exist on the test tables

SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('cmj_tests', 'sj_tests', 'hj_tests', 'ppu_tests', 'imtp_tests')
ORDER BY event_object_table, trigger_name;
