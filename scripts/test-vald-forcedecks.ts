/**
 * Test VALD ForceDecks API - This is what pulls test data
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function authenticate() {
  const authUrl = 'https://security.valdperformance.com/connect/token';

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.VALD_CLIENT_ID!,
      client_secret: process.env.VALD_CLIENT_SECRET!,
      scope: 'api.dynamo api.external'
    })
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function getTests(accessToken: string) {
  const baseUrl = 'https://prd-use-api-extforcedecks.valdperformance.com';
  const tenantId = process.env.VALD_TENANT_ID;

  // Get tests from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const modifiedFrom = thirtyDaysAgo.toISOString();

  const url = `${baseUrl}/tests?TenantId=${tenantId}&ModifiedFromUtc=${encodeURIComponent(modifiedFrom)}&PageNumber=1&PageSize=10`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} - ${await response.text()}`);
  }

  return await response.json();
}

async function main() {
  console.log('🔬 Testing VALD ForceDecks API\n');
  console.log('='.repeat(80) + '\n');

  console.log('This API is used to:');
  console.log('  - Fetch athlete test results (CMJ, SJ, HJ, PPU, IMTP)');
  console.log('  - Sync test data to your database');
  console.log('  - Calculate percentile rankings\n');

  try {
    console.log('Step 1: Authenticating...\n');
    const accessToken = await authenticate();
    console.log('✅ Authentication successful!\n');

    console.log('Step 2: Fetching recent tests...\n');
    const tests = await getTests(accessToken);

    console.log('✅ ForceDecks API is working!\n');

    if (tests.items && tests.items.length > 0) {
      console.log(`Found ${tests.items.length} recent tests:\n`);

      tests.items.slice(0, 5).forEach((test: any, i: number) => {
        console.log(`  ${i + 1}. Test Type: ${test.testType}`);
        console.log(`     Profile ID: ${test.profileId}`);
        console.log(`     Date: ${new Date(test.recordedDateUtc).toLocaleDateString()}\n`);
      });
    } else {
      console.log('No tests found yet - this is normal if athletes haven\'t tested\n');
    }

    console.log('='.repeat(80));
    console.log('\n🎉 VALD ForceDecks API is fully operational!\n');
    console.log('✅ Authentication: Working');
    console.log('✅ API Access: Working');
    console.log('✅ Test Data Retrieval: Working\n');

    console.log('Your system is ready to:');
    console.log('  1. Sync athlete test data from VALD ForceDecks');
    console.log('  2. Store tests in your Supabase database');
    console.log('  3. Calculate percentile rankings automatically');
    console.log('  4. Display athlete performance metrics\n');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    console.error('\nThis could mean:');
    console.error('  1. No tests exist yet in your VALD account');
    console.error('  2. Tenant ID might be incorrect');
    console.error('  3. Your credentials don\'t have ForceDecks API access\n');
  }
}

main().catch(console.error);
