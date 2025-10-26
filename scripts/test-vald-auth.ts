/**
 * Test VALD API authentication using correct VALD auth endpoint
 */

import { ValdProfileApi } from '../lib/vald/profile-api';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🔐 Testing VALD API Authentication\n');
  console.log('='.repeat(80) + '\n');

  console.log('Credentials being used:');
  console.log(`  Client ID: ${process.env.VALD_CLIENT_ID}`);
  console.log(`  Client Secret: ${process.env.VALD_CLIENT_SECRET?.substring(0, 10)}...`);
  console.log(`  Base URL: ${process.env.VALD_PROFILE_API_URL}\n`);

  try {
    const api = new ValdProfileApi();

    console.log('Step 1: Authenticating...\n');
    await api.authenticate();

    console.log('\n✅ Authentication successful!\n');

    console.log('Step 2: Testing API access - searching for test profile...\n');

    // Try to search by email to verify API works
    const result = await api.searchByEmail('test@example.com');

    console.log('✅ API access confirmed!\n');

    if (result) {
      console.log('Found test profile:');
      console.log(`  Name: ${result.givenName} ${result.familyName}`);
      console.log(`  Profile ID: ${result.profileId}`);
      console.log(`  External ID: ${result.externalId}\n`);
    } else {
      console.log('No profile found for test@example.com (this is expected)\n');
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 VALD API is ready to use!\n');
    console.log('Next steps:');
    console.log('  1. Your athletes can now sync with VALD ForceDecks');
    console.log('  2. Test data will automatically sync when athletes perform tests');
    console.log('  3. Percentile rankings will calculate from their 2nd complete test session\n');

  } catch (error) {
    console.error('\n❌ Authentication failed!\n');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('\nPossible issues:');
    console.error('  1. Client ID or Secret is incorrect');
    console.error('  2. Credentials not yet activated by VALD');
    console.error('  3. Network/firewall blocking access to security.valdperformance.com');
    console.error('\nPlease contact your VALD account representative to verify credentials.\n');
  }
}

main().catch(console.error);
