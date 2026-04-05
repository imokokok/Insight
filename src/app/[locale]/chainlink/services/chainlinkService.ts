import type {
  CCIPStats,
  CrossChainTransaction,
  SupportedChain,
  RMNStatus,
  VRFStats,
  VRFRequest,
  VRFSubscription,
  UseCaseDistribution,
  RegionStat,
  TvlTrendDataPoint,
  ProjectByChainData,
  ServiceData,
  ServiceUsageDataPoint,
} from '../data';
import type {
  DataFeed,
  NodeData,
  StakingPoolStats,
  RewardHistory,
  SlashingEvent,
  UnlockQueue,
  OperatorStake,
} from '../types';

// Automation types
export interface AutomationStats {
  registeredTasks: number;
  dailyExecutions: number;
  gasSaved: number;
  uptime: number;
  activeSubscriptions: number;
  totalFunded: number;
}

export interface UpkeepTask {
  id: string;
  name: string;
  triggerType: 'time' | 'logic' | 'log';
  executionCount: number;
  status: 'active' | 'paused' | 'cancelled';
  lastExecution: Date;
  balance: number;
}

export interface ExecutionHistory {
  timestamp: Date;
  success: boolean;
  gasUsed: number;
  latency: number;
}

export interface LatencyDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface CancelQueueItem {
  id: string;
  name: string;
  requestedAt: Date;
  status: 'pending' | 'processing';
}

// DataStreams types
export interface DataStreamStats {
  activeStreams: number;
  updateFrequency: number;
  avgLatency: number;
  bandwidth: number;
  throughput: number;
  packetLoss: number;
  reconnectCount: number;
}

export interface DataStreamFeed {
  pair: string;
  latency: number;
  threshold: number;
  subscribers: number;
  status: 'active' | 'paused';
  price: number;
  change24h: number;
}

export interface PushEvent {
  id: string;
  feed: string;
  price: number;
  change: number;
  trigger: string;
  timestamp: Date;
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  trend: number[];
}

// Functions types
export interface FunctionsStats {
  totalCalls: number;
  successRate: number;
  avgExecutionTime: number;
  supportedApis: number;
  activeSubscriptions: number;
  totalFunded: number;
}

export interface FunctionExecution {
  id: string;
  sourceHash: string;
  result: string;
  gasUsed: number;
  status: 'success' | 'failed';
  timestamp: Date;
}

export interface SecretStatus {
  id: string;
  encrypted: boolean;
  expiresAt: Date;
}

export interface FunctionsUseCase {
  name: string;
  percentage: number;
  count: number;
}

export interface IChainlinkService {
  getDataFeeds(): Promise<DataFeed[]>;
  getCCIPStats(): Promise<CCIPStats>;
  getCrossChainTransactions(): Promise<CrossChainTransaction[]>;
  getSupportedChains(): Promise<SupportedChain[]>;
  getRMNStatus(): Promise<RMNStatus>;
  getVRFStats(): Promise<VRFStats>;
  getVRFRequests(): Promise<VRFRequest[]>;
  getVRFSubscriptions(): Promise<VRFSubscription[]>;
  getUseCaseDistribution(): Promise<UseCaseDistribution[]>;
  getStakingPoolStats(): Promise<StakingPoolStats>;
  getRewardHistory(): Promise<RewardHistory[]>;
  getSlashingEvents(): Promise<SlashingEvent[]>;
  getUnlockQueue(): Promise<UnlockQueue[]>;
  getOperatorStakes(): Promise<OperatorStake[]>;
  getNodes(): Promise<NodeData[]>;
  getRegionStats(): Promise<RegionStat[]>;
  getTvlTrendData(): Promise<TvlTrendDataPoint[]>;
  getProjectsByChain(): Promise<ProjectByChainData[]>;
  getChainColors(): Record<string, string>;
  getServices(): Promise<ServiceData[]>;
  getServiceUsageData(): Promise<ServiceUsageDataPoint[]>;
  // Automation
  getAutomationStats(): Promise<AutomationStats>;
  getUpkeepTasks(): Promise<UpkeepTask[]>;
  getExecutionHistory(): Promise<ExecutionHistory[]>;
  getLatencyDistribution(): Promise<LatencyDistribution[]>;
  getCancelQueue(): Promise<CancelQueueItem[]>;
  // DataStreams
  getDataStreamStats(): Promise<DataStreamStats>;
  getDataStreamFeeds(): Promise<DataStreamFeed[]>;
  getPushEvents(): Promise<PushEvent[]>;
  getLatencyMetrics(): Promise<LatencyMetrics>;
  // Functions
  getFunctionsStats(): Promise<FunctionsStats>;
  getFunctionExecutions(): Promise<FunctionExecution[]>;
  getFunctionSecrets(): Promise<SecretStatus[]>;
  getFunctionsUseCases(): Promise<FunctionsUseCase[]>;
}

// Service that throws errors for all data - real data source needs to be implemented
export class ChainlinkService implements IChainlinkService {
  private throwNotImplemented(methodName: string): never {
    throw new Error(
      `${methodName} is not implemented. Please configure a real Chainlink data source by calling setChainlinkService() with a custom implementation.`
    );
  }

  async getDataFeeds(): Promise<DataFeed[]> {
    this.throwNotImplemented('getDataFeeds');
  }

  async getCCIPStats(): Promise<CCIPStats> {
    this.throwNotImplemented('getCCIPStats');
  }

  async getCrossChainTransactions(): Promise<CrossChainTransaction[]> {
    this.throwNotImplemented('getCrossChainTransactions');
  }

  async getSupportedChains(): Promise<SupportedChain[]> {
    this.throwNotImplemented('getSupportedChains');
  }

  async getRMNStatus(): Promise<RMNStatus> {
    this.throwNotImplemented('getRMNStatus');
  }

  async getVRFStats(): Promise<VRFStats> {
    this.throwNotImplemented('getVRFStats');
  }

  async getVRFRequests(): Promise<VRFRequest[]> {
    this.throwNotImplemented('getVRFRequests');
  }

  async getVRFSubscriptions(): Promise<VRFSubscription[]> {
    this.throwNotImplemented('getVRFSubscriptions');
  }

  async getUseCaseDistribution(): Promise<UseCaseDistribution[]> {
    this.throwNotImplemented('getUseCaseDistribution');
  }

  async getStakingPoolStats(): Promise<StakingPoolStats> {
    this.throwNotImplemented('getStakingPoolStats');
  }

  async getRewardHistory(): Promise<RewardHistory[]> {
    this.throwNotImplemented('getRewardHistory');
  }

  async getSlashingEvents(): Promise<SlashingEvent[]> {
    this.throwNotImplemented('getSlashingEvents');
  }

  async getUnlockQueue(): Promise<UnlockQueue[]> {
    this.throwNotImplemented('getUnlockQueue');
  }

  async getOperatorStakes(): Promise<OperatorStake[]> {
    this.throwNotImplemented('getOperatorStakes');
  }

  async getNodes(): Promise<NodeData[]> {
    this.throwNotImplemented('getNodes');
  }

  async getRegionStats(): Promise<RegionStat[]> {
    this.throwNotImplemented('getRegionStats');
  }

  async getTvlTrendData(): Promise<TvlTrendDataPoint[]> {
    this.throwNotImplemented('getTvlTrendData');
  }

  async getProjectsByChain(): Promise<ProjectByChainData[]> {
    this.throwNotImplemented('getProjectsByChain');
  }

  getChainColors(): Record<string, string> {
    return {
      ethereum: '#627EEA',
      arbitrum: '#28A0F0',
      polygon: '#8247E5',
      optimism: '#FF0420',
      avalanche: '#E84142',
      base: '#0052FF',
    };
  }

  async getServices(): Promise<ServiceData[]> {
    this.throwNotImplemented('getServices');
  }

  async getServiceUsageData(): Promise<ServiceUsageDataPoint[]> {
    this.throwNotImplemented('getServiceUsageData');
  }

  // Automation methods
  async getAutomationStats(): Promise<AutomationStats> {
    this.throwNotImplemented('getAutomationStats');
  }

  async getUpkeepTasks(): Promise<UpkeepTask[]> {
    this.throwNotImplemented('getUpkeepTasks');
  }

  async getExecutionHistory(): Promise<ExecutionHistory[]> {
    this.throwNotImplemented('getExecutionHistory');
  }

  async getLatencyDistribution(): Promise<LatencyDistribution[]> {
    this.throwNotImplemented('getLatencyDistribution');
  }

  async getCancelQueue(): Promise<CancelQueueItem[]> {
    this.throwNotImplemented('getCancelQueue');
  }

  // DataStreams methods
  async getDataStreamStats(): Promise<DataStreamStats> {
    this.throwNotImplemented('getDataStreamStats');
  }

  async getDataStreamFeeds(): Promise<DataStreamFeed[]> {
    this.throwNotImplemented('getDataStreamFeeds');
  }

  async getPushEvents(): Promise<PushEvent[]> {
    this.throwNotImplemented('getPushEvents');
  }

  async getLatencyMetrics(): Promise<LatencyMetrics> {
    this.throwNotImplemented('getLatencyMetrics');
  }

  // Functions methods
  async getFunctionsStats(): Promise<FunctionsStats> {
    this.throwNotImplemented('getFunctionsStats');
  }

  async getFunctionExecutions(): Promise<FunctionExecution[]> {
    this.throwNotImplemented('getFunctionExecutions');
  }

  async getFunctionSecrets(): Promise<SecretStatus[]> {
    this.throwNotImplemented('getFunctionSecrets');
  }

  async getFunctionsUseCases(): Promise<FunctionsUseCase[]> {
    this.throwNotImplemented('getFunctionsUseCases');
  }
}

let serviceInstance: IChainlinkService | null = null;

export function getChainlinkService(): IChainlinkService {
  if (!serviceInstance) {
    serviceInstance = new ChainlinkService();
  }
  return serviceInstance;
}

export function setChainlinkService(service: IChainlinkService): void {
  serviceInstance = service;
}
