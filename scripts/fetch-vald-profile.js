const { ValdProfileApi } = require('../lib/vald/profile-api.ts');
require('dotenv').config({ path: '.env.local' });

async function fetchValdProfile() {
  const profileId = 'b341abcb-3ecb-408f-b7c1-027b542c008f';
  const lincolnEmail = 'lbelivau@hanoverstudents.org';

  console.log('🔍 Investigating VALD Profile ID:', profileId);
  console.log('📧 This profile is linked to Lincoln Beliveau (', lincolnEmail, ')');
  console.log('⚠️  But you said it\'s actually for Seamus Conway!');
  console.log('');
  console.log('---');
  console.log('');

  const valdApi = new ValdProfileApi();

  try {
    // Method 1: Get profile by ID
    console.log('📋 Method 1: Fetching profile by ID...');
    const profileById = await valdApi.getProfileById(profileId);

    if (profileById) {
      console.log('✅ Profile found by ID:');
      console.log(JSON.stringify(profileById, null, 2));
    } else {
      console.log('❌ No profile found by ID');
    }
  } catch (error) {
    console.error('❌ Error fetching by ID:', error.message);
  }

  console.log('');
  console.log('---');
  console.log('');

  try {
    // Method 2: Search by Lincoln's email
    console.log('📋 Method 2: Searching by Lincoln\'s email...');
    const profileByEmail = await valdApi.searchByEmail(lincolnEmail);

    if (profileByEmail) {
      console.log('✅ Profile found by email:');
      console.log(JSON.stringify(profileByEmail, null, 2));
    } else {
      console.log('❌ No profile found by email');
    }
  } catch (error) {
    console.error('❌ Error searching by email:', error.message);
  }

  console.log('');
  console.log('---');
  console.log('');

  try {
    // Method 3: Search by name
    console.log('📋 Method 3: Searching by name "Lincoln Beliveau"...');
    const profilesByName = await valdApi.searchByName('Lincoln', 'Beliveau');

    if (profilesByName && profilesByName.length > 0) {
      console.log(`✅ Found ${profilesByName.length} profile(s) by name:`);
      profilesByName.forEach((profile, idx) => {
        console.log(`\n[${idx + 1}]`);
        console.log(JSON.stringify(profile, null, 2));
      });
    } else {
      console.log('❌ No profiles found by name');
    }
  } catch (error) {
    console.error('❌ Error searching by name:', error.message);
  }
}

fetchValdProfile().catch(console.error);
