/**
 * Check what testType values VALD API is actually returning
 */

import { SimpleVALDForceDecksAPI } from '../lib/vald/forcedecks-api';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkVALDTestTypes() {
  console.log('\n=== Checking VALD Test Types ===\n');

  const valdApi = new SimpleVALDForceDecksAPI();

  // Scott's VALD profile ID (we need to find this first)
  // For now, let's get all tests from the past year
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  try {
    const response = await valdApi.getTests(oneYearAgo.toISOString());
    const tests = response.tests || [];

    console.log(`Found ${tests.length} total tests\n`);

    // Group by testType
    const testTypeCount: Record<string, number> = {};
    const testTypeSamples: Record<string, any[]> = {};

    tests.forEach((test) => {
      const type = test.testType;
      testTypeCount[type] = (testTypeCount[type] || 0) + 1;

      if (!testTypeSamples[type]) {
        testTypeSamples[type] = [];
      }

      if (testTypeSamples[type].length < 2) {
        testTypeSamples[type].push({
          testId: test.testId,
          recordedDate: test.recordedDateUtc,
          profileId: test.profileId,
        });
      }
    });

    console.log('Test Types Found:');
    console.log('==================\n');

    Object.entries(testTypeCount).forEach(([type, count]) => {
      console.log(`${type}: ${count} test(s)`);
      console.log(`  Sample tests:`);
      testTypeSamples[type].forEach((sample) => {
        console.log(`    - ${sample.testId} (${sample.recordedDate})`);
      });
      console.log('');
    });

    // Check for SJ specifically
    const sjTests = tests.filter((t) =>
      t.testType.toLowerCase().includes('sj') ||
      t.testType.toLowerCase().includes('squat')
    );

    if (sjTests.length > 0) {
      console.log('\n🎯 Found SJ/Squat Jump tests:');
      sjTests.forEach((test) => {
        console.log(`  ${test.testType} - ${test.testId} - ${test.recordedDateUtc}`);
      });
    } else {
      console.log('\n❌ No SJ or Squat Jump tests found');
    }

    // Check tests from 9/22/2025
    const sept22Tests = tests.filter((t) => {
      const date = new Date(t.recordedDateUtc);
      return date.getMonth() === 8 && date.getDate() === 22 && date.getFullYear() === 2025;
    });

    if (sept22Tests.length > 0) {
      console.log('\n📅 Tests from September 22, 2025:');
      sept22Tests.forEach((test) => {
        console.log(`  ${test.testType} - ${test.testId} - ${test.recordedDateUtc}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkVALDTestTypes()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
