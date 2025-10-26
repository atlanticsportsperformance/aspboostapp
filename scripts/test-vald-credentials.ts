/**
 * Test VALD API credentials and fetch tenant information
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function getValdAccessToken() {
  // Use tenant-specific endpoint
  const tokenUrl = `https://login.microsoftonline.com/${process.env.VALD_TENANT_ID}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: process.env.VALD_CLIENT_ID!,
    client_secret: process.env.VALD_CLIENT_SECRET!,
    scope: 'https://valdperformance.onmicrosoft.com/profiles-api/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchTenants(accessToken: string) {
  const url = `${process.env.VALD_PROFILE_API_URL}/tenants`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch tenants: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function main() {
  console.log('🔐 Testing VALD API Credentials\n');
  console.log('='.repeat(80) + '\n');

  // Step 1: Get access token
  console.log('Step 1: Authenticating with VALD API...\n');

  try {
    const accessToken = await getValdAccessToken();
    console.log('✅ Successfully authenticated!\n');
    console.log(`Access Token (first 50 chars): ${accessToken.substring(0, 50)}...\n`);

    // Step 2: Fetch tenants
    console.log('Step 2: Fetching tenant information...\n');

    const tenants = await fetchTenants(accessToken);

    console.log('✅ Tenant information retrieved!\n');
    console.log(JSON.stringify(tenants, null, 2));

    console.log('\n' + '='.repeat(80) + '\n');

    if (Array.isArray(tenants) && tenants.length > 0) {
      console.log('📋 Your Tenant ID(s):\n');
      tenants.forEach((tenant: any, i: number) => {
        console.log(`  ${i + 1}. ${tenant.id || tenant.tenantId || tenant.TenantId}`);
        if (tenant.name) console.log(`     Name: ${tenant.name}`);
      });

      console.log('\n\n✅ Add this to your .env.local:\n');
      console.log(`VALD_TENANT_ID=${tenants[0].id || tenants[0].tenantId || tenants[0].TenantId}\n`);
    } else {
      console.log('⚠️  No tenants found or unexpected response format');
      console.log('You may need to contact VALD support for your tenant ID\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('\nPossible issues:');
    console.error('  1. Client ID or Secret is incorrect');
    console.error('  2. Credentials not yet activated by VALD');
    console.error('  3. Network/firewall blocking Microsoft OAuth');
    console.error('  4. Tenant ID needed before credentials work\n');
  }
}

main().catch(console.error);
