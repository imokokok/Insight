export interface BandProtocolMarketData {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number;
  stakingRatio: number;
  stakingApr: number;
  timestamp: number;
}

export interface ValidatorInfo {
  operatorAddress: string;
  moniker: string;
  identity: string;
  website: string;
  details: string;
  tokens: number;
  delegatorShares: number;
  commissionRate: number;
  maxCommissionRate: number;
  maxCommissionChangeRate: number;
  uptime: number;
  jailed: boolean;
  rank: number;
}

export interface BandNetworkStats {
  activeValidators: number;
  totalValidators: number;
  bondedTokens: number;
  totalSupply: number;
  stakingRatio: number;
  blockTime: number;
  latestBlockHeight: number;
  inflationRate: number;
  communityPool: number;
  timestamp: number;
  successRate?: number;
  availability?: number;
  avgLatency?: number;
}

export interface ChainDataRequest {
  chainName: string;
  chainId: string;
  requestCount24h: number;
  requestCount7d: number;
  requestCount30d: number;
  avgGasCost: number;
  supportedSymbols: string[];
}

export interface IBCRelayer {
  address: string;
  moniker: string;
  transferCount: number;
  successRate: number;
}

export interface IBCConnection {
  chainName: string;
  chainId: string;
  channelId: string;
  connectionId: string;
  status: 'active' | 'inactive';
  transfers24h: number;
  transfers7d: number;
  totalTransfers: number;
  successRate: number;
  relayers: IBCRelayer[];
  lastActivity: number;
}

export interface IBCTransferStats {
  totalTransfers24h: number;
  totalTransfers7d: number;
  totalTransfers30d: number;
  successRate: number;
  activeChannels: number;
  activeRelayers: number;
}

export interface IBCTransferTrend {
  timestamp: number;
  transfers: number;
  successRate: number;
}

export interface StakingInfo {
  totalStaked: number;
  stakingRatio: number;
  stakingAPR: number;
  unbondingPeriod: number;
  minStake: number;
  slashingRate: number;
  communityPool: number;
  inflation: number;
}

export interface StakingDistribution {
  range: string;
  count: number;
  percentage: number;
  totalStake: number;
}

export interface StakingReward {
  principal: number;
  duration: number;
  estimatedReward: number;
  apy: number;
}

export type ProposalStatus = 'deposit' | 'voting' | 'passed' | 'rejected' | 'failed';
export type VoteOption = 'yes' | 'no' | 'abstain' | 'no_with_veto';

export interface BandGovernanceProposal {
  id: number;
  title: string;
  description: string;
  type: string;
  status: ProposalStatus;
  submitTime: number;
  depositEndTime: number;
  votingEndTime: number;
  proposer: string;
  totalDeposit: number;
  votes: {
    yes: number;
    no: number;
    abstain: number;
    noWithVeto: number;
  };
}

export type GovernanceProposal = BandGovernanceProposal;

export interface GovernanceParams {
  minDeposit: number;
  maxDepositPeriod: number;
  votingPeriod: number;
  quorum: number;
  threshold: number;
  vetoThreshold: number;
}

export interface CrossChainStats {
  totalRequests24h: number;
  totalRequests7d: number;
  totalRequests30d: number;
  chains: ChainDataRequest[];
  timestamp: number;
}

export type TrendPeriod = '7d' | '30d' | '90d';

export interface CrossChainTrend {
  date: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  avgLatency: number;
}

export interface CrossChainComparison {
  period: TrendPeriod;
  currentTotal: number;
  previousTotal: number;
  changeAmount: number;
  changePercent: number;
  avgLatencyChange: number;
  successRateChange: number;
}

export interface RiskMetrics {
  decentralizationScore: number;
  securityScore: number;
  reliabilityScore: number;
  transparencyScore: number;
  overallScore: number;
  giniCoefficient: number;
  nakamotoCoefficient: number;
  top10ValidatorsShare: number;
}

export interface RiskTrendData {
  date: string;
  score: number;
  decentralization: number;
  security: number;
  reliability: number;
}

export interface RiskEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'error' | 'info';
  source: string;
}

export interface BandCrossChainSnapshot {
  timestamp: number;
  prices: Map<string, number>;
  deviations: Map<string, number>;
  avgLatency: number;
  maxDeviation: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface CrossChainPriceComparison {
  chain: string;
  chainId: string;
  currentPrice: number;
  historicalPrice: number;
  priceChange: number;
  priceChangePercent: number;
  currentDeviation: number;
  historicalDeviation: number;
  deviationChange: number;
  currentLatency: number;
  historicalLatency: number;
  latencyChange: number;
  trend: 'up' | 'down' | 'stable';
}

export interface HistoricalPricePoint {
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  ma7?: number;
  ma20?: number;
  stdDev1Upper?: number;
  stdDev1Lower?: number;
  stdDev2Upper?: number;
  stdDev2Lower?: number;
}

export interface TechnicalIndicators {
  ma7: number[];
  ma20: number[];
  stdDev1Upper: number[];
  stdDev1Lower: number[];
  stdDev2Upper: number[];
  stdDev2Lower: number[];
}

export interface ValidatorHistory {
  timestamp: number;
  uptime: number;
  stakedAmount: number;
  commissionRate: number;
}

export type HistoryPeriod = 7 | 30 | 90;

export const enum EventType {
  DELEGATION = 'DELEGATION',
  UNDELEGATION = 'UNDELEGATION',
  COMMISSION_CHANGE = 'COMMISSION_CHANGE',
  JAILED = 'JAILED',
  UNJAILED = 'UNJAILED',
}

export const EVENT_TYPE_VALUES: readonly EventType[] = [
  EventType.DELEGATION,
  EventType.UNDELEGATION,
  EventType.COMMISSION_CHANGE,
  EventType.JAILED,
  EventType.UNJAILED,
] as const;

export interface ChainEvent {
  id: string;
  type: EventType;
  validator: string;
  validatorAddress: string;
  amount: number;
  timestamp: number;
  description: string;
  txHash: string;
}

export type OracleScriptCategory = 'price' | 'sports' | 'random' | 'custom';

export interface OracleScript {
  id: number;
  name: string;
  description: string;
  owner: string;
  schema: string;
  code: string;
  callCount: number;
  successRate: number;
  avgResponseTime: number;
  category: OracleScriptCategory;
  lastUpdated: number;
}

export type DataSourceCategory =
  | 'crypto'
  | 'forex'
  | 'commodities'
  | 'sports'
  | 'random'
  | 'equities'
  | 'stablecoin';

export interface DataSource {
  id: number;
  name: string;
  symbol: string;
  description: string;
  owner: string;
  provider: string;
  status: 'active' | 'inactive';
  lastUpdated: number;
  reliability: number;
  category: DataSourceCategory;
  updateFrequency: string;
  deviationThreshold: string;
  totalRequests: number;
  price?: number;
  change24h?: number;
}

export interface PriceFeed {
  symbol: string;
  price: number;
  change24h: number;
  change24hPercent: number;
  lastUpdated: number;
  dataSource: string;
  confidence: number;
  category: DataSourceCategory;
}

export interface DataSourceListResponse {
  dataSources: DataSource[];
  total: number;
  hasMore: boolean;
}

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
