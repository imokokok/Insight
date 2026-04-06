import axios, { AxiosError } from 'axios';

import { createLogger } from '@/lib/utils/logger';

import { EventType } from './types';

import type {
  BandNetworkStats,
  ValidatorInfo,
  BandProtocolMarketData,
  OracleScript,
  GovernanceProposal,
  GovernanceParams,
  DataSource,
  ChainEvent,
  StakingInfo,
} from './types';

const logger = createLogger('BandRpcService');

const BAND_REST_URL = 'https://laozi1.bandchain.org/api';
const CACHE_TTL = 30000; // 30 seconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Block interfaces
interface BlockResult {
  block: {
    header: {
      height: string;
      time: string;
      chain_id: string;
      proposer_address: string;
    };
    data: {
      txs: string[];
    };
    last_commit: {
      signatures: Array<{
        validator_address: string;
        timestamp: string;
        signature: string;
      }>;
    };
  };
}

// Validator interfaces
interface ValidatorResult {
  validators: Array<{
    operator_address: string;
    consensus_pubkey: {
      '@type': string;
      key: string;
    };
    jailed: boolean;
    status: string;
    tokens: string;
    delegator_shares: string;
    description: {
      moniker: string;
      identity: string;
      website: string;
      details: string;
    };
    commission: {
      commission_rates: {
        rate: string;
        max_rate: string;
        max_change_rate: string;
      };
    };
    min_self_delegation: string;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface ValidatorDelegationsResult {
  delegation_responses: Array<{
    delegation: {
      delegator_address: string;
      validator_address: string;
      shares: string;
    };
    balance: {
      denom: string;
      amount: string;
    };
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface DelegatorDelegationsResult {
  delegation_responses: Array<{
    delegation: {
      delegator_address: string;
      validator_address: string;
      shares: string;
    };
    balance: {
      denom: string;
      amount: string;
    };
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface DelegatorRewardsResult {
  rewards: Array<{
    validator_address: string;
    reward: Array<{
      denom: string;
      amount: string;
    }>;
  }>;
  total: Array<{
    denom: string;
    amount: string;
  }>;
}

// Staking and supply interfaces
interface StakingPoolResult {
  pool: {
    not_bonded_tokens: string;
    bonded_tokens: string;
  };
}

interface MintingParamsResult {
  params: {
    mint_denom: string;
    inflation_rate_change: string;
    inflation_max: string;
    inflation_min: string;
    goal_bonded: string;
    blocks_per_year: string;
  };
}

interface SupplyResult {
  supply: Array<{
    denom: string;
    amount: string;
  }>;
}

interface CommunityPoolResult {
  pool: Array<{
    denom: string;
    amount: string;
  }>;
}

interface OracleScriptResult {
  oracle_scripts: Array<{
    id: string;
    owner: string;
    name: string;
    description: string;
    filename: string;
    schema: string;
    codehash: string;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface OracleRequestsResult {
  requests: Array<{
    id: string;
    oracle_script_id: string;
    calldata: string;
    ask_count: string;
    min_count: string;
    request_height: string;
    request_time: string;
    resolve_height: string;
    resolve_time: string;
    result: string;
    status: string;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

// Governance interfaces
interface ProposalsResult {
  proposals: Array<{
    proposal_id: string;
    content: {
      '@type': string;
      title: string;
      description: string;
    };
    status: string;
    final_tally_result: {
      yes: string;
      abstain: string;
      no: string;
      no_with_veto: string;
    };
    submit_time: string;
    deposit_end_time: string;
    total_deposit: Array<{
      denom: string;
      amount: string;
    }>;
    voting_start_time: string;
    voting_end_time: string;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface ProposalVotesResult {
  votes: Array<{
    proposal_id: string;
    voter: string;
    option: string;
    options: Array<{
      option: string;
      weight: string;
    }>;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

// Transaction interfaces
interface TxResult {
  tx: {
    body: {
      messages: Array<{
        '@type': string;
        [key: string]: unknown;
      }>;
      memo: string;
    };
    auth_info: {
      fee: {
        amount: Array<{
          denom: string;
          amount: string;
        }>;
        gas_limit: string;
      };
    };
  };
  tx_response: {
    height: string;
    txhash: string;
    codespace: string;
    code: number;
    data: string;
    raw_log: string;
    logs: Array<{
      msg_index: number;
      log: string;
      events: Array<{
        type: string;
        attributes: Array<{
          key: string;
          value: string;
        }>;
      }>;
    }>;
    info: string;
    gas_wanted: string;
    gas_used: string;
    tx: string;
    timestamp: string;
  };
}

// Account interfaces
interface AccountResult {
  account: {
    '@type': string;
    address: string;
    pub_key?: {
      '@type': string;
      key: string;
    };
    account_number: string;
    sequence: string;
  };
}

interface BalanceResult {
  balances: Array<{
    denom: string;
    amount: string;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

// IBC interfaces
interface IBCChannelsResult {
  channels: Array<{
    state: string;
    ordering: string;
    counterparty: {
      port_id: string;
      channel_id: string;
    };
    connection_hops: string[];
    version: string;
    port_id: string;
    channel_id: string;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface IBCConnectionsResult {
  connections: Array<{
    id: string;
    client_id: string;
    versions: Array<{
      identifier: string;
      features: string[];
    }>;
    state: string;
    counterparty: {
      client_id: string;
      connection_id: string;
      prefix: {
        key_prefix: string;
      };
    };
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

// Export types
export interface BlockInfo {
  height: number;
  hash: string;
  time: string;
  proposerAddress: string;
  txCount: number;
  chainId: string;
}

export interface TransactionInfo {
  hash: string;
  height: number;
  timestamp: string;
  gasUsed: number;
  gasWanted: number;
  code: number;
  memo: string;
  messages: Array<{
    type: string;
    [key: string]: unknown;
  }>;
}

export interface DelegationInfo {
  delegatorAddress: string;
  validatorAddress: string;
  shares: number;
  balance: number;
}

export interface RewardInfo {
  validatorAddress: string;
  rewards: Array<{
    denom: string;
    amount: number;
  }>;
}

export interface AccountInfo {
  address: string;
  accountNumber: number;
  sequence: number;
  balances: Array<{
    denom: string;
    amount: number;
  }>;
}

export interface IBCChannelInfo {
  channelId: string;
  portId: string;
  state: string;
  ordering: string;
  counterpartyChannelId: string;
  counterpartyPortId: string;
  connectionHops: string[];
  version: string;
}

export interface IBCConnectionInfo {
  connectionId: string;
  clientId: string;
  state: string;
  counterpartyConnectionId: string;
  counterpartyClientId: string;
  versions: Array<{
    identifier: string;
    features: string[];
  }>;
}

export interface OracleRequestInfo {
  id: number;
  oracleScriptId: number;
  calldata: string;
  askCount: number;
  minCount: number;
  requestHeight: number;
  requestTime: string;
  resolveHeight: number;
  resolveTime: string;
  result: string;
  status: string;
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

  // ==================== BLOCK METHODS ====================

  // Get latest block height
  async getLatestBlockHeight(): Promise<number> {
    try {
      const result = await this.makeRestCall<{ block: { header: { height: string } } }>(
        '/cosmos/base/tendermint/v1beta1/blocks/latest'
      );
      return parseInt(result.block.header.height, 10);
    } catch (error) {
      logger.error(
        'Failed to get latest block height',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // Get block by height
  async getBlock(height?: number): Promise<BlockResult> {
    const endpoint = height
      ? `/cosmos/base/tendermint/v1beta1/blocks/${height}`
      : '/cosmos/base/tendermint/v1beta1/blocks/latest';
    return this.makeRestCall<BlockResult>(endpoint);
  }

  // Get block info by height
  async getBlockInfo(height?: number): Promise<BlockInfo> {
    try {
      const block = await this.getBlock(height);
      return {
        height: parseInt(block.block.header.height, 10),
        hash: '', // Not directly available in this endpoint
        time: block.block.header.time,
        proposerAddress: block.block.header.proposer_address,
        txCount: block.block.data.txs.length,
        chainId: block.block.header.chain_id,
      };
    } catch (error) {
      logger.error(
        'Failed to get block info',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // Get multiple blocks
  async getBlocks(minHeight: number, maxHeight: number): Promise<BlockInfo[]> {
    try {
      // Use REST API to get block headers for the range
      const blockInfos: BlockInfo[] = [];
      const promises: Promise<void>[] = [];

      // Limit to 20 blocks at a time to avoid too many requests
      const limit = Math.min(maxHeight - minHeight + 1, 20);
      const startHeight = maxHeight - limit + 1;

      for (let height = startHeight; height <= maxHeight; height++) {
        promises.push(
          this.makeRestCall<{
            block: {
              header: {
                height: string;
                time: string;
                proposer_address: string;
                chain_id: string;
              };
              data: { txs: string[] };
            };
          }>(`/cosmos/base/tendermint/v1beta1/blocks/${height}`)
            .then((result) => {
              blockInfos.push({
                height: parseInt(result.block.header.height, 10),
                hash: '', // Not directly available in this endpoint
                time: result.block.header.time,
                proposerAddress: result.block.header.proposer_address,
                txCount: result.block.data.txs.length,
                chainId: result.block.header.chain_id,
              });
            })
            .catch(() => {
              // Skip failed blocks
            })
        );
      }

      await Promise.all(promises);

      // Sort by height descending
      return blockInfos.sort((a, b) => b.height - a.height);
    } catch (error) {
      logger.error(
        'Failed to get blocks',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // Get latest blocks
  async getLatestBlocks(limit: number = 10): Promise<BlockInfo[]> {
    try {
      const latestHeight = await this.getLatestBlockHeight();
      const minHeight = Math.max(1, latestHeight - limit + 1);
      return this.getBlocks(minHeight, latestHeight);
    } catch (error) {
      logger.error(
        'Failed to get latest blocks',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // ==================== TRANSACTION METHODS ====================

  // Get transaction by hash
  async getTransaction(hash: string): Promise<TransactionInfo> {
    try {
      const result = await this.makeRestCall<TxResult>(`/cosmos/tx/v1beta1/txs/${hash}`);

      return {
        hash: result.tx_response.txhash,
        height: parseInt(result.tx_response.height, 10),
        timestamp: result.tx_response.timestamp,
        gasUsed: parseInt(result.tx_response.gas_used, 10),
        gasWanted: parseInt(result.tx_response.gas_wanted, 10),
        code: result.tx_response.code,
        memo: result.tx.body.memo,
        messages: result.tx.body.messages.map((msg) => ({
          type: msg['@type'],
          ...msg,
        })),
      };
    } catch (error) {
      logger.error(
        'Failed to get transaction',
        error instanceof Error ? error : new Error(String(error)),
        { hash }
      );
      throw error;
    }
  }

  // Search transactions
  async searchTransactions(
    query: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<{ transactions: TransactionInfo[]; total: number }> {
    try {
      // Parse query to extract height filter if present
      const heightMatch = query.match(/tx\.height>(\d+)/);
      const minHeight = heightMatch ? parseInt(heightMatch[1], 10) : undefined;

      // Use REST API to get transactions
      let endpoint = `/cosmos/tx/v1beta1/txs?pagination.limit=${perPage}&pagination.offset=${(page - 1) * perPage}`;
      if (minHeight !== undefined) {
        endpoint += `&events=tx.height>${minHeight}`;
      }

      const result = await this.makeRestCall<{
        txs: Array<{
          body: {
            messages: Array<{
              '@type': string;
              [key: string]: unknown;
            }>;
            memo: string;
          };
        }>;
        tx_responses: Array<{
          height: string;
          txhash: string;
          code: number;
          raw_log: string;
          gas_wanted: string;
          gas_used: string;
          timestamp: string;
        }>;
        pagination: {
          total: string;
        };
      }>(endpoint);

      const transactions = result.txs.map((tx, index) => ({
        hash: result.tx_responses[index]?.txhash || '',
        height: parseInt(result.tx_responses[index]?.height || '0', 10),
        timestamp: result.tx_responses[index]?.timestamp || '',
        gasUsed: parseInt(result.tx_responses[index]?.gas_used || '0', 10),
        gasWanted: parseInt(result.tx_responses[index]?.gas_wanted || '0', 10),
        code: result.tx_responses[index]?.code || 0,
        memo: tx.body.memo,
        messages: tx.body.messages.map((msg) => ({
          type: msg['@type'],
          ...msg,
        })),
      }));

      return {
        transactions,
        total: parseInt(result.pagination.total, 10),
      };
    } catch (error) {
      logger.error(
        'Failed to search transactions',
        error instanceof Error ? error : new Error(String(error)),
        { query }
      );
      throw error;
    }
  }

  // Get latest transactions
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

  // ==================== VALIDATOR METHODS ====================

  // Get validators
  async getValidators(limit: number = 100): Promise<ValidatorInfo[]> {
    try {
      const result = await this.makeRestCall<ValidatorResult>(
        `/cosmos/staking/v1beta1/validators?pagination.limit=${limit}&status=BOND_STATUS_BONDED`
      );

      return result.validators.map((v, index) => ({
        operatorAddress: v.operator_address,
        moniker: v.description.moniker || `Validator ${index + 1}`,
        identity: v.description.identity || '',
        website: v.description.website || '',
        details: v.description.details || '',
        tokens: parseFloat(v.tokens) / 1e6, // Convert uband to BAND
        delegatorShares: parseFloat(v.delegator_shares) / 1e6,
        commissionRate: parseFloat(v.commission.commission_rates.rate),
        maxCommissionRate: parseFloat(v.commission.commission_rates.max_rate),
        maxCommissionChangeRate: parseFloat(v.commission.commission_rates.max_change_rate),
        uptime: 0, // RPC doesn't provide uptime directly, set to 0 instead of mock
        jailed: v.jailed,
        rank: index + 1,
      }));
    } catch (error) {
      logger.error(
        'Failed to get validators',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // Get validator delegations
  async getValidatorDelegations(
    validatorAddress: string,
    limit: number = 100
  ): Promise<DelegationInfo[]> {
    try {
      const result = await this.makeRestCall<ValidatorDelegationsResult>(
        `/cosmos/staking/v1beta1/validators/${validatorAddress}/delegations?pagination.limit=${limit}`
      );

      return result.delegation_responses.map((d) => ({
        delegatorAddress: d.delegation.delegator_address,
        validatorAddress: d.delegation.validator_address,
        shares: parseFloat(d.delegation.shares) / 1e6,
        balance: parseFloat(d.balance.amount) / 1e6,
      }));
    } catch (error) {
      logger.error(
        'Failed to get validator delegations',
        error instanceof Error ? error : new Error(String(error)),
        { validatorAddress }
      );
      throw error;
    }
  }

  // ==================== DELEGATION METHODS ====================

  // Get delegator delegations
  async getDelegatorDelegations(delegatorAddress: string): Promise<DelegationInfo[]> {
    try {
      const result = await this.makeRestCall<DelegatorDelegationsResult>(
        `/cosmos/staking/v1beta1/delegations/${delegatorAddress}`
      );

      return result.delegation_responses.map((d) => ({
        delegatorAddress: d.delegation.delegator_address,
        validatorAddress: d.delegation.validator_address,
        shares: parseFloat(d.delegation.shares) / 1e6,
        balance: parseFloat(d.balance.amount) / 1e6,
      }));
    } catch (error) {
      logger.error(
        'Failed to get delegator delegations',
        error instanceof Error ? error : new Error(String(error)),
        { delegatorAddress }
      );
      throw error;
    }
  }

  // Get delegator rewards
  async getDelegatorRewards(delegatorAddress: string): Promise<RewardInfo[]> {
    try {
      const result = await this.makeRestCall<DelegatorRewardsResult>(
        `/cosmos/distribution/v1beta1/delegators/${delegatorAddress}/rewards`
      );

      return result.rewards.map((r) => ({
        validatorAddress: r.validator_address,
        rewards: r.reward.map((reward) => ({
          denom: reward.denom,
          amount: parseFloat(reward.amount) / 1e6,
        })),
      }));
    } catch (error) {
      logger.error(
        'Failed to get delegator rewards',
        error instanceof Error ? error : new Error(String(error)),
        { delegatorAddress }
      );
      throw error;
    }
  }

  // ==================== NETWORK METHODS ====================

  // Get network stats
  async getNetworkStats(): Promise<BandNetworkStats> {
    try {
      const [blockResult, stakingPool, mintingParams, supply, communityPool] = await Promise.all([
        this.getBlock(),
        this.makeRestCall<StakingPoolResult>('/cosmos/staking/v1beta1/pool'),
        this.makeRestCall<MintingParamsResult>('/cosmos/mint/v1beta1/params'),
        this.makeRestCall<SupplyResult>('/cosmos/bank/v1beta1/supply'),
        this.makeRestCall<CommunityPoolResult>('/cosmos/distribution/v1beta1/community_pool'),
      ]);

      const bondedTokens = parseFloat(stakingPool.pool.bonded_tokens) / 1e6;
      const totalSupply = supply.supply.find((s) => s.denom === 'uband')?.amount || '0';
      const totalSupplyBand = parseFloat(totalSupply) / 1e6;
      const communityPoolBand = communityPool.pool.find((p) => p.denom === 'uband')?.amount || '0';

      // Get active validators count
      const validatorsResult = await this.makeRestCall<ValidatorResult>(
        '/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=1'
      );
      const activeValidators = parseInt(validatorsResult.pagination.total, 10);

      // Get total validators count
      const allValidatorsResult = await this.makeRestCall<ValidatorResult>(
        '/cosmos/staking/v1beta1/validators?pagination.limit=1'
      );
      const totalValidators = parseInt(allValidatorsResult.pagination.total, 10);

      return {
        activeValidators,
        totalValidators,
        bondedTokens,
        totalSupply: totalSupplyBand,
        stakingRatio: totalSupplyBand > 0 ? (bondedTokens / totalSupplyBand) * 100 : 0,
        blockTime: 2.8, // Average block time for BandChain
        latestBlockHeight: parseInt(blockResult.block.header.height, 10),
        inflationRate: parseFloat(mintingParams.params.inflation_max) * 100,
        communityPool: parseFloat(communityPoolBand) / 1e6,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error(
        'Failed to get network stats',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // ==================== MARKET METHODS ====================

  // Get market data (BAND token price)
  async getMarketData(): Promise<BandProtocolMarketData> {
    try {
      const [networkStats, supply] = await Promise.all([
        this.getNetworkStats(),
        this.makeRestCall<SupplyResult>('/cosmos/bank/v1beta1/supply'),
      ]);

      const totalSupply = supply.supply.find((s) => s.denom === 'uband')?.amount || '0';
      const totalSupplyBand = parseFloat(totalSupply) / 1e6;

      return {
        symbol: 'BAND',
        price: 0,
        priceChange24h: 0,
        priceChangePercentage24h: 0,
        marketCap: 0,
        volume24h: 0,
        circulatingSupply: totalSupplyBand,
        totalSupply: totalSupplyBand,
        maxSupply: 250_000_000,
        stakingRatio: networkStats.stakingRatio,
        stakingApr: 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error(
        'Failed to get market data',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // ==================== STAKING METHODS ====================

  // Get staking info
  async getStakingInfo(): Promise<StakingInfo> {
    try {
      const [stakingPool, mintingParams, supply, communityPool] = await Promise.all([
        this.makeRestCall<StakingPoolResult>('/cosmos/staking/v1beta1/pool'),
        this.makeRestCall<MintingParamsResult>('/cosmos/mint/v1beta1/params'),
        this.makeRestCall<SupplyResult>('/cosmos/bank/v1beta1/supply'),
        this.makeRestCall<CommunityPoolResult>('/cosmos/distribution/v1beta1/community_pool'),
      ]);

      const bondedTokens = parseFloat(stakingPool.pool.bonded_tokens) / 1e6;
      const totalSupply = supply.supply.find((s) => s.denom === 'uband')?.amount || '0';
      const totalSupplyBand = parseFloat(totalSupply) / 1e6;
      const communityPoolBand = communityPool.pool.find((p) => p.denom === 'uband')?.amount || '0';

      return {
        totalStaked: bondedTokens,
        stakingRatio: totalSupplyBand > 0 ? (bondedTokens / totalSupplyBand) * 100 : 0,
        stakingAPR: parseFloat(mintingParams.params.inflation_max) * 100,
        unbondingPeriod: 21, // 21 days for BandChain
        minStake: 1, // 1 BAND minimum
        slashingRate: 0.01, // 1% slashing rate
        communityPool: parseFloat(communityPoolBand) / 1e6,
        inflation: parseFloat(mintingParams.params.inflation_max) * 100,
      };
    } catch (error) {
      logger.error(
        'Failed to get staking info',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // ==================== ORACLE METHODS ====================

  // Get oracle data sources (price feeds)
  async getDataSources(limit: number = 100): Promise<DataSource[]> {
    try {
      // Use price_feeds endpoint with BTC:USD as default pair
      const result = await this.makeRestCall<{
        price_feeds: Array<{
          symbol: string;
          price: string;
          timestamp: string;
        }>;
      }>(`/band/oracle/v1/price_feeds/BTC:USD`);

      if (!result.price_feeds || result.price_feeds.length === 0) {
        return [];
      }

      return result.price_feeds.slice(0, limit).map((feed, index) => ({
        id: index + 1,
        name: feed.symbol,
        symbol: feed.symbol.replace(/\//g, '_').toUpperCase(),
        description: `${feed.symbol} price feed`,
        owner: '',
        provider: 'Band Protocol',
        status: 'active',
        lastUpdated: parseInt(feed.timestamp, 10) || Date.now(),
        reliability: 0,
        category: 'crypto',
        updateFrequency: '30s',
        deviationThreshold: '0.5%',
        totalRequests: 0,
      }));
    } catch (error) {
      // Oracle endpoints may not be available on the REST API
      // Return empty array instead of throwing
      logger.warn(
        'Oracle data sources endpoint not available, returning empty array',
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  // Get data source by id
  async getDataSourceById(id: number): Promise<DataSource | null> {
    try {
      const result = await this.makeRestCall<{
        data_source: {
          id: string;
          name: string;
          description: string;
          owner: string;
        };
      }>(`/oracle/v1/data_sources/${id}`);

      if (!result.data_source) {
        return null;
      }

      return {
        id: parseInt(result.data_source.id, 10),
        name: result.data_source.name,
        symbol: result.data_source.name.replace(/\s+/g, '_').toUpperCase(),
        description: result.data_source.description || `${result.data_source.name} data source`,
        owner: result.data_source.owner,
        provider: 'Band Protocol',
        status: 'active',
        lastUpdated: Date.now(),
        reliability: 0,
        category: 'crypto',
        updateFrequency: '30s',
        deviationThreshold: '0.5%',
        totalRequests: 0,
      };
    } catch (error) {
      // Oracle endpoints may not be available on the REST API
      logger.warn(
        'Oracle data source by id endpoint not available, returning null',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  // Get oracle scripts
  async getOracleScripts(limit: number = 100): Promise<OracleScript[]> {
    try {
      const result = await this.makeRestCall<OracleScriptResult>(
        `/oracle/v1/oracle_scripts?pagination.limit=${limit}`
      );

      return result.oracle_scripts.map((script) => ({
        id: parseInt(script.id, 10),
        name: script.name,
        description: script.description || `${script.name} oracle script`,
        owner: script.owner,
        schema: script.schema || '{"input": "string", "output": "string"}',
        code: `// Oracle Script: ${script.name}\n// Code hash: ${script.codehash}`,
        callCount: 0,
        successRate: 0,
        avgResponseTime: 0,
        category: 'price',
        lastUpdated: Date.now(),
      }));
    } catch (error) {
      // Oracle endpoints may not be available on the REST API
      logger.warn(
        'Oracle scripts endpoint not available, returning empty array',
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  // Get oracle requests
  async getOracleRequests(limit: number = 100, status?: string): Promise<OracleRequestInfo[]> {
    try {
      let endpoint = `/oracle/v1/requests?pagination.limit=${limit}`;
      if (status) {
        endpoint += `&status=${status}`;
      }

      const result = await this.makeRestCall<OracleRequestsResult>(endpoint);

      return result.requests.map((req) => ({
        id: parseInt(req.id, 10),
        oracleScriptId: parseInt(req.oracle_script_id, 10),
        calldata: req.calldata,
        askCount: parseInt(req.ask_count, 10),
        minCount: parseInt(req.min_count, 10),
        requestHeight: parseInt(req.request_height, 10),
        requestTime: req.request_time,
        resolveHeight: parseInt(req.resolve_height, 10),
        resolveTime: req.resolve_time,
        result: req.result,
        status: req.status,
      }));
    } catch (error) {
      logger.error(
        'Failed to get oracle requests',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // ==================== GOVERNANCE METHODS ====================

  // Get governance proposals
  async getProposals(status?: string): Promise<GovernanceProposal[]> {
    try {
      let endpoint = '/cosmos/gov/v1beta1/proposals';
      if (status) {
        endpoint += `?proposal_status=${status}`;
      }

      const result = await this.makeRestCall<ProposalsResult>(endpoint);

      const statusMap: Record<string, 'deposit' | 'voting' | 'passed' | 'rejected' | 'failed'> = {
        PROPOSAL_STATUS_DEPOSIT_PERIOD: 'deposit',
        PROPOSAL_STATUS_VOTING_PERIOD: 'voting',
        PROPOSAL_STATUS_PASSED: 'passed',
        PROPOSAL_STATUS_REJECTED: 'rejected',
        PROPOSAL_STATUS_FAILED: 'failed',
      };

      return result.proposals.map((p) => {
        const yes = parseInt(p.final_tally_result.yes, 10);
        const no = parseInt(p.final_tally_result.no, 10);
        const abstain = parseInt(p.final_tally_result.abstain, 10);
        const noWithVeto = parseInt(p.final_tally_result.no_with_veto, 10);

        return {
          id: parseInt(p.proposal_id, 10),
          title: p.content.title,
          description: p.content.description,
          type: p.content['@type'].split('.').pop() || 'Unknown',
          status: statusMap[p.status] || 'deposit',
          submitTime: new Date(p.submit_time).getTime(),
          depositEndTime: new Date(p.deposit_end_time).getTime(),
          votingEndTime: new Date(p.voting_end_time).getTime(),
          proposer: '', // Not provided in this endpoint
          totalDeposit: p.total_deposit.reduce((sum, d) => sum + parseInt(d.amount, 10), 0) / 1e6,
          votes: {
            yes,
            no,
            abstain,
            noWithVeto,
          },
        };
      });
    } catch (error) {
      logger.error(
        'Failed to get proposals',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // Get proposal votes
  async getProposalVotes(
    proposalId: number,
    limit: number = 100
  ): Promise<Array<{ voter: string; option: string; weight: string }>> {
    try {
      const result = await this.makeRestCall<ProposalVotesResult>(
        `/cosmos/gov/v1beta1/proposals/${proposalId}/votes?pagination.limit=${limit}`
      );

      return result.votes.map((v) => ({
        voter: v.voter,
        option: v.option,
        weight: v.options[0]?.weight || '1',
      }));
    } catch (error) {
      logger.error(
        'Failed to get proposal votes',
        error instanceof Error ? error : new Error(String(error)),
        { proposalId }
      );
      throw error;
    }
  }

  // Get governance params
  async getGovernanceParams(): Promise<GovernanceParams> {
    try {
      await this.makeRestCall<{
        voting_params: { voting_period: string };
        deposit_params: {
          min_deposit: Array<{ denom: string; amount: string }>;
          max_deposit_period: string;
        };
        tally_params: { quorum: string; threshold: string; veto_threshold: string };
      }>('/cosmos/gov/v1beta1/params/voting');

      const depositResult = await this.makeRestCall<{
        deposit_params: {
          min_deposit: Array<{ denom: string; amount: string }>;
          max_deposit_period: string;
        };
      }>('/cosmos/gov/v1beta1/params/deposit');

      const tallyResult = await this.makeRestCall<{
        tally_params: { quorum: string; threshold: string; veto_threshold: string };
      }>('/cosmos/gov/v1beta1/params/tallying');

      const minDeposit = depositResult.deposit_params.min_deposit.find((d) => d.denom === 'uband');

      return {
        minDeposit: minDeposit ? parseInt(minDeposit.amount, 10) / 1e6 : 1000,
        maxDepositPeriod: 172800, // 2 days in seconds
        votingPeriod: 604800, // 7 days in seconds
        quorum: parseFloat(tallyResult.tally_params.quorum) * 100,
        threshold: parseFloat(tallyResult.tally_params.threshold) * 100,
        vetoThreshold: parseFloat(tallyResult.tally_params.veto_threshold) * 100,
      };
    } catch (error) {
      logger.error(
        'Failed to get governance params',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // ==================== ACCOUNT METHODS ====================

  // Get account info
  async getAccountInfo(address: string): Promise<AccountInfo> {
    try {
      const [account, balance] = await Promise.all([
        this.makeRestCall<AccountResult>(`/cosmos/auth/v1beta1/accounts/${address}`),
        this.makeRestCall<BalanceResult>(`/cosmos/bank/v1beta1/balances/${address}`),
      ]);

      return {
        address: account.account.address,
        accountNumber: parseInt(account.account.account_number, 10),
        sequence: parseInt(account.account.sequence, 10),
        balances: balance.balances.map((b) => ({
          denom: b.denom,
          amount: parseFloat(b.amount) / 1e6,
        })),
      };
    } catch (error) {
      logger.error(
        'Failed to get account info',
        error instanceof Error ? error : new Error(String(error)),
        { address }
      );
      throw error;
    }
  }

  // Get account balance
  async getAccountBalance(address: string): Promise<Array<{ denom: string; amount: number }>> {
    try {
      const result = await this.makeRestCall<BalanceResult>(
        `/cosmos/bank/v1beta1/balances/${address}`
      );

      return result.balances.map((b) => ({
        denom: b.denom,
        amount: parseFloat(b.amount) / 1e6,
      }));
    } catch (error) {
      logger.error(
        'Failed to get account balance',
        error instanceof Error ? error : new Error(String(error)),
        { address }
      );
      throw error;
    }
  }

  // ==================== IBC METHODS ====================

  // Get IBC channels
  async getIBCChannels(limit: number = 100): Promise<IBCChannelInfo[]> {
    try {
      const result = await this.makeRestCall<IBCChannelsResult>(
        `/ibc/core/channel/v1/channels?pagination.limit=${limit}`
      );

      return result.channels.map((ch) => ({
        channelId: ch.channel_id,
        portId: ch.port_id,
        state: ch.state,
        ordering: ch.ordering,
        counterpartyChannelId: ch.counterparty.channel_id,
        counterpartyPortId: ch.counterparty.port_id,
        connectionHops: ch.connection_hops,
        version: ch.version,
      }));
    } catch (error) {
      logger.error(
        'Failed to get IBC channels',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // Get IBC connections
  async getIBCConnections(limit: number = 100): Promise<IBCConnectionInfo[]> {
    try {
      const result = await this.makeRestCall<IBCConnectionsResult>(
        `/ibc/core/connection/v1/connections?pagination.limit=${limit}`
      );

      return result.connections.map((conn) => ({
        connectionId: conn.id,
        clientId: conn.client_id,
        state: conn.state,
        counterpartyConnectionId: conn.counterparty.connection_id,
        counterpartyClientId: conn.counterparty.client_id,
        versions: conn.versions,
      }));
    } catch (error) {
      logger.error(
        'Failed to get IBC connections',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // ==================== CHAIN EVENTS METHODS ====================

  // Get chain events (delegation, undelegation, etc.)
  async getChainEvents(eventType: EventType, limit: number = 100): Promise<ChainEvent[]> {
    try {
      // Search for transactions related to the event type
      const messageTypeMap: Record<EventType, string> = {
        [EventType.DELEGATION]: '/cosmos.staking.v1beta1.MsgDelegate',
        [EventType.UNDELEGATION]: '/cosmos.staking.v1beta1.MsgUndelegate',
        [EventType.COMMISSION_CHANGE]: '/cosmos.staking.v1beta1.MsgEditValidator',
        [EventType.JAILED]: '/cosmos.slashing.v1beta1.MsgUnjail',
        [EventType.UNJAILED]: '/cosmos.slashing.v1beta1.MsgUnjail',
      };

      const messageType = messageTypeMap[eventType];
      const query = `message.action='${messageType}'`;

      const { transactions } = await this.searchTransactions(query, 1, limit);

      return transactions.map((tx, index) => {
        const message = tx.messages[0] as Record<string, unknown> | undefined;
        const amountValue = message?.amount;
        const amount =
          Array.isArray(amountValue) && amountValue[0] && typeof amountValue[0] === 'object'
            ? parseFloat((amountValue[0] as Record<string, unknown>).amount as string) / 1e6
            : 0;

        return {
          id: `${tx.hash}-${index}`,
          type: eventType,
          validator: String(message?.validator_address || message?.validator_addr || 'Unknown'),
          validatorAddress: String(message?.validator_address || message?.validator_addr || ''),
          amount,
          timestamp: new Date(tx.timestamp).getTime(),
          description: this.getEventDescription(eventType, message),
          txHash: tx.hash,
        };
      });
    } catch (error) {
      logger.error(
        'Failed to get chain events',
        error instanceof Error ? error : new Error(String(error)),
        { eventType }
      );
      throw error;
    }
  }

  private getEventDescription(eventType: EventType, message: unknown): string {
    const msg = message as Record<string, unknown>;
    switch (eventType) {
      case EventType.DELEGATION:
        return `委托给验证人 ${msg?.validator_address || msg?.validator_addr || 'Unknown'}`;
      case EventType.UNDELEGATION:
        return `从验证人 ${msg?.validator_address || msg?.validator_addr || 'Unknown'} 解除委托`;
      case EventType.COMMISSION_CHANGE:
        return `验证人 ${msg?.validator_address || msg?.validator_addr || 'Unknown'} 变更佣金率`;
      case EventType.JAILED:
        return `验证人 ${msg?.validator_address || msg?.validator_addr || 'Unknown'} 被监禁`;
      case EventType.UNJAILED:
        return `验证人 ${msg?.validator_address || msg?.validator_addr || 'Unknown'} 被释放`;
      default:
        return '未知事件';
    }
  }

  // ==================== UTILITY METHODS ====================

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const bandRpcService = new BandRpcService();
export { BandRpcService };
