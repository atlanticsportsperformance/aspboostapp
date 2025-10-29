-- =====================================================
-- Assign created_by to Existing Training Plans
-- =====================================================
-- This script assigns the super_admin user as the creator
-- for all existing plans that don't have a created_by value.
-- This is needed after adding the permissions system to ensure
-- all plans have a creator assigned.

DO $$
DECLARE
  super_admin_id UUID;
  plans_updated INTEGER;
BEGIN
  -- Get the super_admin user ID
  SELECT id INTO super_admin_id
  FROM profiles
  WHERE app_role = 'super_admin'
  LIMIT 1;

  IF super_admin_id IS NULL THEN
    RAISE NOTICE 'No super_admin found. Please check your profiles table.';
    RAISE NOTICE 'You need to have at least one user with app_role = ''super_admin''';
  ELSE
    RAISE NOTICE 'Found super_admin ID: %', super_admin_id;

    -- Update all plans without a creator
    UPDATE training_plans
    SET created_by = super_admin_id,
        updated_at = NOW()
    WHERE created_by IS NULL;

    -- Get count of updated plans
    GET DIAGNOSTICS plans_updated = ROW_COUNT;

    RAISE NOTICE 'Successfully updated % plans with created_by = %', plans_updated, super_admin_id;

    -- Show summary
    RAISE NOTICE 'Total plans in database: %', (SELECT COUNT(*) FROM training_plans);
    RAISE NOTICE 'Plans with creator assigned: %', (SELECT COUNT(*) FROM training_plans WHERE created_by IS NOT NULL);
    RAISE NOTICE 'Plans without creator: %', (SELECT COUNT(*) FROM training_plans WHERE created_by IS NULL);
  END IF;
END $$;
