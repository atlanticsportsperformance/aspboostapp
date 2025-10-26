import { ValdProfileApi } from '../lib/vald/profile-api';

interface Profile {
  profileId: string;
  syncId: string;
  givenName: string;
  familyName: string;
  dateOfBirth: Date;
  externalId: string;
  email?: string; // Email might not exist
}

async function checkValdProfileEmails() {
  console.log('🔍 Checking VALD profiles for email data...\n');

  try {
    const valdApi = new ValdProfileApi();

    // Get all profiles for your tenant
    const tenantId = process.env.VALD_TENANT_ID;
    console.log(`📋 Fetching all profiles for tenant: ${tenantId}\n`);

    // Make a request to get all profiles
    await valdApi['ensureAuthenticated']();
    const baseUrl = process.env.VALD_PROFILE_API_URL || 'https://prd-use-api-externalprofile.valdperformance.com';
    const url = `${baseUrl}/profiles?TenantId=${tenantId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${valdApi['accessToken']}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch profiles: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const profiles = data.profiles || [];

    console.log(`✅ Found ${profiles.length} total profiles\n`);

    // Analyze email data
    let withEmail = 0;
    let withoutEmail = 0;
    const profilesWithoutEmail: Profile[] = [];
    const emailDuplicates = new Map<string, Profile[]>();

    profiles.forEach((profile: any) => {
      if (profile.email && profile.email.trim()) {
        withEmail++;

        // Check for duplicate emails
        const email = profile.email.toLowerCase().trim();
        if (!emailDuplicates.has(email)) {
          emailDuplicates.set(email, []);
        }
        emailDuplicates.get(email)!.push(profile);
      } else {
        withoutEmail++;
        profilesWithoutEmail.push(profile);
      }
    });

    console.log('📊 EMAIL ANALYSIS:\n');
    console.log(`  ✅ Profiles WITH email: ${withEmail} (${((withEmail / profiles.length) * 100).toFixed(1)}%)`);
    console.log(`  ❌ Profiles WITHOUT email: ${withoutEmail} (${((withoutEmail / profiles.length) * 100).toFixed(1)}%)\n`);

    // Show duplicate emails
    const duplicates = Array.from(emailDuplicates.entries()).filter(([_, profs]) => profs.length > 1);

    if (duplicates.length > 0) {
      console.log('⚠️  DUPLICATE EMAILS FOUND:\n');
      duplicates.forEach(([email, profs]) => {
        console.log(`  📧 ${email} (${profs.length} profiles):`);
        profs.forEach(p => {
          console.log(`     - ${p.givenName} ${p.familyName} (ID: ${p.profileId})`);
        });
        console.log('');
      });
    } else {
      console.log('✅ No duplicate emails found\n');
    }

    // Show some profiles without emails
    if (profilesWithoutEmail.length > 0) {
      console.log('❌ PROFILES WITHOUT EMAIL (first 10):\n');
      profilesWithoutEmail.slice(0, 10).forEach((p: any) => {
        console.log(`  - ${p.givenName} ${p.familyName}`);
        console.log(`    ID: ${p.profileId}`);
        console.log(`    DOB: ${p.dateOfBirth}`);
        console.log('');
      });

      if (profilesWithoutEmail.length > 10) {
        console.log(`  ... and ${profilesWithoutEmail.length - 10} more\n`);
      }
    }

    // Check the specific email from the user's question
    console.log('\n🔍 Checking specific email: ditondom@gmail.com\n');
    const searchResult = await valdApi.searchByEmail('ditondom@gmail.com');

    if (searchResult) {
      console.log('✅ Found profile:');
      console.log(`  Name: ${searchResult.givenName} ${searchResult.familyName}`);
      console.log(`  Profile ID: ${searchResult.profileId}`);
      console.log(`  DOB: ${searchResult.dateOfBirth}`);
      console.log(`  External ID: ${searchResult.externalId}`);
    } else {
      console.log('❌ No profile found for ditondom@gmail.com');
    }

    console.log('\n📋 SUMMARY:\n');
    console.log(`  Total profiles: ${profiles.length}`);
    console.log(`  With email: ${withEmail}`);
    console.log(`  Without email: ${withoutEmail}`);
    console.log(`  Duplicate emails: ${duplicates.length}`);

    if (withoutEmail > 0) {
      console.log('\n⚠️  RECOMMENDATION:\n');
      console.log('  Since many profiles lack emails, consider:');
      console.log('  1. Searching by name (first + last name)');
      console.log('  2. Searching by date of birth');
      console.log('  3. Showing a list of matches for manual selection');
      console.log('  4. Not relying solely on email for VALD profile matching');
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

checkValdProfileEmails();
