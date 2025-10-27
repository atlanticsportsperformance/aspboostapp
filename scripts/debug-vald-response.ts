import { SimpleVALDForceDecksAPI } from '../lib/vald/forcedecks-api';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function debugVALDResponse() {
  console.log('\n=== Debugging VALD API Response ===\n');

  const valdApi = new SimpleVALDForceDecksAPI();
  const scottProfileId = '631be93a-c3a2-4bb1-abff-f15577281858';

  // Use the EXACT same date the sync is using
  const modifiedFromUtc = '2025-09-22T18:07:59.621Z';

  try {
    const response = await valdApi.getTests(modifiedFromUtc, scottProfileId);
    const tests = response.tests || [];

    console.log(`VALD returned ${tests.length} tests\n`);

    console.log('All tests returned by VALD:');
    tests.forEach((test, idx) => {
      console.log(`\n${idx + 1}. ${test.testType} - ${test.testId}`);
      console.log(`   Recorded: ${test.recordedDateUtc}`);
      console.log(`   Modified: ${test.modifiedDateUtc}`);
    });

    // Check for SJ
    const sjTests = tests.filter(t => t.testType === 'SJ');
    console.log(`\n\n🔍 SJ tests in response: ${sjTests.length}`);

    if (sjTests.length === 0) {
      console.log('\n❌ NO SJ TESTS in VALD response');
      console.log('This means VALD API is NOT returning any SJ tests modified after 2025-09-22T18:07:59.621Z');
      console.log('\nThe SJ test from Sept 22 (97c143d4-2390-4e80-acba-58696120f435) has:');
      console.log('  Recorded: 2025-09-22T18:03:58.258Z');
      console.log('  Modified: 2025-09-22T18:05:00.823Z');
      console.log('\nSince modified date (18:05:00) is BEFORE the cutoff (18:07:59), VALD correctly excludes it.');
    } else {
      console.log('\n✅ SJ tests found in response!');
      sjTests.forEach(sj => {
        console.log(`  - ${sj.testId}`);
        console.log(`    Recorded: ${sj.recordedDateUtc}`);
        console.log(`    Modified: ${sj.modifiedDateUtc}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugVALDResponse()
  .then(() => {
    console.log('\n✅ Debug complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
