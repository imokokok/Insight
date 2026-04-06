/**
 * @fileoverview UMA Subgraph服务主模块
 * @description 提供UMA子图数据查询和分析功能
 */

import { getTheGraphApiKey } from '@/lib/config/serverEnv';
import { createLogger } from '@/lib/utils/logger';

import type {
  UMASubgraphConfig,
  SubgraphAssertion,
  SubgraphDispute,
  SubgraphPriceRequest,
  SubgraphVoter,
  SubgraphNetworkStats,
  GraphQLResponse,
} from './uma/types';

const logger = createLogger('UMASubgraphService');

const DEFAULT_CONFIG: UMASubgraphConfig = {
  apiKey: '',
  baseUrl: 'https://gateway.thegraph.com/api',
  subgraphId: 'Qm...uma-subgraph-id',
};

const PRIMARY_ENDPOINTS = ['https://api.thegraph.com/subgraphs/name/uma-protocol/uma'];

const FALLBACK_ENDPOINTS = ['https://subgraph.satsuma-prod.com/uma/uma/api'];

export class UMASubgraphService {
  private config: UMASubgraphConfig;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTTL = 30000;
  private workingEndpoint: string | null = null;

  constructor(config?: Partial<UMASubgraphConfig>) {
    const envApiKey = getTheGraphApiKey();

    this.config = {
      ...DEFAULT_CONFIG,
      apiKey: envApiKey || config?.apiKey || '',
      ...config,
    };
  }

  private getEndpoints(): string[] {
    if (this.config.apiKey) {
      return [
        `${this.config.baseUrl}/${this.config.apiKey}/subgraphs/id/${this.config.subgraphId}`,
      ];
    }
    return [...PRIMARY_ENDPOINTS, ...FALLBACK_ENDPOINTS];
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
      const endpointsToTry = [
        this.workingEndpoint,
        ...endpoints.filter((e) => e !== this.workingEndpoint),
      ];
      return await this.tryEndpoints<T>(endpointsToTry, query, variables, cacheKey);
    }

    return await this.tryEndpoints<T>(endpoints, query, variables, cacheKey);
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
          headers: { 'Content-Type': 'application/json' },
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
        logger.warn(`Subgraph query failed for ${endpoint}:`, lastError);
      }
    }

    throw lastError || new Error('All subgraph endpoints failed');
  }

  async getAssertions(first: number = 50, skip: number = 0): Promise<SubgraphAssertion[]> {
    const query = `
      query GetAssertions($first: Int!, $skip: Int!) {
        assertions(first: $first, skip: $skip, orderBy: assertionTime, orderDirection: desc) {
          id assertionId claim asserter disputed settlementResolution settlementPayout
          expirationTime assertionTime currency bond identifier domainId
          callbackRecipient escalationManager caller maxSettlementDelay minAssertionFee settlementTime
          disputeRequest { id disputer disputeTime disputeBond }
        }
      }
    `;

    const data = await this.query<{ assertions: SubgraphAssertion[] }>(query, { first, skip });
    return data.assertions;
  }

  async getDisputes(first: number = 50, skip: number = 0): Promise<SubgraphDispute[]> {
    const query = `
      query GetDisputes($first: Int!, $skip: Int!) {
        disputes(first: $first, skip: $skip, orderBy: disputeTime, orderDirection: desc) {
          id disputer disputeTime disputeBond resolutionTime resolutionPrice resolved
          request {
            id proposer proposalTime proposedPrice isDisputed settlementPrice finalPrice
            identifier time ancillaryData currency reward finalFee bond customLiveness requestTime state
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
        priceRequests(first: $first, skip: $skip, orderBy: requestTime, orderDirection: desc) {
          id identifier time ancillaryData currency reward finalFee bond customLiveness
          requestTime proposer proposalTime proposedPrice isDisputed settlementPrice finalPrice state proposerDisputeBond
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
        voters(first: $first, skip: $skip, orderBy: totalVotes, orderDirection: desc) {
          id address delegatedVotes totalVotes totalRewards voteCount delegatedVotesRaw
        }
      }
    `;

    const data = await this.query<{ voters: SubgraphVoter[] }>(query, { first, skip });
    return data.voters;
  }

  async getNetworkStats(): Promise<SubgraphNetworkStats> {
    const query = `
      query GetNetworkStats {
        umaProtocols(first: 1) {
          id totalAssertions totalDisputes totalPriceRequests totalVoters totalBond totalRewards activeAssertions pendingDisputes
        }
      }
    `;

    const data = await this.query<{ umaProtocols: SubgraphNetworkStats[] }>(query);
    return (
      data.umaProtocols[0] || {
        totalAssertions: '0',
        totalDisputes: '0',
        totalPriceRequests: '0',
        totalVoters: '0',
        totalBond: '0',
        totalRewards: '0',
        activeAssertions: '0',
        pendingDisputes: '0',
      }
    );
  }

  clearCache(): void {
    this.cache.clear();
    this.workingEndpoint = null;
    logger.info('UMA subgraph cache cleared');
  }

  isConfigured(): boolean {
    return !!(this.config.apiKey || this.workingEndpoint);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.getNetworkStats();
      return true;
    } catch (error) {
      logger.error('UMA subgraph health check failed', error as Error);
      return false;
    }
  }
}

export type {
  UMASubgraphConfig,
  SubgraphAssertion,
  SubgraphDispute,
  SubgraphPriceRequest,
  SubgraphVoter,
  SubgraphNetworkStats,
  GraphQLResponse,
} from './uma/types';

export const umaSubgraphService = new UMASubgraphService();
