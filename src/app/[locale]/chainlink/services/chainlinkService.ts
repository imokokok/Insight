import type { DataFeed, NodeData, StakingPoolStats, RewardHistory, SlashingEvent, UnlockQueue, OperatorStake } from '../types';
import {
  mockDataFeeds,
  mockCCIPStats,
  mockTransactions,
  mockSupportedChains,
  mockRMNStatus,
  mockVRFStats,
  mockRequests,
  mockSubscriptions,
  useCaseDistribution,
  MOCK_POOL_STATS,
  MOCK_REWARD_HISTORY,
  MOCK_SLASHING_EVENTS,
  MOCK_UNLOCK_QUEUE,
  MOCK_OPERATOR_STAKES,
  mockNodes,
  regionStats,
  tvlTrendData,
  projectsByChainData,
  chainColors,
  services,
  serviceUsageData,
  type CCIPStats,
  type CrossChainTransaction,
  type SupportedChain,
  type RMNStatus,
  type VRFStats,
  type VRFRequest,
  type VRFSubscription,
  type UseCaseDistribution,
  type RegionStat,
  type TvlTrendDataPoint,
  type ProjectByChainData,
  type ServiceData,
  type ServiceUsageDataPoint,
} from '../data/mockData';

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
}

export class MockChainlinkService implements IChainlinkService {
  async getDataFeeds(): Promise<DataFeed[]> {
    return mockDataFeeds;
  }

  async getCCIPStats(): Promise<CCIPStats> {
    return mockCCIPStats;
  }

  async getCrossChainTransactions(): Promise<CrossChainTransaction[]> {
    return mockTransactions;
  }

  async getSupportedChains(): Promise<SupportedChain[]> {
    return mockSupportedChains;
  }

  async getRMNStatus(): Promise<RMNStatus> {
    return mockRMNStatus;
  }

  async getVRFStats(): Promise<VRFStats> {
    return mockVRFStats;
  }

  async getVRFRequests(): Promise<VRFRequest[]> {
    return mockRequests;
  }

  async getVRFSubscriptions(): Promise<VRFSubscription[]> {
    return mockSubscriptions;
  }

  async getUseCaseDistribution(): Promise<UseCaseDistribution[]> {
    return useCaseDistribution;
  }

  async getStakingPoolStats(): Promise<StakingPoolStats> {
    return MOCK_POOL_STATS;
  }

  async getRewardHistory(): Promise<RewardHistory[]> {
    return MOCK_REWARD_HISTORY;
  }

  async getSlashingEvents(): Promise<SlashingEvent[]> {
    return MOCK_SLASHING_EVENTS;
  }

  async getUnlockQueue(): Promise<UnlockQueue[]> {
    return MOCK_UNLOCK_QUEUE;
  }

  async getOperatorStakes(): Promise<OperatorStake[]> {
    return MOCK_OPERATOR_STAKES;
  }

  async getNodes(): Promise<NodeData[]> {
    return mockNodes;
  }

  async getRegionStats(): Promise<RegionStat[]> {
    return regionStats;
  }

  async getTvlTrendData(): Promise<TvlTrendDataPoint[]> {
    return tvlTrendData;
  }

  async getProjectsByChain(): Promise<ProjectByChainData[]> {
    return projectsByChainData;
  }

  getChainColors(): Record<string, string> {
    return chainColors;
  }

  async getServices(): Promise<ServiceData[]> {
    return services;
  }

  async getServiceUsageData(): Promise<ServiceUsageDataPoint[]> {
    return serviceUsageData;
  }
}

let serviceInstance: IChainlinkService | null = null;

export function getChainlinkService(): IChainlinkService {
  if (!serviceInstance) {
    serviceInstance = new MockChainlinkService();
  }
  return serviceInstance;
}

export function setChainlinkService(service: IChainlinkService): void {
  serviceInstance = service;
}
