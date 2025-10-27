import { SimpleVALDForceDecksAPI } from '../lib/vald/forcedecks-api';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkTestIds() {
  console.log('\n=== Checking Specific Test IDs from Sync ===\n');

  const valdApi = new SimpleVALDForceDecksAPI();
  const scottProfileId = '631be93a-c3a2-4bb1-abff-f15577281858';

  // These are the test IDs from the sync logs
  const testIds = [
    '3d89132b-0584-4d29-a6fd-eb954cd5b142', // IMTP
    'ab8a252d-7699-4ea2-aa84-49aeddd592d9', // CMJ
    'f5f66b22-2d8e-4b0b-975a-537558d267f0', // CMJ
    '2d395ae4-c30a-458a-a75d-f22a1db8ce05', // CMJ
  ];

  try {
    // Get all tests from Scott
    const response = await valdApi.getTests(new Date(0).toISOString(), scottProfileId);
    const allTests = response.tests || [];

    console.log('Test IDs from sync logs:\n');

    testIds.forEach((id) => {
      const test = allTests.find(t => t.testId === id);
      if (test) {
        console.log(`${test.testType} - ${id}`);
        console.log(`  Recorded: ${test.recordedDateUtc}`);
        console.log(`  Modified: ${test.modifiedDateUtc}`);
        console.log('');
      } else {
        console.log(`${id} - NOT FOUND`);
      }
    });

    // Check if the SJ test exists
    console.log('\nSJ Test from Sept 22:');
    const sjTest = allTests.find(t => t.testId === '97c143d4-2390-4e80-acba-58696120f435');
    if (sjTest) {
      console.log(`  Recorded: ${sjTest.recordedDateUtc}`);
      console.log(`  Modified: ${sjTest.modifiedDateUtc}`);
    } else {
      console.log('  NOT FOUND');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTestIds()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
