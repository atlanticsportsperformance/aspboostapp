// Blast Motion API Integration
// Follows the same pattern as VALD ForceDecks API (lib/vald/forcedecks-api.ts)

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
  id: number;  // Blast player ID
  blast_user_id: string;  // UUID - primary identifier
  external_id: string | null;  // Org's external system ID
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  handedness: number | null;  // 0=right, 1=left, 2=both
  jersey_number: string | null;
  position: string | null;
  total_actions: number;  // Total swings in date range
  total_actions_extended: number;  // Swings with PCR scores
  averages: {
    [metricName: string]: BlastMetric;
  };
  has_actions: boolean;
  pcr_situation: boolean;  // true = some swings missing PCR
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
  id: number;  // Swing ID
  blast_id: string;  // UUID - unique identifier for this swing
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
  handedness: number;  // 4=left, 5=right
  sport_id: number;  // 2=baseball, 12=softball
  created_at: {
    date: string;  // yyyy-mm-dd
    time: string;  // HH:mm:ss
  };
}

export class BlastMotionAPI {
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor(username: string, password: string, baseUrl?: string) {
    this.username = username;
    this.password = password;
    this.baseUrl = baseUrl || 'https://connect.blastmotion.com';
  }

  /**
   * Get HTTP Basic Auth header
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Make authenticated request to Blast Motion API
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': this.getAuthHeader(),
      'User-Agent': 'BlastMotion-API-Client/1.0',
      ...options.headers,
    };

    try {
      console.log(`🌐 Making request to Blast Motion API: ${url}`);
      console.log(`🔑 Auth header: Basic ${this.username}:***`);

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
          errorData = { error: responseText.substring(0, 500) }; // First 500 chars
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
    dateStart: string;  // yyyy-mm-dd
    dateEnd: string;  // yyyy-mm-dd
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

      allSwings.push(...response.data.data);

      console.log(`📄 Page ${currentPage}/${response.data.last_page}: Fetched ${response.data.data.length} swings (total: ${allSwings.length})`);

      hasMore = response.data.next_page_url !== null;
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
   */
  async searchPlayer(query: string, params: {
    dateStart: string;
    dateEnd: string;
    academyId?: string;
  }): Promise<BlastPlayer[]> {
    try {
      console.log(`🔍 Searching for player: "${query}"`);

      const response = await this.getTeamInsights({
        ...params,
        search: query,
        page: 1,
        perPage: 25,
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
export function createBlastMotionAPI(username: string, password: string, baseUrl?: string): BlastMotionAPI {
  return new BlastMotionAPI(username, password, baseUrl);
}

export default BlastMotionAPI;
