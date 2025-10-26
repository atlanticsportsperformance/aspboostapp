const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrateFreshStart() {
  console.log('🚀 Starting fresh migration: Teams → Groups\n');
  console.log('⚠️  This will DELETE ALL existing teams and groups data!\n');

  // Step 1: Delete all existing groups data
  console.log('🗑️  Step 1: Clearing existing groups data...\n');

  // Delete group workout schedules first (foreign key dependency)
  const { error: schedError } = await supabase
    .from('group_workout_schedules')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (schedError) {
    console.error('❌ Error deleting group workout schedules:', schedError.message);
  } else {
    console.log('   ✅ Deleted all group workout schedules');
  }

  // Delete group members
  const { error: membersError } = await supabase
    .from('group_members')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (membersError) {
    console.error('❌ Error deleting group members:', membersError.message);
  } else {
    console.log('   ✅ Deleted all group members');
  }

  // Delete group tags
  const { error: tagsError } = await supabase
    .from('group_tags')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (tagsError) {
    console.error('❌ Error deleting group tags:', tagsError.message);
  } else {
    console.log('   ✅ Deleted all group tags');
  }

  // Delete groups
  const { error: groupsError } = await supabase
    .from('groups')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (groupsError) {
    console.error('❌ Error deleting groups:', groupsError.message);
  } else {
    console.log('   ✅ Deleted all groups');
  }

  console.log('\n🗑️  Step 2: Clearing old teams data...\n');

  // Delete team members
  const { error: teamMembersError } = await supabase
    .from('team_members')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (teamMembersError) {
    console.error('❌ Error deleting team members:', teamMembersError.message);
  } else {
    console.log('   ✅ Deleted all team members');
  }

  // Delete teams
  const { error: teamsError } = await supabase
    .from('teams')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (teamsError) {
    console.error('❌ Error deleting teams:', teamsError.message);
  } else {
    console.log('   ✅ Deleted all teams');
  }

  // Step 3: Delete any group-owned workouts (created from group calendar)
  console.log('\n🗑️  Step 3: Clearing group-owned workouts...\n');

  const { data: groupWorkouts } = await supabase
    .from('workouts')
    .select('id')
    .not('group_id', 'is', null);

  if (groupWorkouts && groupWorkouts.length > 0) {
    const workoutIds = groupWorkouts.map(w => w.id);

    // Get routine IDs for these workouts
    const { data: routines } = await supabase
      .from('routines')
      .select('id')
      .in('workout_id', workoutIds);

    if (routines && routines.length > 0) {
      const routineIds = routines.map(r => r.id);

      // Delete routine exercises
      await supabase
        .from('routine_exercises')
        .delete()
        .in('routine_id', routineIds);

      console.log(`   ✅ Deleted routine exercises for ${routineIds.length} routines`);

      // Delete routines
      await supabase
        .from('routines')
        .delete()
        .in('id', routineIds);

      console.log(`   ✅ Deleted ${routineIds.length} routines`);
    }

    // Delete workout instances (will be handled by database cascade, but let's be explicit)
    await supabase
      .from('workout_instances')
      .delete()
      .in('workout_id', workoutIds);

    console.log(`   ✅ Deleted workout instances for ${workoutIds.length} workouts`);

    // Delete the workouts themselves
    await supabase
      .from('workouts')
      .delete()
      .in('id', workoutIds);

    console.log(`   ✅ Deleted ${workoutIds.length} group-owned workouts`);
  } else {
    console.log('   ℹ️  No group-owned workouts found');
  }

  // Step 4: Clear any orphaned workout instances with source_type='group'
  console.log('\n🗑️  Step 4: Clearing orphaned group workout instances...\n');

  const { error: instancesError } = await supabase
    .from('workout_instances')
    .delete()
    .eq('source_type', 'group');

  if (instancesError) {
    console.error('❌ Error deleting orphaned instances:', instancesError.message);
  } else {
    console.log('   ✅ Deleted all group-sourced workout instances');
  }

  console.log('\n✅ Fresh start complete! All teams and groups data cleared.\n');
  console.log('📋 Summary:');
  console.log('   - Old teams system: ✅ Cleared');
  console.log('   - New groups system: ✅ Cleared');
  console.log('   - Group-owned workouts: ✅ Cleared');
  console.log('   - Group workout instances: ✅ Cleared');
  console.log('\n🎉 You can now create new groups from scratch!');
  console.log('\n💡 Next steps:');
  console.log('   1. Go to /dashboard/groups');
  console.log('   2. Click "Create Group"');
  console.log('   3. Add athletes to groups');
  console.log('   4. Start scheduling workouts on group calendars');
}

migrateFreshStart().catch(console.error);
