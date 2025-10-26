// Simplified VALD ForceDecks API Integration - Focus on core data flow
// Gets: VALD Tests → Trials → Metrics (following the same pattern as your vald-api-simple.js)

export interface VALDTest {
  testId: string
  tenantId: string
  profileId: string
  recordingId: string
  modifiedDateUtc: string
  recordedDateUtc: string
  recordedDateOffset: number
  recordedDateTimezone: string
  analysedDateUtc: string
  analysedDateOffset: number
  analysedDateTimezone: string
  testType: string
  notes: string
  weight: number
  parameter: {
    resultId: number
    value: number
  }
  extendedParameters: Array<{
    resultId: number
    value: number
  }>
  attributes: Array<{
    attributeValueId: string
    attributeValueName: string
    attributeTypeId: string
    attributeTypeName: string
  }>
}

export interface Trial {
  id: string
  athleteId: string
  hubAthleteId: string
  recordedUTC: string
  recordedOffset: number
  recordedTimezone: string
  startTime: number
  endTime: number
  results: Array<{
    resultId: string
    value: number
    time: number
    limb: string  // "Trial", "Left", "Right", "Asym"
    repeat: number
    definition: {
      id: string
      result: string  // Metric name like "JUMP_HEIGHT", "PEAK_TAKEOFF_FORCE"
      description: string
      name: string
      unit: string  // e.g., "m", "N", "W"
      repeatable: boolean
      asymmetry: boolean
    }
  }>
}

export interface VALDTrial {
  trialId: string
  testId: string
  trialNumber: number
  // Add more fields as needed based on API response
}

export interface VALDResultDefinition {
  resultId: number
  name: string
  description: string
  unit: string
  resultUnitScaleFactor: number
  // Add more fields as needed
}

export interface VALDTestRecording {
  testId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recordingData: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sampleData?: any
  // Add more fields as needed
}

export class SimpleVALDForceDecksAPI {
  private baseUrl: string
  private clientId: string
  private clientSecret: string
  private tenantId: string
  private accessToken: string | null = null
  private tokenExpiry: number | null = null

  constructor() {
    const baseUrl = 'https://prd-use-api-extforcedecks.valdperformance.com';

    this.baseUrl = baseUrl
    this.clientId = process.env.VALD_CLIENT_ID || ''
    this.clientSecret = process.env.VALD_CLIENT_SECRET || ''
    this.tenantId = process.env.VALD_TENANT_ID || ''
  }

  /**
   * Authenticate with VALD ForceDecks API using OAuth2 client credentials flow
   */
  async authenticate() {
    try {
      console.log('🔐 Authenticating with VALD ForceDecks API...')

      if (!this.clientId || !this.clientSecret) {
        throw new Error('VALD_CLIENT_ID and VALD_CLIENT_SECRET environment variables are required')
      }

      // VALD uses OAuth2 client credentials flow
      // Try the security endpoint from the JWT token issuer
      const authUrl = 'https://security.valdperformance.com/connect/token'

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'api.dynamo api.external'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const tokenData = await response.json()
      this.accessToken = tokenData.access_token
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000)

      console.log('✅ VALD ForceDecks API authenticated')
      return true
    } catch (error) {
      console.error('❌ VALD ForceDecks Authentication error:', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Ensure we have a valid token
   */
  async ensureAuthenticated() {
    if (!this.accessToken || (this.tokenExpiry && Date.now() >= this.tokenExpiry)) {
      await this.authenticate()
    }
  }

  /**
   * Make authenticated request to VALD ForceDecks API
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await this.ensureAuthenticated()

    const url = `${this.baseUrl}${endpoint}`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'VALD-ForceDecks-API-Client/1.0',
      'Authorization': `Bearer ${this.accessToken}`,
      ...options.headers,
    }

    try {
      console.log(`🌐 Making request to: ${url}`)

      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (response.status === 204) {
        return null as T // No content
      }

      if (!response.ok) {
        let errorData
        try {
          const responseClone = response.clone()
          errorData = await responseClone.json()
        } catch {
          try {
            const responseClone = response.clone()
            errorData = { error: await responseClone.text() }
          } catch {
            errorData = { error: 'Unable to read error response' }
          }
        }

        console.error('❌ VALD API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url
        })

        throw new Error(`VALD API Error: ${response.status} ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        console.log(`✅ VALD API Success: ${url}`)
        return data
      }

      return await response.text() as T
    } catch (error) {
      console.error(`❌ Request failed for ${url}:`, error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Get tests for the tenant (Scenario 1)
   */
  async getTests(modifiedFromUtc?: string, profileId?: string): Promise<{ tests: VALDTest[] }> {
    try {
      console.log(`📋 Fetching tests for tenant ${this.tenantId} since ${modifiedFromUtc}...`)

      if (!modifiedFromUtc) {
        modifiedFromUtc = new Date(0).toISOString()
      }

      const queryParams = new URLSearchParams({
        TenantId: this.tenantId,
        ModifiedFromUtc: modifiedFromUtc,
      })

      if (profileId) {
        queryParams.append('ProfileId', profileId)
      }

      const response = await this.makeRequest<{ tests: VALDTest[] }>(`/tests?${queryParams.toString()}`)
      console.log(`📊 Found ${response?.tests?.length || 0} tests`)

      return response || { tests: [] }
    } catch (error) {
      console.log('❌ Error fetching tests:', error instanceof Error ? error.message : 'Unknown error')
      console.log(JSON.stringify(error, null, 2))

      throw error
    }
  }

  /**
   * Get all tests for a profile after a certain date
   */
  async getUnsyncedTests(profileId: string, modifiedFromUtc: string): Promise<VALDTest[]> {
    try {
      console.log(`📋 Fetching unsynced tests for profile ${profileId} after ${modifiedFromUtc}...`)

      const queryParams = new URLSearchParams({
        TenantId: this.tenantId,
        ProfileId: profileId,
        ModifiedFromUtc: modifiedFromUtc,
      })

      const response = await this.makeRequest<VALDTest[]>(`/tests?${queryParams.toString()}`)
      console.log(`📊 Found ${response?.length || 0} unsynced tests`)

      return response || [];
    } catch (error) {
      console.error('❌ Error fetching unsynced tests:', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Get trials for a specific test (Scenario 2)
   */
  async getTrials(testId: string): Promise<Trial[]> {
    try {
      console.log(`📋 Fetching trials for test ${testId}...`)

      const response = await this.makeRequest<Trial[]>(`/v2019q3/teams/${this.tenantId}/tests/${testId}/trials`)
      console.log(`📊 Found ${response?.length || 0} trials`)

      return response || []
    } catch (error) {
      console.error('❌ Error fetching trials:', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Get test recording (Scenario 3)
   * Note: Requires permission from VALD Support Team
   */
  async getTestRecording(testId: string, includeSampleData: boolean = false): Promise<VALDTestRecording> {
    try {
      console.log(`📋 Fetching recording for test ${testId}...`)

      const queryParams = new URLSearchParams()
      if (includeSampleData) {
        queryParams.append('includeSampleData', 'true')
      }

      const queryString = queryParams.toString()
      const endpoint = `/v2019q3/teams/${this.tenantId}/tests/${testId}/recording${queryString ? `?${queryString}` : ''}`

      const response = await this.makeRequest<VALDTestRecording>(endpoint)
      console.log(`📊 Retrieved recording for test ${testId}`)

      return response
    } catch (error) {
      console.error('❌ Error fetching test recording:', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  async getTest(testId: string, profileId: string): Promise<VALDTest | undefined> {
    try {
      console.log(`📋 Fetching test ${testId} for profile ${profileId}...`)
      // Provide a valid ISO date for ModifiedFromUtc and scope to profileId
      const from = new Date(0).toISOString();
      const response = await this.getTests(from, profileId);
      return response?.tests?.find(test => test.testId === testId) || undefined;
    } catch (error) {
      console.error('❌ Error fetching test:', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Get all result definitions (Scenario 4A)
   */
  async getResultDefinitions(): Promise<VALDResultDefinition[]> {
    try {
      console.log('📋 Fetching all result definitions...')

      const response = await this.makeRequest<VALDResultDefinition[]>('/resultdefinitions')
      console.log(`📊 Found ${response?.length || 0} result definitions`)

      return response || []
    } catch (error) {
      console.error('❌ Error fetching result definitions:', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Get specific result definition (Scenario 4B)
   */
  async getResultDefinition(resultId: string): Promise<VALDResultDefinition> {
    try {
      console.log(`📋 Fetching result definition ${resultId}...`)

      const response = await this.makeRequest<VALDResultDefinition>(`/resultdefinition/${resultId}`)
      console.log(`📊 Retrieved result definition: ${response?.name || 'Unknown'}`)

      return response
    } catch (error) {
      console.error('❌ Error fetching result definition:', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Process and store VALD test data (similar to your processVALDSession)
   */
  async processVALDTest(valdTest: VALDTest) {
    try {
      console.log(`🔄 Processing VALD test ${valdTest.testId}...`)

      // This would integrate with your database storage
      // Similar to how you process VALD sessions in your vald-api-simple.js

      const processedData = {
        testId: valdTest.testId,
        profileId: valdTest.profileId,
        testType: valdTest.testType,
        testDate: valdTest.recordedDateUtc,
        weight: valdTest.weight,
        notes: valdTest.notes,
        metrics: {
          primary: valdTest.parameter,
          extended: valdTest.extendedParameters,
          attributes: valdTest.attributes
        }
      }

      console.log(`✅ Processed test: ${valdTest.testType} for profile ${valdTest.profileId}`)
      return processedData
    } catch (error) {
      console.error(`❌ Error processing test:`, error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Main sync function - gets recent tests and processes them
   */
  async syncRecentTests(daysBack: number = 1000, profileId?: string) {
    try {
      console.log(`🚀 Starting VALD ForceDecks sync (${daysBack} days back)...`)

      // Calculate date
      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - daysBack)
      const modifiedFromUtc = dateFrom.toISOString()

      // Get tests
      const testsResponse = await this.getTests(modifiedFromUtc, profileId)
      const tests = testsResponse.tests || []

      console.log(`📊 Processing ${tests.length} tests...`)

      let processedCount = 0
      const processedTests = []

      // Process each test
      for (const test of tests) {
        try {
          console.log(`📋 Test Type: ${test.testType}`)
          const processedTest = await this.processVALDTest(test)
          processedTests.push(processedTest)
          processedCount++
        } catch (testError) {
          console.error(`❌ Error processing test ${test.testId}:`, testError instanceof Error ? testError.message : 'Unknown error')
        }
      }

      console.log(`✅ VALD ForceDecks sync complete: ${processedCount} tests processed`)

      return {
        tests_found: tests.length,
        tests_processed: processedCount,
        processed_tests: processedTests
      }

    } catch (error) {
      console.error(`❌ VALD ForceDecks sync failed:`, error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Quick test of VALD ForceDecks connection
   */
  async testConnection() {
    try {
      await this.authenticate()
      const resultDefinitions = await this.getResultDefinitions()

      return {
        success: true,
        message: 'VALD ForceDecks connection successful',
        result_definitions_found: resultDefinitions.length,
        sample_definition: resultDefinitions[0]?.name || 'None'
      }
    } catch (error) {
      return {
        success: false,
        message: `VALD ForceDecks connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get Swagger documentation URL
   */
  getSwaggerUrl(): string {
    return `${this.baseUrl}/swagger/index.html`
  }
}

// Export singleton instance
export const simpleVALDForceDecksAPI = new SimpleVALDForceDecksAPI();
export default simpleVALDForceDecksAPI
