export interface MockDataAnnotation {
  isMock: boolean;
  source: 'mock' | 'api' | 'chain' | 'cache';
  reason?: string;
  lastRealUpdate?: Date;
  confidence?: number;
}

export interface AnnotatedData<T> {
  data: T;
  annotation: MockDataAnnotation;
}

export interface API3Alert {
  id: string;
  type: 'price_deviation' | 'node_offline' | 'coverage_pool_risk' | 'security_event';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  isResolved: boolean;
  metadata?: {
    symbol?: string;
    nodeId?: string;
    threshold?: number;
    currentValue?: number;
    chain?: string;
  };
}

export interface AlertThreshold {
  type: string;
  enabled: boolean;
  threshold: number;
  lastTriggered?: Date;
}

export interface DAPIPriceDeviation {
  symbol: string;
  dapiPrice: number;
  marketPrice: number;
  deviation: number;
  trend: 'expanding' | 'shrinking' | 'stable';
  status: 'normal' | 'warning' | 'critical';
}

export interface DataSourceInfo {
  id: string;
  name: string;
  type: 'exchange' | 'traditional_finance' | 'other';
  credibilityScore: number;
  accuracy: number;
  responseSpeed: number;
  availability: number;
  airnodeAddress: string;
  dapiContract: string;
  chain: string;
}

export interface CoveragePoolEvent {
  id: string;
  type: 'claim' | 'parameter_change' | 'reward_distribution';
  timestamp: Date;
  amount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  txHash: string;
  description: string;
}

export interface CoveragePoolDetails {
  totalValueLocked: number;
  collateralizationRatio: number;
  targetCollateralization: number;
  stakerCount: number;
  avgStakeAmount: number;
  pendingClaims: number;
  processedClaims: number;
  totalPayouts: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  lastUpdateTime: Date;
}

export interface CoveragePoolClaim {
  id: string;
  type: 'pending' | 'approved' | 'rejected' | 'processing';
  amount: number;
  requester: string;
  reason: string;
  submittedAt: Date;
  processedAt?: Date;
  transactionHash?: string;
  votingDeadline?: Date;
  votesFor: number;
  votesAgainst: number;
}

export interface StakerReward {
  stakerAddress: string;
  stakedAmount: number;
  pendingRewards: number;
  claimedRewards: number;
  apr: number;
  stakeDate: Date;
  lockEndDate?: Date;
}

export interface AirnodeNetworkStats {
  activeAirnodes: number;
  nodeUptime: number;
  avgResponseTime: number;
  dapiUpdateFrequency: number;
  totalStaked: number;
  dataFeeds: number;
  hourlyActivity: number[];
  status: 'online' | 'warning' | 'offline';
  lastUpdated: Date;
  latency: number;
}

export interface DAPICoverage {
  totalDapis: number;
  byAssetType: {
    crypto: number;
    forex: number;
    commodities: number;
    stocks: number;
  };
  byChain: {
    ethereum: number;
    arbitrum: number;
    polygon: number;
  };
  updateFrequency: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface StakingData {
  totalStaked: number;
  stakingApr: number;
  stakerCount: number;
  coveragePool: {
    totalValue: number;
    coverageRatio: number;
    historicalPayouts: number;
  };
}

export interface OEVAuction {
  id: string;
  dappName: string;
  dapiName: string;
  auctionAmount: number;
  winner: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'cancelled';
  transactionHash?: string;
}

export interface OEVParticipant {
  id: string;
  name: string;
  type: 'searcher' | 'dapp';
  totalVolume: number;
  auctionsWon: number;
  lastActive: Date;
}

export interface OEVNetworkStats {
  totalOevCaptured: number;
  activeAuctions: number;
  totalParticipants: number;
  totalDapps: number;
  avgAuctionValue: number;
  last24hVolume: number;
  participantList: OEVParticipant[];
  recentAuctions: OEVAuction[];
}

export interface FirstPartyOracleData {
  airnodeDeployments: {
    total: number;
    byRegion: {
      northAmerica: number;
      europe: number;
      asia: number;
      others: number;
    };
    byChain: {
      ethereum: number;
      arbitrum: number;
      polygon: number;
    };
    byProviderType: {
      exchanges: number;
      traditionalFinance: number;
      others: number;
    };
  };
  dapiCoverage: DAPICoverage;
  advantages: {
    noMiddlemen: boolean;
    sourceTransparency: boolean;
    responseTime: number;
  };
}
