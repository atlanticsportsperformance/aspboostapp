import { ValdProfileApi } from '../lib/vald/profile-api';

async function diagnoseEmail() {
  console.log('🔍 VALD Email Diagnostic\n');
  console.log('=' .repeat(60));

  const email = 'ditondom@gmail.com';

  try {
    const valdApi = new ValdProfileApi();

    // 1. Search by email
    console.log(`\n1️⃣  SEARCHING BY EMAIL: ${email}\n`);
    const emailResult = await valdApi.searchByEmail(email);

    if (emailResult) {
      console.log('✅ VALD returned a profile for this email:\n');
      console.log(`   Name: ${emailResult.givenName} ${emailResult.familyName}`);
      console.log(`   Profile ID: ${emailResult.profileId}`);
      console.log(`   DOB: ${emailResult.dateOfBirth}`);
      console.log(`   Sync ID: ${emailResult.syncId}`);
      console.log(`   External ID: ${emailResult.externalId}`);
    } else {
      console.log('❌ No profile found for this email in VALD');
    }

    // 2. Search by name "Max DiTondo"
    console.log('\n' + '='.repeat(60));
    console.log('\n2️⃣  SEARCHING BY NAME: Max DiTondo\n');
    const nameResults = await valdApi.searchByName('Max', 'DiTondo');

    if (nameResults && nameResults.length > 0) {
      console.log(`✅ Found ${nameResults.length} profile(s) with name "Max DiTondo":\n`);
      nameResults.forEach((profile, index) => {
        console.log(`   Profile #${index + 1}:`);
        console.log(`   Name: ${profile.givenName} ${profile.familyName}`);
        console.log(`   Profile ID: ${profile.profileId}`);
        console.log(`   DOB: ${profile.dateOfBirth}`);
        console.log(`   Sync ID: ${profile.syncId}`);
        console.log(`   External ID: ${profile.externalId}`);
        console.log('');
      });
    } else {
      console.log('❌ No profiles found for name "Max DiTondo"');
    }

    // 3. Search by name "Seamus Conway"
    console.log('='.repeat(60));
    console.log('\n3️⃣  SEARCHING BY NAME: Seamus Conway\n');
    const seamusResults = await valdApi.searchByName('Seamus', 'Conway');

    if (seamusResults && seamusResults.length > 0) {
      console.log(`✅ Found ${seamusResults.length} profile(s) with name "Seamus Conway":\n`);
      seamusResults.forEach((profile, index) => {
        console.log(`   Profile #${index + 1}:`);
        console.log(`   Name: ${profile.givenName} ${profile.familyName}`);
        console.log(`   Profile ID: ${profile.profileId}`);
        console.log(`   DOB: ${profile.dateOfBirth}`);
        console.log(`   Sync ID: ${profile.syncId}`);
        console.log(`   External ID: ${profile.externalId}`);
        console.log('');
      });
    } else {
      console.log('❌ No profiles found for name "Seamus Conway"');
    }

    // 4. Summary
    console.log('='.repeat(60));
    console.log('\n📋 SUMMARY\n');

    if (emailResult) {
      console.log(`The email "${email}" is registered to:`);
      console.log(`  → ${emailResult.givenName} ${emailResult.familyName} (Profile ID: ${emailResult.profileId})`);
    }

    if (nameResults && nameResults.length > 0) {
      console.log(`\nMax DiTondo profile(s) found: ${nameResults.length}`);
      nameResults.forEach((profile, index) => {
        console.log(`  Profile #${index + 1} ID: ${profile.profileId}`);
      });
    }

    if (emailResult && nameResults && nameResults.length > 0) {
      const emailProfileId = emailResult.profileId;
      const maxProfileIds = nameResults.map(p => p.profileId);

      if (maxProfileIds.includes(emailProfileId)) {
        console.log('\n✅ GOOD: The email points to one of Max DiTondo\'s profiles!');
      } else {
        console.log('\n❌ PROBLEM: The email points to a DIFFERENT person than Max DiTondo');
        console.log(`   Email profile: ${emailResult.givenName} ${emailResult.familyName}`);
        console.log(`   Expected: Max DiTondo`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
  }
}

diagnoseEmail();
