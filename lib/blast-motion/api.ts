// Blast Motion API Integration with JWT Authentication
// Based on official documentation: POST /auth to get JWT token

export interface BlastAuthResponse {
  token: string;
}

export interface BlastTeamInsightsResponse {
  data: {
    current_page: number;
    data: BlastPlayer[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: string;
    prev_page_url: string | null;
    to: number;
    total: number;
  };
  meta: unknown[];
  roles: string[];
  success: boolean;
}

export interface BlastPlayer {
  id: number;
  blast_user_id: string;
  external_id: string | null;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  handedness: number | null;
  jersey_number: string | null;
  position: string | null;
  total_actions: number;
  total_actions_extended: number;
  averages: {
    [metricName: string]: BlastMetric;
  };
  has_actions: boolean;
  pcr_situation: boolean;
}

export interface BlastMetric {
  display_name: string;
  value: string;
  display_value: string;
  unit: string;
  display_unit: string;
}

export interface BlastPlayerMetricsResponse {
  data: {
    current_page: number;
    data: BlastSwing[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: string;
    prev_page_url: string | null;
    to: number;
    total: number;
  };
  success: boolean;
}

export interface BlastSwing {
  id: number;
  blast_id: string;
  academy_id: string;
  metrics: {
    [metricName: string]: BlastMetric;
  };
  equipment: {
    id: string;
    name: string;
    nick_name: string;
  } | null;
  has_video: boolean;
  video_id: number | null;
  handedness: number;
  sport_id: number;
  swing_details?: string; // Swing type/environment (tee, live, bp, game, etc.)
  // NOTE: Blast Motion API documentation says created_at is { date: string, time: string }
  // but the ACTUAL API returns it as a single string "YYYY-MM-DD HH:MM:SS"
  created_at: string; // Format: "YYYY-MM-DD HH:MM:SS" in UTC
}

export class BlastMotionAPI {
  private baseUrl: string = 'https://api.blastconnect.com';
  private username: string;
  private password: string;
  private token: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  /**
   * Authenticate and get JWT token
   * POST https://api.blastconnect.com/auth
   */
  private async authenticate(): Promise<void> {
    try {
      console.log('🔐 Authenticating with Blast Motion API...');
      console.log(`   Username: ${this.username}`);

      // Try with both 'username' and 'email' fields
      const authBody = {
        email: this.username,
        password: this.password,
      };

      console.log('📤 Auth request body:', { email: this.username, password: '***' });

      const response = await fetch(`${this.baseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(authBody),
      });

      console.log(`📊 Auth response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Authentication failed:', errorText.substring(0, 500));
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const data: BlastAuthResponse = await response.json();

      if (!data.token) {
        console.error('❌ No token in response');
        throw new Error('No token received from authentication');
      }

      this.token = data.token;
      // JWT tokens typically expire after some time, refresh proactively
      this.tokenExpiry = Date.now() + (50 * 60 * 1000); // 50 minutes

      console.log('✅ Authentication successful');
      console.log(`🔑 Token received: ${data.token.substring(0, 50)}...`);
    } catch (error) {
      console.error('❌ Authentication error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Ensure we have a valid token
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.token || (this.tokenExpiry && Date.now() >= this.tokenExpiry)) {
      await this.authenticate();
    }
  }

  /**
   * Make authenticated request to Blast Motion API with JWT token
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await this.ensureAuthenticated();

    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      ...options.headers,
    };

    try {
      console.log(`🌐 Making request to Blast Motion API: ${url}`);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`📊 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorData;
        const responseText = await response.text();
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText.substring(0, 500) };
        }

        console.error('❌ Blast Motion API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url
        });

        throw new Error(`Blast Motion API Error: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log(`📄 Response preview: ${responseText.substring(0, 200)}...`);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse JSON response');
        console.error('   Response starts with:', responseText.substring(0, 100));
        throw new Error('Invalid JSON response from Blast Motion API');
      }

      console.log(`✅ Blast Motion API Success: ${url}`);
      return data;
    } catch (error) {
      console.error(`❌ Request failed for ${url}:`);
      console.error('   Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('   Error message:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof Error && error.cause) {
        console.error('   Error cause:', error.cause);
      }
      throw error;
    }
  }

  /**
   * Get Team Insights (player averages)
   * GET /api/v3/insights/external
   */
  async getTeamInsights(params: {
    dateStart: string;
    dateEnd: string;
    academyId?: string;
    page?: number;
    perPage?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    search?: string;
  }): Promise<BlastTeamInsightsResponse> {
    try {
      console.log(`📋 Fetching team insights from ${params.dateStart} to ${params.dateEnd}...`);

      const queryParams = new URLSearchParams();
      queryParams.append('date[]', params.dateStart);
      queryParams.append('date[]', params.dateEnd);
      queryParams.append('roster', 'all');
      queryParams.append('search', params.search || '');
      queryParams.append('page', String(params.page || 1));
      queryParams.append('per_page', String(params.perPage || 25));

      if (params.academyId) {
        queryParams.append('academy_id', params.academyId);
      }

      if (params.sortBy) {
        queryParams.append('sort_by', params.sortBy);
      }

      if (params.order) {
        queryParams.append('order', params.order);
      }

      const response = await this.makeRequest<BlastTeamInsightsResponse>(
        `/api/v3/insights/external?${queryParams.toString()}`
      );

      console.log(`📊 Found ${response?.data?.data?.length || 0} players on page ${response?.data?.current_page || 1}`);

      return response;
    } catch (error) {
      console.error('❌ Error fetching team insights:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get all players (auto-paginate through all pages)
   */
  async getAllPlayers(params: {
    dateStart: string;
    dateEnd: string;
    academyId?: string;
  }): Promise<BlastPlayer[]> {
    const allPlayers: BlastPlayer[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getTeamInsights({
        ...params,
        page: currentPage,
        perPage: 25,
      });

      allPlayers.push(...response.data.data);

      console.log(`📄 Page ${currentPage}/${response.data.last_page}: Fetched ${response.data.data.length} players (total: ${allPlayers.length})`);

      hasMore = response.data.next_page_url !== null;
      currentPage++;
    }

    console.log(`✅ Fetched all ${allPlayers.length} players from Blast Motion`);
    return allPlayers;
  }

  /**
   * Get individual player metrics (swing-by-swing)
   * GET /api/v3/insights/external/{user_id}/metrics
   */
  async getPlayerMetrics(playerId: number, params: {
    dateStart: string;
    dateEnd: string;
    academyId?: string;
    page?: number;
    perPage?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    videosOnly?: boolean;
  }): Promise<BlastPlayerMetricsResponse> {
    try {
      console.log(`📋 Fetching metrics for player ${playerId} from ${params.dateStart} to ${params.dateEnd}...`);

      const queryParams = new URLSearchParams();
      queryParams.append('date[]', params.dateStart);
      queryParams.append('date[]', params.dateEnd);
      queryParams.append('page', String(params.page || 1));
      queryParams.append('per_page', String(params.perPage || 25));

      if (params.academyId) {
        queryParams.append('academy_id', params.academyId);
      }

      if (params.sortBy) {
        queryParams.append('sort_by', params.sortBy);
      }

      if (params.order) {
        queryParams.append('order', params.order);
      }

      if (params.videosOnly) {
        queryParams.append('videos_only', 'true');
      }

      const response = await this.makeRequest<BlastPlayerMetricsResponse>(
        `/api/v3/insights/external/${playerId}/metrics?${queryParams.toString()}`
      );

      console.log(`📊 Found ${response?.data?.data?.length || 0} swings for player ${playerId} on page ${response?.data?.current_page || 1}`);

      return response;
    } catch (error) {
      console.error(`❌ Error fetching player metrics for ${playerId}:`, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get all swings for a player (auto-paginate)
   */
  async getAllPlayerSwings(playerId: number, params: {
    dateStart: string;
    dateEnd: string;
    academyId?: string;
    videosOnly?: boolean;
  }): Promise<BlastSwing[]> {
    const allSwings: BlastSwing[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getPlayerMetrics(playerId, {
        ...params,
        page: currentPage,
        perPage: 25,
        sortBy: 'created_at',
        order: 'desc',
      });

      // Blast Motion API quirk: sometimes returns data as object instead of array
      const swingsData = Array.isArray(response.data.data)
        ? response.data.data
        : Object.values(response.data.data || {});

      if (swingsData.length > 0) {
        allSwings.push(...swingsData);
      }

      console.log(`📄 Page ${currentPage}/${response.data.last_page}: Fetched ${swingsData.length} swings (total: ${allSwings.length})`);

      hasMore = response.data.next_page_url !== null && swingsData.length > 0;
      currentPage++;
    }

    console.log(`✅ Fetched all ${allSwings.length} swings for player ${playerId}`);
    return allSwings;
  }

  /**
   * Test connection to Blast Motion API
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    sample_data?: unknown;
  }> {
    try {
      // Try to authenticate first
      await this.authenticate();

      // Try to fetch team insights for a small date range (last 7 days)
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const dateStart = weekAgo.toISOString().split('T')[0];
      const dateEnd = today.toISOString().split('T')[0];

      const response = await this.getTeamInsights({
        dateStart,
        dateEnd,
        page: 1,
        perPage: 1,
      });

      return {
        success: true,
        message: 'Blast Motion connection successful',
        sample_data: {
          total_players: response.data.total,
          date_range: `${dateStart} to ${dateEnd}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Blast Motion connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Search for a player by name or email
   * The Blast Motion API searches by name, email, and other player fields
   */
  async searchPlayer(query: string, params?: {
    dateStart?: string;
    dateEnd?: string;
    academyId?: string;
  }): Promise<BlastPlayer[]> {
    try {
      console.log(`🔍 Searching for player: "${query}"`);

      // Use last year of data as default date range
      const dateEnd = params?.dateEnd || new Date().toISOString().split('T')[0];
      const dateStart = params?.dateStart || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await this.getTeamInsights({
        dateStart,
        dateEnd,
        academyId: params?.academyId,
        search: query,
        page: 1,
        perPage: 100, // Get more results for search
      });

      console.log(`🔍 Found ${response.data.data.length} players matching "${query}"`);

      return response.data.data;
    } catch (error) {
      console.error('❌ Error searching for player:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

// Export a factory function (credentials will come from database)
export function createBlastMotionAPI(username: string, password: string): BlastMotionAPI {
  return new BlastMotionAPI(username, password);
}

export default BlastMotionAPI;
