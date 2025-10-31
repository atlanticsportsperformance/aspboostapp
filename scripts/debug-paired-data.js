/**
 * Debug script to investigate why paired data isn't matching
 *
 * Run with: node -r dotenv/config scripts/debug-paired-data.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugPairedData(athleteId) {
  console.log('🔍 Debugging Paired Data for Athlete:', athleteId);
  console.log('═'.repeat(80));

  // 1. Check Blast swings
  const { data: blastSwings, error: blastError } = await supabase
    .from('blast_swings')
    .select('id, recorded_date, recorded_time, bat_speed')
    .eq('athlete_id', athleteId)
    .order('recorded_date', { ascending: false })
    .limit(10);

  if (blastError) {
    console.error('❌ Error fetching Blast swings:', blastError);
  } else {
    console.log('\n📊 BLAST SWINGS (Last 10):');
    console.log('─'.repeat(80));
    if (blastSwings && blastSwings.length > 0) {
      blastSwings.forEach((swing, i) => {
        console.log(`${i + 1}. Date: ${swing.recorded_date}, Time: ${swing.recorded_time}, Bat Speed: ${swing.bat_speed} mph`);
      });
      console.log(`\nTotal: ${blastSwings.length} swings shown`);
    } else {
      console.log('⚠️  No Blast swings found for this athlete');
    }
  }

  // 2. Check HitTrax sessions
  const { data: hittraxSessions, error: sessionsError } = await supabase
    .from('hittrax_sessions')
    .select('id, session_date, athlete_id')
    .eq('athlete_id', athleteId)
    .order('session_date', { ascending: false })
    .limit(10);

  if (sessionsError) {
    console.error('❌ Error fetching HitTrax sessions:', sessionsError);
  } else {
    console.log('\n📊 HITTRAX SESSIONS (Last 10):');
    console.log('─'.repeat(80));
    if (hittraxSessions && hittraxSessions.length > 0) {
      for (const session of hittraxSessions) {
        // Get swing count and sample swing
        const { data: swings } = await supabase
          .from('hittrax_swings')
          .select('id, swing_timestamp, exit_velocity')
          .eq('session_id', session.id)
          .order('swing_timestamp', { ascending: false })
          .limit(3);

        console.log(`\nSession: ${session.id}`);
        console.log(`  Date: ${session.session_date}`);
        console.log(`  Swings: ${swings?.length || 0}`);
        if (swings && swings.length > 0) {
          console.log(`  Sample swings:`);
          swings.forEach((swing, i) => {
            console.log(`    ${i + 1}. Timestamp: ${swing.swing_timestamp}, Exit Velo: ${swing.exit_velocity} mph`);
          });
        }
      }
      console.log(`\nTotal: ${hittraxSessions.length} sessions shown`);
    } else {
      console.log('⚠️  No HitTrax sessions found for this athlete');
    }
  }

  // 3. Check for date overlaps
  console.log('\n🔗 DATE OVERLAP ANALYSIS:');
  console.log('─'.repeat(80));

  if (blastSwings && blastSwings.length > 0 && hittraxSessions && hittraxSessions.length > 0) {
    const blastDates = [...new Set(blastSwings.map(s => s.recorded_date))];

    // Normalize HitTrax dates (extract just the date part from timestamp)
    const hittraxDates = [...new Set(hittraxSessions.map(s => {
      const date = new Date(s.session_date);
      return date.toISOString().split('T')[0];
    }))];

    console.log('\nBlast dates:', blastDates.join(', '));
    console.log('HitTrax dates (normalized):', hittraxDates.join(', '));

    const overlappingDates = blastDates.filter(date => hittraxDates.includes(date));

    if (overlappingDates.length > 0) {
      console.log('\n✅ OVERLAPPING DATES:', overlappingDates.join(', '));

      // For each overlapping date, show timestamps
      for (const date of overlappingDates) {
        console.log(`\n📅 Detailed view for ${date}:`);

        const blastOnDate = blastSwings.filter(s => s.recorded_date === date);
        const sessionsOnDate = hittraxSessions.filter(s => {
          // Extract date from session_date (could be full timestamp)
          const sessionDateStr = new Date(s.session_date).toISOString().split('T')[0];
          return sessionDateStr === date;
        });

        console.log(`  Blast swings: ${blastOnDate.length}`);
        blastOnDate.slice(0, 3).forEach(s => {
          const blastDateTime = new Date(`${s.recorded_date}T${s.recorded_time}-05:00`);
          console.log(`    - ${s.recorded_date} ${s.recorded_time} (Eastern) = ${blastDateTime.toISOString()}`);
        });

        console.log(`  HitTrax sessions: ${sessionsOnDate.length}`);
        for (const session of sessionsOnDate) {
          const { data: swings } = await supabase
            .from('hittrax_swings')
            .select('swing_timestamp')
            .eq('session_id', session.id)
            .limit(3);

          console.log(`    Session ${session.id}:`);
          swings?.forEach(s => {
            // Parse HitTrax timestamp
            const [datePart, timePart] = s.swing_timestamp.split(' ');
            const [month, day, year] = datePart.split('/');
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}-05:00`;
            const htxDateTime = new Date(dateStr);
            console.log(`      - ${s.swing_timestamp} (Eastern) = ${htxDateTime.toISOString()}`);
          });
        }
      }
    } else {
      console.log('\n❌ NO OVERLAPPING DATES FOUND');
      console.log('This is why paired data shows no matches!');
      console.log('\nPossible reasons:');
      console.log('  1. Athlete wore Blast sensor on different days than HitTrax sessions');
      console.log('  2. Data was synced from different time periods');
      console.log('  3. Date format mismatch (check timezone issues)');
    }
  }

  console.log('\n' + '═'.repeat(80));
}

// Get athlete ID from command line or use default
const athleteId = process.argv[2];

if (!athleteId) {
  console.error('Usage: node -r dotenv/config scripts/debug-paired-data.js <athlete-id>');
  console.error('\nExample: node -r dotenv/config scripts/debug-paired-data.js edf7a6b8-cd9c-4eb5-bb17-8484b2214910');
  process.exit(1);
}

debugPairedData(athleteId)
  .then(() => {
    console.log('✅ Debug complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
