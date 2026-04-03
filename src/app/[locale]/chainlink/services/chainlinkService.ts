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
