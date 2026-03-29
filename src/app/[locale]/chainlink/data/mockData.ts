import type { DataFeed, NodeData, StakingPoolStats, RewardHistory, SlashingEvent, UnlockQueue, OperatorStake } from '../types';

export const mockDataFeeds: DataFeed[] = [
  {
    id: '1',
    name: 'ETH/USD',
    category: 'crypto',
    updateFrequency: '60s',
    deviationThreshold: '0.5%',
    status: 'active',
    totalRequests: 12500000,
    reliability: 99.99,
  },
  {
    id: '2',
    name: 'BTC/USD',
    category: 'crypto',
    updateFrequency: '60s',
    deviationThreshold: '0.5%',
    status: 'active',
    totalRequests: 15200000,
    reliability: 99.99,
  },
  {
    id: '3',
    name: 'LINK/USD',
    category: 'crypto',
    updateFrequency: '60s',
    deviationThreshold: '1%',
    status: 'active',
    totalRequests: 8900000,
    reliability: 99.98,
  },
  {
    id: '4',
    name: 'EUR/USD',
    category: 'forex',
    updateFrequency: '300s',
    deviationThreshold: '0.1%',
    status: 'active',
    totalRequests: 5600000,
    reliability: 99.97,
  },
  {
    id: '5',
    name: 'GBP/USD',
    category: 'forex',
    updateFrequency: '300s',
    deviationThreshold: '0.1%',
    status: 'active',
    totalRequests: 3200000,
    reliability: 99.96,
  },
  {
    id: '6',
    name: 'XAU/USD',
    category: 'commodities',
    updateFrequency: '600s',
    deviationThreshold: '0.2%',
    status: 'active',
    totalRequests: 2100000,
    reliability: 99.95,
  },
  {
    id: '7',
    name: 'Aave V2',
    category: 'defi',
    updateFrequency: '120s',
    deviationThreshold: '0.5%',
    status: 'active',
    totalRequests: 7800000,
    reliability: 99.98,
  },
  {
    id: '8',
    name: 'Uniswap V3',
    category: 'defi',
    updateFrequency: '120s',
    deviationThreshold: '0.5%',
    status: 'active',
    totalRequests: 9200000,
    reliability: 99.98,
  },
];

export interface CCIPStats {
  messages24h: number;
  valueTransferred24h: number;
  avgConfirmTime: number;
  activeChains: number;
  successRate: number;
}

export const mockCCIPStats: CCIPStats = {
  messages24h: 128456,
  valueTransferred24h: 89450000,
  avgConfirmTime: 12.5,
  activeChains: 12,
  successRate: 99.87,
};

export interface CrossChainTransaction {
  id: string;
  sourceChain: string;
  destChain: string;
  type: 'message' | 'token';
  status: 'pending' | 'success' | 'failed';
  value?: number;
  timestamp: Date;
}

export const mockTransactions: CrossChainTransaction[] = [
  {
    id: '0x1a2b3c...',
    sourceChain: 'Ethereum',
    destChain: 'Arbitrum',
    type: 'token',
    status: 'success',
    value: 25000,
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
  },
  {
    id: '0x4d5e6f...',
    sourceChain: 'Polygon',
    destChain: 'Ethereum',
    type: 'message',
    status: 'pending',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '0x7g8h9i...',
    sourceChain: 'Avalanche',
    destChain: 'Optimism',
    type: 'token',
    status: 'success',
    value: 15000,
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
  },
  {
    id: '0xj1k2l3...',
    sourceChain: 'BSC',
    destChain: 'Ethereum',
    type: 'token',
    status: 'failed',
    value: 5000,
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
  },
  {
    id: '0xm4n5o6...',
    sourceChain: 'Ethereum',
    destChain: 'Base',
    type: 'message',
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
];

export interface SupportedChain {
  name: string;
  logo: string;
  status: 'active' | 'coming_soon';
  messageSupported: boolean;
  tokenTransferSupported: boolean;
}

export const mockSupportedChains: SupportedChain[] = [
  {
    name: 'Ethereum',
    logo: '/chains/ethereum.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'Arbitrum',
    logo: '/chains/arbitrum.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'Optimism',
    logo: '/chains/optimism.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'Polygon',
    logo: '/chains/polygon.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'Avalanche',
    logo: '/chains/avalanche.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'BSC',
    logo: '/chains/bsc.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'Base',
    logo: '/chains/base.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'BNB Chain',
    logo: '/chains/bnb.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'WEMIX',
    logo: '/chains/wemix.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: false,
  },
  {
    name: 'Metis',
    logo: '/chains/metis.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'ZKsync',
    logo: '/chains/zksync.svg',
    status: 'coming_soon',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'Scroll',
    logo: '/chains/scroll.svg',
    status: 'coming_soon',
    messageSupported: true,
    tokenTransferSupported: false,
  },
];

export interface RMNStatus {
  nodesOnline: number;
  securityScore: number;
  lastCheck: Date;
  anomalies: number;
}

export const mockRMNStatus: RMNStatus = {
  nodesOnline: 24,
  securityScore: 98.5,
  lastCheck: new Date(Date.now() - 1000 * 30),
  anomalies: 0,
};

export interface VRFStats {
  requests24h: number;
  successRate: number;
  avgResponseTime: number;
  gasUsed: number;
  activeSubscriptions: number;
  totalFunded: number;
}

export const mockVRFStats: VRFStats = {
  requests24h: 45678,
  successRate: 99.92,
  avgResponseTime: 2.3,
  gasUsed: 125000000,
  activeSubscriptions: 2847,
  totalFunded: 4580000,
};

export interface VRFRequest {
  id: string;
  consumer: string;
  randomWords: string[];
  status: 'pending' | 'fulfilled' | 'failed';
  timestamp: Date;
  gasUsed?: number;
}

export const mockRequests: VRFRequest[] = [
  {
    id: '0x1a2b3c4d...',
    consumer: '0x1234...5678',
    randomWords: ['0x8f7a...', '0x3c2d...'],
    status: 'fulfilled',
    timestamp: new Date(Date.now() - 1000 * 60 * 1),
    gasUsed: 185000,
  },
  {
    id: '0x5e6f7g8h...',
    consumer: '0xabcd...efgh',
    randomWords: ['0x1a2b...'],
    status: 'pending',
    timestamp: new Date(Date.now() - 1000 * 30),
  },
  {
    id: '0x9i0j1k2l...',
    consumer: '0x9876...5432',
    randomWords: ['0x5e6f...', '0x7g8h...', '0x9i0j...'],
    status: 'fulfilled',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    gasUsed: 210000,
  },
  {
    id: '0x3m4n5o6p...',
    consumer: '0xdef0...1234',
    randomWords: [],
    status: 'failed',
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
  },
  {
    id: '0x7q8r9s0t...',
    consumer: '0x5555...6666',
    randomWords: ['0xc1d2...'],
    status: 'fulfilled',
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
    gasUsed: 175000,
  },
];

export interface VRFSubscription {
  id: number;
  balance: number;
  consumers: number;
  owner: string;
}

export const mockSubscriptions: VRFSubscription[] = [
  { id: 1234, balance: 125.5, consumers: 8, owner: '0xabcd...efgh' },
  { id: 5678, balance: 89.2, consumers: 5, owner: '0x1234...5678' },
  { id: 9012, balance: 256.8, consumers: 12, owner: '0x9876...5432' },
  { id: 3456, balance: 45.3, consumers: 3, owner: '0xdef0...1234' },
];

export interface UseCaseDistribution {
  name: string;
  percentage: number;
  count: number;
  color: string;
}

export const useCaseDistribution: UseCaseDistribution[] = [
  {
    name: 'NFT Minting',
    percentage: 42,
    count: 19185,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    name: 'Gaming',
    percentage: 28,
    count: 12790,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    name: 'Lottery',
    percentage: 18,
    count: 8222,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    name: 'Others',
    percentage: 12,
    count: 5481,
    color: 'text-gray-600 bg-gray-50',
  },
];

export const LINK_PRICE = 14.5;

export const MOCK_POOL_STATS: StakingPoolStats = {
  totalStaked: 42500000,
  stakingRate: 78.5,
  currentAPR: 7.2,
  communityPoolStatus: 'active',
  communityPoolSize: 8500000,
};

export const MOCK_REWARD_HISTORY: RewardHistory[] = [
  { date: '2024-01', amount: 125000, type: 'base' },
  { date: '2024-02', amount: 132000, type: 'base' },
  { date: '2024-03', amount: 128000, type: 'service' },
  { date: '2024-04', amount: 145000, type: 'base' },
  { date: '2024-05', amount: 138000, type: 'service' },
  { date: '2024-06', amount: 152000, type: 'base' },
  { date: '2024-07', amount: 148000, type: 'slashing' },
  { date: '2024-08', amount: 165000, type: 'base' },
  { date: '2024-09', amount: 172000, type: 'service' },
  { date: '2024-10', amount: 158000, type: 'base' },
  { date: '2024-11', amount: 180000, type: 'base' },
  { date: '2024-12', amount: 195000, type: 'service' },
];

export const MOCK_SLASHING_EVENTS: SlashingEvent[] = [
  {
    id: 'slash-001',
    node: 'ChainLink Node #42',
    reason: 'Downtime - Failed to respond within timeout window',
    amount: 2500,
    timestamp: new Date('2024-12-15T10:30:00'),
  },
  {
    id: 'slash-002',
    node: 'Oracle Operator #18',
    reason: 'Incorrect data - Price deviation exceeded threshold',
    amount: 1800,
    timestamp: new Date('2024-12-10T14:20:00'),
  },
  {
    id: 'slash-003',
    node: 'Node Runner #7',
    reason: 'Downtime - Extended maintenance without notice',
    amount: 3200,
    timestamp: new Date('2024-12-05T08:15:00'),
  },
  {
    id: 'slash-004',
    node: 'Staking Pool #3',
    reason: 'Incorrect data - Late price update submission',
    amount: 950,
    timestamp: new Date('2024-11-28T16:45:00'),
  },
];

export const MOCK_UNLOCK_QUEUE: UnlockQueue[] = [
  {
    address: '0x1234...5678',
    amount: 15000,
    unlockTime: new Date('2024-12-20T00:00:00'),
    status: 'ready',
  },
  {
    address: '0xabcd...efgh',
    amount: 8500,
    unlockTime: new Date('2024-12-22T00:00:00'),
    status: 'queued',
  },
  {
    address: '0x9876...5432',
    amount: 25000,
    unlockTime: new Date('2024-12-18T00:00:00'),
    status: 'withdrawn',
  },
  {
    address: '0xdef0...1234',
    amount: 12000,
    unlockTime: new Date('2024-12-25T00:00:00'),
    status: 'queued',
  },
];

export const MOCK_OPERATOR_STAKES: OperatorStake[] = [
  { rank: 1, name: 'ChainLink Labs', stakedAmount: 5200000, reputation: 98, rewards: 125000 },
  { rank: 2, name: 'Staking Facilities', stakedAmount: 3800000, reputation: 96, rewards: 92000 },
  { rank: 3, name: 'Figment Networks', stakedAmount: 3200000, reputation: 95, rewards: 78000 },
  { rank: 4, name: 'Chorus One', stakedAmount: 2900000, reputation: 94, rewards: 71000 },
  { rank: 5, name: 'Everstake', stakedAmount: 2500000, reputation: 93, rewards: 61000 },
  { rank: 6, name: 'P2P Validator', stakedAmount: 2200000, reputation: 92, rewards: 54000 },
  { rank: 7, name: 'B-Harvest', stakedAmount: 1900000, reputation: 91, rewards: 46000 },
  { rank: 8, name: 'Certus One', stakedAmount: 1600000, reputation: 90, rewards: 39000 },
];

export const mockNodes: NodeData[] = [
  {
    id: '1',
    name: 'LinkPool',
    region: 'North America',
    responseTime: 120,
    successRate: 99.9,
    reputation: 98.5,
    stakedAmount: 2500000,
  },
  {
    id: '2',
    name: 'Certus One',
    region: 'Europe',
    responseTime: 135,
    successRate: 99.8,
    reputation: 97.2,
    stakedAmount: 1800000,
  },
  {
    id: '3',
    name: 'Fiews',
    region: 'North America',
    responseTime: 110,
    successRate: 99.9,
    reputation: 96.8,
    stakedAmount: 2200000,
  },
  {
    id: '4',
    name: 'Everstake',
    region: 'Europe',
    responseTime: 145,
    successRate: 99.7,
    reputation: 95.5,
    stakedAmount: 1500000,
  },
  {
    id: '5',
    name: 'Figment',
    region: 'North America',
    responseTime: 125,
    successRate: 99.8,
    reputation: 94.9,
    stakedAmount: 1900000,
  },
  {
    id: '6',
    name: 'Staked',
    region: 'Asia',
    responseTime: 155,
    successRate: 99.6,
    reputation: 93.8,
    stakedAmount: 1200000,
  },
  {
    id: '7',
    name: 'Blockdaemon',
    region: 'Europe',
    responseTime: 140,
    successRate: 99.7,
    reputation: 93.2,
    stakedAmount: 1600000,
  },
  {
    id: '8',
    name: 'Chorus One',
    region: 'Europe',
    responseTime: 130,
    successRate: 99.8,
    reputation: 92.5,
    stakedAmount: 1400000,
  },
];

export interface RegionStat {
  region: string;
  count: number;
  percentage: number;
}

export const regionStats: RegionStat[] = [
  { region: 'North America', count: 4, percentage: 50 },
  { region: 'Europe', count: 3, percentage: 37.5 },
  { region: 'Asia', count: 1, percentage: 12.5 },
];

export interface TvlTrendDataPoint {
  month: string;
  ethereum: number;
  arbitrum: number;
  polygon: number;
  optimism: number;
  avalanche: number;
  base: number;
  total: number;
}

export const tvlTrendData: TvlTrendDataPoint[] = [
  {
    month: '2024-01',
    ethereum: 8.5,
    arbitrum: 2.1,
    polygon: 1.8,
    optimism: 1.2,
    avalanche: 0.9,
    base: 0.3,
    total: 14.8,
  },
  {
    month: '2024-02',
    ethereum: 9.2,
    arbitrum: 2.4,
    polygon: 1.9,
    optimism: 1.4,
    avalanche: 1.0,
    base: 0.5,
    total: 16.4,
  },
  {
    month: '2024-03',
    ethereum: 10.1,
    arbitrum: 2.8,
    polygon: 2.1,
    optimism: 1.6,
    avalanche: 1.1,
    base: 0.7,
    total: 18.4,
  },
  {
    month: '2024-04',
    ethereum: 9.8,
    arbitrum: 3.1,
    polygon: 2.0,
    optimism: 1.7,
    avalanche: 1.0,
    base: 0.9,
    total: 18.5,
  },
  {
    month: '2024-05',
    ethereum: 11.2,
    arbitrum: 3.5,
    polygon: 2.3,
    optimism: 1.9,
    avalanche: 1.2,
    base: 1.1,
    total: 21.2,
  },
  {
    month: '2024-06',
    ethereum: 12.5,
    arbitrum: 3.9,
    polygon: 2.5,
    optimism: 2.1,
    avalanche: 1.3,
    base: 1.4,
    total: 23.7,
  },
  {
    month: '2024-07',
    ethereum: 11.8,
    arbitrum: 4.2,
    polygon: 2.4,
    optimism: 2.3,
    avalanche: 1.2,
    base: 1.6,
    total: 23.5,
  },
  {
    month: '2024-08',
    ethereum: 13.2,
    arbitrum: 4.6,
    polygon: 2.7,
    optimism: 2.5,
    avalanche: 1.4,
    base: 1.9,
    total: 26.3,
  },
  {
    month: '2024-09',
    ethereum: 14.1,
    arbitrum: 5.1,
    polygon: 2.9,
    optimism: 2.7,
    avalanche: 1.5,
    base: 2.2,
    total: 28.5,
  },
  {
    month: '2024-10',
    ethereum: 13.8,
    arbitrum: 5.4,
    polygon: 3.1,
    optimism: 2.9,
    avalanche: 1.6,
    base: 2.5,
    total: 29.3,
  },
  {
    month: '2024-11',
    ethereum: 15.2,
    arbitrum: 5.8,
    polygon: 3.3,
    optimism: 3.1,
    avalanche: 1.7,
    base: 2.8,
    total: 31.9,
  },
  {
    month: '2024-12',
    ethereum: 16.5,
    arbitrum: 6.2,
    polygon: 3.5,
    optimism: 3.3,
    avalanche: 1.8,
    base: 3.1,
    total: 34.4,
  },
];

export interface ProjectByChainData {
  chain: string;
  projects: number;
  color: string;
}

export const projectsByChainData: ProjectByChainData[] = [
  { chain: 'Ethereum', projects: 850, color: '#627eea' },
  { chain: 'Arbitrum', projects: 320, color: '#28a0f0' },
  { chain: 'Polygon', projects: 280, color: '#8247e5' },
  { chain: 'Optimism', projects: 195, color: '#ff0420' },
  { chain: 'Base', projects: 165, color: '#0052ff' },
  { chain: 'Avalanche', projects: 145, color: '#e84142' },
];

export const chainColors: Record<string, string> = {
  ethereum: '#627eea',
  arbitrum: '#28a0f0',
  polygon: '#8247e5',
  optimism: '#ff0420',
  avalanche: '#e84142',
  base: '#0052ff',
};

export interface ServiceData {
  id: string;
  name: string;
  color: string;
  requests: string;
  uptime: number;
}

export const services: ServiceData[] = [
  {
    id: 'data-feeds',
    name: 'Data Feeds',
    color: '#3b82f6',
    requests: '12.4M',
    uptime: 99.97,
  },
  { id: 'vrf', name: 'VRF', color: '#8b5cf6', requests: '4.5M', uptime: 99.95 },
  {
    id: 'automation',
    name: 'Automation',
    color: '#10b981',
    requests: '3.9M',
    uptime: 99.92,
  },
  { id: 'ccip', name: 'CCIP', color: '#f59e0b', requests: '1.8M', uptime: 99.89 },
  {
    id: 'functions',
    name: 'Functions',
    color: '#ef4444',
    requests: '980K',
    uptime: 99.85,
  },
];

export interface ServiceUsageDataPoint {
  name: string;
  value: number;
  color: string;
}

export const serviceUsageData: ServiceUsageDataPoint[] = [
  { name: 'Data Feeds', value: 12400000, color: '#3b82f6' },
  { name: 'VRF', value: 4500000, color: '#8b5cf6' },
  { name: 'Automation', value: 3890000, color: '#10b981' },
  { name: 'CCIP', value: 1850000, color: '#f59e0b' },
  { name: 'Functions', value: 980000, color: '#ef4444' },
];

export const REWARD_COLORS = {
  base: '#375bd2',
  service: '#10b981',
  slashing: '#f59e0b',
};

export const PIE_COLORS = ['#375bd2', '#10b981', '#f59e0b', '#ef4444'];

export const SCENARIOS = {
  conservative: { label: 'Conservative', apy: 4.5, color: '#60a5fa' },
  moderate: { label: 'Moderate', apy: 7.2, color: '#3b82f6' },
  optimistic: { label: 'Optimistic', apy: 10.8, color: '#1d4ed8' },
};
