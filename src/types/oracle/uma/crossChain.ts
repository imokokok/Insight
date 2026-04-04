export type SupportedChain = 'ethereum' | 'arbitrum' | 'optimism' | 'polygon' | 'base';

export interface ChainConfig {
  id: SupportedChain;
  name: string;
  color: string;
  icon: string;
  blockTime: number;
  confirmations: number;
}

export const CHAIN_CONFIGS: Record<SupportedChain, ChainConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    color: '#627eea',
    icon: '⟠',
    blockTime: 12,
    confirmations: 12,
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    color: '#28a0f0',
    icon: '◈',
    blockTime: 0.25,
    confirmations: 64,
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    color: '#ff0420',
    icon: '⊙',
    blockTime: 2,
    confirmations: 32,
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    color: '#8247e5',
    icon: '⬡',
    blockTime: 2,
    confirmations: 128,
  },
  base: {
    id: 'base',
    name: 'Base',
    color: '#0052ff',
    icon: '◎',
    blockTime: 2,
    confirmations: 32,
  },
};

export type MessageStatus = 'pending' | 'validating' | 'confirmed' | 'failed';

export interface CrossChainMessage {
  id: string;
  sourceChain: SupportedChain;
  targetChain: SupportedChain;
  status: MessageStatus;
  timestamp: number;
  payload: string;
  txHash: string;
  confirmations: number;
  requiredConfirmations: number;
  estimatedTime: number;
  actualTime?: number;
}

export interface ValidatorStatus {
  chainId: SupportedChain;
  chainName: string;
  activeValidators: number;
  totalValidators: number;
  avgResponseTime: number;
  uptime: number;
  lastBlock: number;
  syncStatus: 'synced' | 'syncing' | 'error';
}

export interface BridgeHealthStatus {
  sourceChain: SupportedChain;
  targetChain: SupportedChain;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  successRate: number;
  lastChecked: number;
  pendingMessages: number;
}

export interface PendingMessageQueue {
  chain: SupportedChain;
  pending: number;
  processing: number;
  avgWaitTime: number;
  oldestMessage: number;
}

export interface CrossChainTransactionStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  avgLatency: number;
  volume24h: number;
  volumeChange: number;
  byChain: {
    chain: SupportedChain;
    sent: number;
    received: number;
    volume: number;
  }[];
  byTime: {
    hour: number;
    count: number;
    avgLatency: number;
  }[];
}

export interface SecurityScore {
  overall: number;
  components: {
    name: string;
    score: number;
    weight: number;
    status: 'good' | 'warning' | 'critical';
  }[];
  lastUpdated: number;
}

export interface RiskPoint {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedChains: SupportedChain[];
  timestamp: number;
  resolved: boolean;
  resolution?: string;
}

export interface SecurityEvent {
  id: string;
  type: 'alert' | 'incident' | 'maintenance' | 'upgrade';
  title: string;
  description: string;
  chains: SupportedChain[];
  timestamp: number;
  resolved: boolean;
  impact: 'low' | 'medium' | 'high';
}

export interface SecurityRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: string;
  category: 'monitoring' | 'configuration' | 'upgrade' | 'process';
}

export interface CrossChainVerificationData {
  messages: CrossChainMessage[];
  validators: ValidatorStatus[];
  bridgeHealth: BridgeHealthStatus[];
  pendingQueue: PendingMessageQueue[];
  transactionStats: CrossChainTransactionStats;
  securityScore: SecurityScore;
  riskPoints: RiskPoint[];
  securityEvents: SecurityEvent[];
  recommendations: SecurityRecommendation[];
}
