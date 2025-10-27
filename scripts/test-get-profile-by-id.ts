import { ValdProfileApi } from '@/lib/vald/profile-api';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function test() {
  const valdApi = new ValdProfileApi();
  const profileId = '631be93a-c3a2-4bb1-abff-f15577281858'; // Scott's profile ID

  console.log('Testing getProfileById...\n');
  const profile = await valdApi.getProfileById(profileId);

  console.log('\n✅ Result:');
  console.log(JSON.stringify(profile, null, 2));

  if (profile && profile.email) {
    console.log(`\n📧 Email found: ${profile.email}`);
  } else {
    console.log('\n❌ No email in response');
  }
}

test();
