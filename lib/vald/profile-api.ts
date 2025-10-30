// VALD Profile API - Manages athlete profile creation and synchronization

interface CreateAthleteProps {
  dateOfBirth: Date;
  email: string;
  givenName: string;
  familyName: string;
  sex: string;
  syncId: string;
  externalId: string;
  playLevel?: 'Youth' | 'High School' | 'College' | 'Pro';
}

interface Profile {
  profileId: string;
  syncId: string;
  givenName: string;
  familyName: string;
  dateOfBirth: Date;
  externalId: string;
  email?: string; // Email may not always be present in VALD
}

interface GetAthleteResponse {
  profiles: Profile[];
}

export class ValdProfileApi {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    this.baseUrl = process.env.VALD_PROFILE_API_URL || 'https://prd-use-api-extprofiles.valdperformance.com';
    this.clientId = process.env.VALD_CLIENT_ID || '';
    this.clientSecret = process.env.VALD_CLIENT_SECRET || '';
    this.tenantId = process.env.VALD_TENANT_ID || '';
  }

  async authenticate() {
    try {
      console.log('🔐 Authenticating with VALD Profile API...');
      if (!this.clientId || !this.clientSecret) {
        throw new Error('VALD_CLIENT_ID and VALD_CLIENT_SECRET environment variables are required');
      }

      const authUrl = 'https://security.valdperformance.com/connect/token';

      const response = await fetch(authUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'api.dynamo api.external'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const tokenData = await response.json();
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

      console.log('✅ VALD Profile API authenticated');
      return true;
    } catch (error) {
      console.error('❌ VALD Profile API Authentication error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async ensureAuthenticated() {
    if (!this.accessToken || (this.tokenExpiry && Date.now() >= this.tokenExpiry)) {
      await this.authenticate();
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<{ data: T, statusCode: number, message: string }> {
    await this.ensureAuthenticated();
    if (!this.baseUrl) {
      throw new Error('VALD_PROFILE_API_URL is not set. Please set it in your environment');
    }

    const url = new URL(endpoint, this.baseUrl).toString();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'VALD-Profile-API-Client/1.0',
      'Authorization': `Bearer ${this.accessToken}`,
      ...options.headers,
    }

    try {
      console.log(`🌐 Making request to: ${url}`);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 204) {
        return { data: null as T, statusCode: response.status, message: 'No content' };
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText} - ${text}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`✅ VALD Profile API Success: ${url}`);
        return { data, statusCode: response.status, message: 'Success' };
      }

      return { data: await response.text() as T, statusCode: response.status, message: 'Success' };
    } catch (error) {
      console.error(`❌ Request failed for ${url}:`, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async createAthlete({ dateOfBirth, email, givenName, familyName, sex, syncId, externalId }: CreateAthleteProps) {
    try {
      console.log("Creating athlete in VALD profile API...");
      const endpoint = `/profiles/import`;

      // Convert sex to VALD enum: 0 = Male, 1 = Female
      const sexValue = sex.toUpperCase().startsWith('M') ? 0 : 1;

      const body = {
        dateOfBirth: dateOfBirth.toISOString(),
        email,
        givenName,
        familyName,
        tenantId: this.tenantId,
        syncId,
        sex: sexValue,
        externalId,
        isCreatedByUserOver18YearsOld: true,
        isGuardianConsentGiven: true,
        isPhotoConsentGiven: true,
      }
      const response = await this.makeRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      // Accept any 2xx response as success
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Failed to create athlete: ${response.message}`);
      }
      return response.data;
    } catch (error) {
      console.error('❌ Error creating athlete:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getAthlete(syncId: string): Promise<string | null> {
    try {
      console.log("Getting athlete in VALD profile API...");
      const endpoint = `/profiles?TenantId=${this.tenantId}&SyncId=${syncId}`;
      const response = await this.makeRequest(endpoint, {
        method: "GET",
      });
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Failed to get athlete: ${response.message}`);
      }
      // Verbose logging of raw payload
      console.log('VALD profiles raw payload:', JSON.stringify(response.data));
      const data = response.data as GetAthleteResponse | null;
      const profiles = data?.profiles ?? [];
      if (!Array.isArray(profiles) || profiles.length === 0) {
        console.warn('No profiles found yet for syncId:', syncId);
        return null;
      }
      const profileId = profiles[0]?.profileId;
      console.log('Resolved profileId:', profileId);
      return profileId ?? null;
    } catch (error) {
      console.error('❌ Error getting athlete:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getProfileById(profileId: string): Promise<Profile | null> {
    try {
      console.log(`Getting full profile details for profileId: ${profileId}`);
      const endpoint = `/profiles/${profileId}?TenantId=${this.tenantId}`;
      const response = await this.makeRequest<Profile>(endpoint, {
        method: "GET",
      });
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Failed to get profile: ${response.message}`);
      }
      console.log('VALD profile details:', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error('❌ Error getting profile by ID:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  async updateProfileEmail(profileId: string, email: string): Promise<boolean> {
    try {
      console.log(`Updating email for VALD profile ${profileId} to ${email}`);
      const endpoint = `/profiles/${profileId}`;

      // First, get the current profile data
      const currentProfile = await this.getProfileById(profileId);
      if (!currentProfile) {
        throw new Error(`Profile ${profileId} not found`);
      }

      // Update the profile with the new email
      const body = {
        tenantId: this.tenantId,
        profileId: profileId,
        email: email,
        // Include other required fields from current profile
        givenName: currentProfile.givenName,
        familyName: currentProfile.familyName,
        dateOfBirth: currentProfile.dateOfBirth,
        syncId: currentProfile.syncId,
        externalId: currentProfile.externalId,
      };

      const response = await this.makeRequest(endpoint, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Failed to update profile email: ${response.message}`);
      }

      console.log(`✅ Successfully updated email for VALD profile ${profileId}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating profile email:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async searchByEmail(email: string): Promise<Profile | null> {
    try {
      console.log("Searching for athlete by email in VALD profile API...");
      const endpoint = `/profiles?TenantId=${this.tenantId}&Email=${encodeURIComponent(email)}`;
      const response = await this.makeRequest<GetAthleteResponse>(endpoint, {
        method: "GET",
      });
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Failed to search athlete: ${response.message}`);
      }
      console.log('VALD profiles search result:', JSON.stringify(response.data));
      const profiles = response.data?.profiles ?? [];
      if (!Array.isArray(profiles) || profiles.length === 0) {
        console.warn('No profiles found for email:', email);
        return null;
      }

      // IMPORTANT: Validate that the returned profile actually has the email we searched for
      // The VALD API sometimes returns profiles without emails when searching by email
      const searchEmailLower = email.toLowerCase().trim();
      const matchingProfiles = profiles.filter(profile => {
        const profileEmail = profile.email?.toLowerCase().trim();
        return profileEmail && profileEmail === searchEmailLower;
      });

      if (matchingProfiles.length === 0) {
        console.warn(`⚠️ VALD API returned ${profiles.length} profile(s), but NONE have the email we searched for (${email})`);
        console.warn('Profiles returned:', profiles.map(p => ({
          profileId: p.profileId,
          name: `${p.givenName} ${p.familyName}`,
          email: p.email || '(no email)'
        })));
        return null;
      }

      if (matchingProfiles.length > 1) {
        console.warn(`⚠️ Found ${matchingProfiles.length} profiles with email ${email}, returning first one`);
      }

      // Return the first profile that actually has the matching email
      return matchingProfiles[0];
    } catch (error) {
      console.error('❌ Error searching athlete by email:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async searchByName(firstName: string, lastName: string): Promise<Profile[]> {
    try {
      console.log(`Searching for athlete by name in VALD profile API: ${firstName} ${lastName}`);

      // VALD API doesn't have direct name search, so we need to get all profiles and filter
      // This is not ideal for large datasets, but works for initial implementation
      const endpoint = `/profiles?TenantId=${this.tenantId}`;
      const response = await this.makeRequest<GetAthleteResponse>(endpoint, {
        method: "GET",
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Failed to search athletes: ${response.message}`);
      }

      const allProfiles = response.data?.profiles ?? [];

      // Filter by name (case-insensitive, flexible matching)
      const firstNameLower = firstName.toLowerCase().trim();
      const lastNameLower = lastName.toLowerCase().trim();

      const matches = allProfiles.filter(profile => {
        const profileFirstName = profile.givenName?.toLowerCase().trim() || '';
        const profileLastName = profile.familyName?.toLowerCase().trim() || '';

        // Match if:
        // 1. First name matches first, last name matches last (normal order)
        // 2. First name matches last, last name matches first (reversed order - user typed "DiTondo Max")
        // 3. Partial matches work too

        const normalMatch =
          profileFirstName.includes(firstNameLower) && profileLastName.includes(lastNameLower);

        const reversedMatch =
          profileFirstName.includes(lastNameLower) && profileLastName.includes(firstNameLower);

        return normalMatch || reversedMatch;
      });

      console.log(`Found ${matches.length} profile(s) matching name: ${firstName} ${lastName}`);

      // Fetch full profile details for each match to get email and other fields
      const fullProfiles: Profile[] = [];
      for (const match of matches) {
        const fullProfile = await this.getProfileById(match.profileId);
        if (fullProfile) {
          fullProfiles.push(fullProfile);
        } else {
          // If we can't get full details, use the basic profile
          fullProfiles.push(match);
        }
      }

      console.log(`✅ Fetched full details for ${fullProfiles.length} profile(s)`);
      return fullProfiles;
    } catch (error) {
      console.error('❌ Error searching athlete by name:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

export const valdProfileApi = new ValdProfileApi();
export default valdProfileApi;
