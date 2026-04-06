import axios, { AxiosError } from 'axios';

import { createLogger } from '@/lib/utils/logger';

import {
  getAccountInfo,
  getAccountBalance,
  getDelegatorDelegations,
  getDelegatorRewards,
} from './account';
import {
  getLatestBlockHeight,
  getBlock,
  getBlockInfo as getBlockInfoImpl,
  getBlocks,
  getLatestBlocks as getLatestBlocksImpl,
} from './blocks';
import { getChainEvents } from './chainEvents';
import {
  getProposals,
  getProposalVotes,
  getGovernanceParams as getGovernanceParamsImpl,
} from './governance';
import { getIBCChannels, getIBCConnections } from './ibc';
import { getNetworkStats, getMarketData, getStakingInfo } from './network';
import { getDataSources, getDataSourceById, getOracleScripts, getOracleRequests } from './oracle';
import { getTransaction, searchTransactions } from './transactions';
import {
  type EventType,
  ValidatorInfo,
  BlockInfo,
  TransactionInfo,
  DelegationInfo,
  RewardInfo,
  BandNetworkStats,
  BandProtocolMarketData,
  StakingInfo,
  DataSource,
  OracleScript,
  OracleRequestInfo,
  GovernanceProposal,
  GovernanceParams,
  AccountInfo,
  IBCChannelInfo,
  IBCConnectionInfo,
  ChainEvent,
} from './types';
import { getValidators, getValidatorDelegations } from './validators';


const logger = createLogger('BandRpcService');

const BAND_REST_URL = 'https://laozi1.bandchain.org/api';
const CACHE_TTL = 30000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class BandRpcService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly restUrl: string;

  constructor(restUrl: string = BAND_REST_URL) {
    this.restUrl = restUrl;
  }

  private getCacheKey(method: string, params?: Record<string, unknown>): string {
    return `${method}:${params ? JSON.stringify(params) : ''}`;
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data as T;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async makeRestCall<T>(endpoint: string): Promise<T> {
    const cacheKey = this.getCacheKey(`rest:${endpoint}`, {});
    const cached = this.getCached<T>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get<T>(`${this.restUrl}${endpoint}`, {
        timeout: 10000,
        headers: {
          Accept: 'application/json',
        },
      });

      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        logger.error(`REST call failed: ${endpoint}`, error, { status: error.response?.status });
        throw new Error(`Failed to call ${endpoint}: ${error.message}`);
      }
      throw error;
    }
  }

  async getLatestBlockHeight(): Promise<number> {
    return getLatestBlockHeight(this.makeRestCall.bind(this));
  }

  async getBlock(height?: number): Promise<BlockInfo> {
    const result = await getBlock(this.makeRestCall.bind(this), height);
    return {
      height: parseInt(result.block.header.height, 10),
      hash: '',
      time: result.block.header.time,
      proposerAddress: result.block.header.proposer_address,
      txCount: result.block.data.txs.length,
      chainId: result.block.header.chain_id,
    };
  }

  async getBlockInfo(height?: number): Promise<BlockInfo> {
    return getBlockInfoImpl(this.makeRestCall.bind(this), height);
  }

  async getBlocks(minHeight: number, maxHeight: number): Promise<BlockInfo[]> {
    return getBlocks(this.makeRestCall.bind(this), minHeight, maxHeight);
  }

  async getLatestBlocks(limit: number = 10): Promise<BlockInfo[]> {
    return getLatestBlocksImpl(this.makeRestCall.bind(this), limit);
  }

  async getTransaction(hash: string): Promise<TransactionInfo> {
    return getTransaction(this.makeRestCall.bind(this), hash);
  }

  async searchTransactions(
    query: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<{ transactions: TransactionInfo[]; total: number }> {
    return searchTransactions(this.makeRestCall.bind(this), query, page, perPage);
  }

  async getLatestTransactions(limit: number = 20): Promise<TransactionInfo[]> {
    try {
      const latestHeight = await this.getLatestBlockHeight();
      const { transactions } = await this.searchTransactions(
        `tx.height>${latestHeight - 100}`,
        1,
        limit
      );
      return transactions.slice(0, limit);
    } catch (error) {
      logger.error(
        'Failed to get latest transactions',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getValidators(limit: number = 100): Promise<ValidatorInfo[]> {
    return getValidators(this.makeRestCall.bind(this), limit);
  }

  async getValidatorDelegations(
    validatorAddress: string,
    limit: number = 100
  ): Promise<DelegationInfo[]> {
    return getValidatorDelegations(this.makeRestCall.bind(this), validatorAddress, limit);
  }

  async getDelegatorDelegations(delegatorAddress: string): Promise<DelegationInfo[]> {
    return getDelegatorDelegations(this.makeRestCall.bind(this), delegatorAddress);
  }

  async getDelegatorRewards(delegatorAddress: string): Promise<RewardInfo[]> {
    return getDelegatorRewards(this.makeRestCall.bind(this), delegatorAddress);
  }

  async getNetworkStats(): Promise<BandNetworkStats> {
    return getNetworkStats(this.makeRestCall.bind(this), () => this.getBlock());
  }

  async getMarketData(): Promise<BandProtocolMarketData> {
    return getMarketData(this.makeRestCall.bind(this), () => this.getNetworkStats());
  }

  async getStakingInfo(): Promise<StakingInfo> {
    return getStakingInfo(this.makeRestCall.bind(this));
  }

  async getDataSources(limit: number = 100): Promise<DataSource[]> {
    return getDataSources(this.makeRestCall.bind(this), limit);
  }

  async getDataSourceById(id: number): Promise<DataSource | null> {
    return getDataSourceById(this.makeRestCall.bind(this), id);
  }

  async getOracleScripts(limit: number = 100): Promise<OracleScript[]> {
    return getOracleScripts(this.makeRestCall.bind(this), limit);
  }

  async getOracleRequests(limit: number = 100, status?: string): Promise<OracleRequestInfo[]> {
    return getOracleRequests(this.makeRestCall.bind(this), limit, status);
  }

  async getProposals(status?: string): Promise<GovernanceProposal[]> {
    return getProposals(this.makeRestCall.bind(this), status);
  }

  async getProposalVotes(
    proposalId: number,
    limit: number = 100
  ): Promise<Array<{ voter: string; option: string; weight: string }>> {
    return getProposalVotes(this.makeRestCall.bind(this), proposalId, limit);
  }

  async getGovernanceParams(): Promise<GovernanceParams> {
    return getGovernanceParamsImpl(this.makeRestCall.bind(this));
  }

  async getAccountInfo(address: string): Promise<AccountInfo> {
    return getAccountInfo(this.makeRestCall.bind(this), address);
  }

  async getAccountBalance(address: string): Promise<Array<{ denom: string; amount: number }>> {
    return getAccountBalance(this.makeRestCall.bind(this), address);
  }

  async getIBCChannels(limit: number = 100): Promise<IBCChannelInfo[]> {
    return getIBCChannels(this.makeRestCall.bind(this), limit);
  }

  async getIBCConnections(limit: number = 100): Promise<IBCConnectionInfo[]> {
    return getIBCConnections(this.makeRestCall.bind(this), limit);
  }

  async getChainEvents(eventType: EventType, limit: number = 100): Promise<ChainEvent[]> {
    return getChainEvents(this.makeRestCall.bind(this), eventType, limit);
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const bandRpcService = new BandRpcService();
export { BandRpcService };
