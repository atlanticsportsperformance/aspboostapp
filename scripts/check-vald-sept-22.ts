import { SimpleVALDForceDecksAPI } from '../lib/vald/forcedecks-api';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkVALDSept22() {
  console.log('\n=== Checking VALD for September 22, 2025 ===\n');

  const valdApi = new SimpleVALDForceDecksAPI();
  const scottProfileId = '631be93a-c3a2-4bb1-abff-f15577281858';

  // Get all tests from Sept 22, 2025
  const sept22Start = new Date('2025-09-22T00:00:00Z');
  const sept22End = new Date('2025-09-23T00:00:00Z');

  try {
    const response = await valdApi.getTests(sept22Start.toISOString(), scottProfileId);
    const tests = response.tests || [];

    console.log(`Found ${tests.length} total tests for Scott on/after Sept 22, 2025\n`);

    // Filter by Sept 22 only
    const sept22Tests = tests.filter((t) => {
      const testDate = new Date(t.recordedDateUtc);
      return testDate >= sept22Start && testDate < sept22End;
    });

    console.log(`Tests specifically on September 22, 2025: ${sept22Tests.length}\n`);

    // Group by type
    const byType: Record<string, any[]> = {};
    sept22Tests.forEach((test) => {
      if (!byType[test.testType]) {
        byType[test.testType] = [];
      }
      byType[test.testType].push(test);
    });

    console.log('Breakdown by test type:');
    Object.entries(byType).forEach(([type, typeTests]) => {
      console.log(`\n${type}: ${typeTests.length} test(s)`);
      typeTests.forEach((test) => {
        console.log(`  - ${test.testId} at ${test.recordedDateUtc}`);
      });
    });

    // Check if SJ exists
    if (byType['SJ']) {
      console.log(`\n✅ SJ tests found on Sept 22!`);
    } else {
      console.log(`\n❌ NO SJ tests found on Sept 22`);

      // Check if any SJ tests exist at all for Scott
      const allResponse = await valdApi.getTests(new Date(0).toISOString(), scottProfileId);
      const allTests = allResponse.tests || [];
      const allSJ = allTests.filter(t => t.testType === 'SJ');

      console.log(`\nTotal SJ tests for Scott (all time): ${allSJ.length}`);
      if (allSJ.length > 0) {
        console.log('Latest SJ test:');
        const latest = allSJ.sort((a, b) =>
          new Date(b.recordedDateUtc).getTime() - new Date(a.recordedDateUtc).getTime()
        )[0];
        console.log(`  - ${latest.testId} at ${latest.recordedDateUtc}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkVALDSept22()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
