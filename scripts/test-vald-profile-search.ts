// Test VALD profile search to see what data comes back
import { ValdProfileApi } from '@/lib/vald/profile-api';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testValdProfileSearch() {
  const valdApi = new ValdProfileApi();

  console.log('🔍 Testing VALD profile search...\n');

  // Test search by name
  const firstName = process.argv[2] || 'Scott';
  const lastName = process.argv[3] || 'Blewett';

  console.log(`Searching for: ${firstName} ${lastName}\n`);

  try {
    const profiles = await valdApi.searchByName(firstName, lastName);

    console.log(`\n✅ Found ${profiles.length} profile(s)\n`);

    profiles.forEach((profile, index) => {
      console.log(`Profile ${index + 1}:`);
      console.log(`  Name: ${profile.givenName} ${profile.familyName}`);
      console.log(`  Email: ${profile.email || '❌ NOT PRESENT'}`);
      console.log(`  Profile ID: ${profile.profileId}`);
      console.log(`  Sync ID: ${profile.syncId}`);
      console.log(`  External ID: ${profile.externalId}`);
      console.log(`  DOB: ${profile.dateOfBirth}`);
      console.log('\n  Raw profile data:');
      console.log(JSON.stringify(profile, null, 2));
      console.log('\n---\n');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testValdProfileSearch();
