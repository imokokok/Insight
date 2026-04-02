import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('UMASubgraphService');

export interface UMASubgraphConfig {
  apiKey: string;
  baseUrl: string;
  subgraphId?: string;
}

export interface SubgraphAssertion {
  id: string;
  assertionId: string;
  claim: string;
  asserter: string;
  disputed: boolean;
  settlementResolution: boolean | null;
  settlementPayout: string;
  expirationTime: string;
  assertionTime: string;
  currency: string;
  bond: string;
  identifier: string;
  domainId: string;
  callbackRecipient: string;
  escalationManager: string;
  caller: string;
  maxSettlementDelay: string;
  minAssertionFee: string;
  settlementTime: string | null;
  disputeRequest: {
    id: string;
    disputer: string;
    disputeTime: string;
    disputeBond: string;
  } | null;
}

export interface SubgraphDispute {
  id: string;
  request: {
    id: string;
    proposer: string;
    proposalTime: string;
    proposedPrice: string;
    isDisputed: boolean;
    settlementPrice: string | null;
    finalPrice: string | null;
    identifier: string;
    time: string;
    ancillaryData: string;
    currency: string;
    reward: string;
    finalFee: string;
    bond: string;
    customLiveness: string;
    requestTime: string;
    state: string;
  };
  disputer: string;
  disputeTime: string;
  disputeBond: string;
  resolutionTime: string | null;
  resolutionPrice: string | null;
  resolved: boolean;
}

export interface SubgraphPriceRequest {
  id: string;
  identifier: string;
  time: string;
  ancillaryData: string;
  currency: string;
  reward: string;
  finalFee: string;
  bond: string;
  customLiveness: string;
  requestTime: string;
  proposer: string;
  proposalTime: string;
  proposedPrice: string;
  isDisputed: boolean;
  settlementPrice: string | null;
  finalPrice: string | null;
  state: string;
  proposerDisputeBond: string;
}

export interface SubgraphVoter {
  id: string;
  address: string;
  delegatedVotes: string;
  totalVotes: string;
  totalRewards: string;
  voteCount: number;
  delegatedVotesRaw: string;
}

export interface SubgraphTokenHolder {
  id: string;
  address: string;
  balance: string;
  delegatedBalance: string;
  delegate: string | null;
  lastUpdated: string;
}

export interface SubgraphNetworkStats {
  totalTokenHolders: number;
  totalDelegatedVotes: string;
  totalVotes: string;
  totalPriceRequests: number;
  totalDisputes: number;
  activeDisputes: number;
  resolvedDisputes: number;
}

const UMA_SUBGRAPH_ID = 'HtVvwEa7oLdYeMpbKuKHPXoqW5yiUdVgq1oFy5NPcL7N';

const PRIMARY_ENDPOINTS = [
  'https://api.thegraph.com/subgraphs/name/protofire/uma',
  'https://api.thegraph.com/subgraphs/name/umaprotocol/uma',
];

const DEFAULT_CONFIG: UMASubgraphConfig = {
  apiKey: '',
  baseUrl: 'https://gateway.thegraph.com/api',
  subgraphId: UMA_SUBGRAPH_ID,
};

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export class UMASubgraphService {
  private config: UMASubgraphConfig;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTTL = 30000;
  private workingEndpoint: string | null = null;

  constructor(config?: Partial<UMASubgraphConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getEndpoints(): string[] {
    return PRIMARY_ENDPOINTS;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const cacheKey = `${query}-${JSON.stringify(variables || {})}`;
    const cached = this.getCached<T>(cacheKey);
    if (cached) return cached;

    const endpoints = this.getEndpoints();
    
    if (this.workingEndpoint) {
      const endpointsToTry = [this.workingEndpoint, ...endpoints.filter(e => e !== this.workingEndpoint)];
      const result = await this.tryEndpoints<T>(endpointsToTry, query, variables, cacheKey);
      return result;
    }

    const result = await this.tryEndpoints<T>(endpoints, query, variables, cacheKey);
    return result;
  }

  private async tryEndpoints<T>(
    endpoints: string[],
    query: string,
    variables?: Record<string, unknown>,
    cacheKey?: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const result: GraphQLResponse<T> = await response.json();

        if (result.errors && result.errors.length > 0) {
          const errorMsg = result.errors[0].message;
          if (errorMsg.includes('auth error') || errorMsg.includes('API key')) {
            logger.warn(`API key error for endpoint ${endpoint}, trying next`);
            continue;
          }
          throw new Error(result.errors[0].message);
        }

        if (result.data) {
          this.workingEndpoint = endpoint;
          if (cacheKey) {
            this.setCache(cacheKey, result.data);
          }
          return result.data;
        }

        throw new Error('No data returned from subgraph');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`Subgraph query failed for ${endpoint}:`, error);
      }
    }

    throw lastError || new Error('All subgraph endpoints failed');
  }

  async getAssertions(first: number = 50, skip: number = 0): Promise<SubgraphAssertion[]> {
    const query = `
      query GetAssertions($first: Int!, $skip: Int!) {
        assertions(
          first: $first
          skip: $skip
          orderBy: assertionTime
          orderDirection: desc
        ) {
          id
          assertionId
          claim
          asserter
          disputed
          settlementResolution
          settlementPayout
          expirationTime
          assertionTime
          currency
          bond
          identifier
          domainId
          callbackRecipient
          escalationManager
          caller
          maxSettlementDelay
          minAssertionFee
          settlementTime
          disputeRequest {
            id
            disputer
            disputeTime
            disputeBond
          }
        }
      }
    `;

    const data = await this.query<{ assertions: SubgraphAssertion[] }>(query, { first, skip });
    return data.assertions;
  }

  async getActiveAssertions(): Promise<SubgraphAssertion[]> {
    const now = Math.floor(Date.now() / 1000);
    const query = `
      query GetActiveAssertions($currentTime: BigInt!) {
        assertions(
          where: {
            disputed: false
            settlementTime: null
            expirationTime_gt: $currentTime
          }
          orderBy: assertionTime
          orderDirection: desc
          first: 100
        ) {
          id
          assertionId
          claim
          asserter
          disputed
          settlementResolution
          bond
          identifier
          domainId
          assertionTime
          expirationTime
          currency
        }
      }
    `;

    const data = await this.query<{ assertions: SubgraphAssertion[] }>(query, {
      currentTime: now,
    });
    return data.assertions;
  }

  async getDisputes(first: number = 50, skip: number = 0): Promise<SubgraphDispute[]> {
    const query = `
      query GetDisputes($first: Int!, $skip: Int!) {
        disputes(
          first: $first
          skip: $skip
          orderBy: disputeTime
          orderDirection: desc
        ) {
          id
          disputer
          disputeTime
          disputeBond
          resolutionTime
          resolutionPrice
          resolved
          request {
            id
            proposer
            proposalTime
            proposedPrice
            isDisputed
            settlementPrice
            finalPrice
            identifier
            time
            ancillaryData
            currency
            reward
            finalFee
            bond
            state
          }
        }
      }
    `;

    const data = await this.query<{ disputes: SubgraphDispute[] }>(query, { first, skip });
    return data.disputes;
  }

  async getPriceRequests(first: number = 50, skip: number = 0): Promise<SubgraphPriceRequest[]> {
    const query = `
      query GetPriceRequests($first: Int!, $skip: Int!) {
        priceRequests(
          first: $first
          skip: $skip
          orderBy: requestTime
          orderDirection: desc
        ) {
          id
          identifier
          time
          ancillaryData
          currency
          reward
          finalFee
          bond
          customLiveness
          requestTime
          proposer
          proposalTime
          proposedPrice
          isDisputed
          settlementPrice
          finalPrice
          state
          proposerDisputeBond
        }
      }
    `;

    const data = await this.query<{ priceRequests: SubgraphPriceRequest[] }>(query, {
      first,
      skip,
    });
    return data.priceRequests;
  }

  async getVoters(first: number = 50, skip: number = 0): Promise<SubgraphVoter[]> {
    const query = `
      query GetVoters($first: Int!, $skip: Int!) {
        voters(
          first: $first
          skip: $skip
          orderBy: delegatedVotes
          orderDirection: desc
        ) {
          id
          address
          delegatedVotes
          totalVotes
          totalRewards
          voteCount
          delegatedVotesRaw
        }
      }
    `;

    const data = await this.query<{ voters: SubgraphVoter[] }>(query, { first, skip });
    return data.voters;
  }

  async getTokenHolders(first: number = 50, skip: number = 0): Promise<SubgraphTokenHolder[]> {
    const query = `
      query GetTokenHolders($first: Int!, $skip: Int!) {
        tokenHolders(
          first: $first
          skip: $skip
          orderBy: balance
          orderDirection: desc
        ) {
          id
          address
          balance
          delegatedBalance
          delegate
          lastUpdated
        }
      }
    `;

    const data = await this.query<{ tokenHolders: SubgraphTokenHolder[] }>(query, {
      first,
      skip,
    });
    return data.tokenHolders;
  }

  async getNetworkStats(): Promise<SubgraphNetworkStats> {
    const query = `
      query GetNetworkStats {
        umaProtocols(first: 1) {
          id
          totalTokenHolders
          totalDelegatedVotes
        }
        priceRequests(first: 1000) {
          id
        }
        disputes(first: 1000) {
          id
          resolved
        }
      }
    `;

    interface NetworkStatsResponse {
      umaProtocols: Array<{
        id: string;
        totalTokenHolders: string;
        totalDelegatedVotes: string;
      }>;
      priceRequests: Array<{ id: string }>;
      disputes: Array<{ id: string; resolved: boolean }>;
    }

    const data = await this.query<NetworkStatsResponse>(query);

    const totalDisputes = data.disputes.length;
    const resolvedDisputes = data.disputes.filter((d) => d.resolved).length;
    const activeDisputes = totalDisputes - resolvedDisputes;

    return {
      totalTokenHolders: parseInt(data.umaProtocols[0]?.totalTokenHolders || '0'),
      totalDelegatedVotes: data.umaProtocols[0]?.totalDelegatedVotes || '0',
      totalVotes: '0',
      totalPriceRequests: data.priceRequests.length,
      totalDisputes,
      activeDisputes,
      resolvedDisputes,
    };
  }

  async getDisputesByTimeRange(startTime: number, endTime: number): Promise<SubgraphDispute[]> {
    const query = `
      query GetDisputesByTimeRange($startTime: BigInt!, $endTime: BigInt!) {
        disputes(
          where: {
            disputeTime_gte: $startTime
            disputeTime_lte: $endTime
          }
          orderBy: disputeTime
          orderDirection: desc
          first: 1000
        ) {
          id
          disputer
          disputeTime
          disputeBond
          resolutionTime
          resolutionPrice
          resolved
          request {
            id
            identifier
            currency
            bond
            reward
            state
          }
        }
      }
    `;

    const data = await this.query<{ disputes: SubgraphDispute[] }>(query, {
      startTime,
      endTime,
    });
    return data.disputes;
  }

  async getPriceRequestsByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<SubgraphPriceRequest[]> {
    const query = `
      query GetPriceRequestsByTimeRange($startTime: BigInt!, $endTime: BigInt!) {
        priceRequests(
          where: {
            requestTime_gte: $startTime
            requestTime_lte: $endTime
          }
          orderBy: requestTime
          orderDirection: desc
          first: 1000
        ) {
          id
          identifier
          time
          currency
          bond
          reward
          state
          requestTime
          proposer
          isDisputed
        }
      }
    `;

    const data = await this.query<{ priceRequests: SubgraphPriceRequest[] }>(query, {
      startTime,
      endTime,
    });
    return data.priceRequests;
  }

  async getRecentActivity(hours: number = 24): Promise<{
    assertions: SubgraphAssertion[];
    disputes: SubgraphDispute[];
    priceRequests: SubgraphPriceRequest[];
  }> {
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - hours * 3600;

    const [assertions, disputes, priceRequests] = await Promise.all([
      this.getAssertions(20, 0),
      this.getDisputesByTimeRange(startTime, now),
      this.getPriceRequestsByTimeRange(startTime, now),
    ]);

    return { assertions, disputes, priceRequests };
  }

  clearCache(): void {
    this.cache.clear();
  }

  isConfigured(): boolean {
    return PRIMARY_ENDPOINTS.length > 0;
  }

  async healthCheck(): Promise<{ healthy: boolean; endpoint: string | null; error?: string }> {
    const endpoints = this.getEndpoints();
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ _meta { status } }' }),
        });

        if (!response.ok) {
          continue;
        }

        const result = await response.json();
        
        if (result.errors) {
          continue;
        }

        this.workingEndpoint = endpoint;
        return { healthy: true, endpoint };
      } catch (error) {
        continue;
      }
    }

    return { healthy: false, endpoint: null, error: 'All endpoints unavailable' };
  }
}

export const umaSubgraphService = new UMASubgraphService();
