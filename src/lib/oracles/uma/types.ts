/**
 * @fileoverview UMA Subgraph类型定义
 * @description 定义UMA子图服务相关的所有类型
 */

export interface UMASubgraphConfig {
  apiKey: string;
  baseUrl: string;
  subgraphId?: string;
}

export interface SubgraphAssertion {
  id: string;
  assertionId: string;
  claim: string;
  asserter: string;
  disputed: boolean;
  settlementResolution: boolean | null;
  settlementPayout: string;
  expirationTime: string;
  assertionTime: string;
  currency: string;
  bond: string;
  identifier: string;
  domainId: string;
  callbackRecipient: string;
  escalationManager: string;
  caller: string;
  maxSettlementDelay: string;
  minAssertionFee: string;
  settlementTime: string | null;
  disputeRequest: {
    id: string;
    disputer: string;
    disputeTime: string;
    disputeBond: string;
  } | null;
}

export interface SubgraphDispute {
  id: string;
  request: {
    id: string;
    proposer: string;
    proposalTime: string;
    proposedPrice: string;
    isDisputed: boolean;
    settlementPrice: string | null;
    finalPrice: string | null;
    identifier: string;
    time: string;
    ancillaryData: string;
    currency: string;
    reward: string;
    finalFee: string;
    bond: string;
    customLiveness: string;
    requestTime: string;
    state: string;
  };
  disputer: string;
  disputeTime: string;
  disputeBond: string;
  resolutionTime: string | null;
  resolutionPrice: string | null;
  resolved: boolean;
}

export interface SubgraphPriceRequest {
  id: string;
  identifier: string;
  time: string;
  ancillaryData: string;
  currency: string;
  reward: string;
  finalFee: string;
  bond: string;
  customLiveness: string;
  requestTime: string;
  proposer: string;
  proposalTime: string;
  proposedPrice: string;
  isDisputed: boolean;
  settlementPrice: string | null;
  finalPrice: string | null;
  state: string;
  proposerDisputeBond: string;
}

export interface SubgraphVoter {
  id: string;
  address: string;
  delegatedVotes: string;
  totalVotes: string;
  totalRewards: string;
  voteCount: number;
  delegatedVotesRaw: string;
}

export interface SubgraphTokenHolder {
  id: string;
  address: string;
  tokenBalanceRaw: string;
  tokenBalance: string;
  totalTokensHeld: string;
  totalTokensReleased: string;
}

export interface SubgraphNetworkStats {
  totalAssertions: string;
  totalDisputes: string;
  totalPriceRequests: string;
  totalVoters: string;
  totalBond: string;
  totalRewards: string;
  activeAssertions: string;
  pendingDisputes: string;
}

export interface SubgraphDailyMetric {
  id: string;
  date: string;
  assertions: string;
  disputes: string;
  priceRequests: string;
  totalBond: string;
  totalRewards: string;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface UMAActivity {
  id: string;
  type: 'assertion' | 'dispute' | 'price_request';
  timestamp: number;
  identifier: string;
  status: string;
  bond?: string;
  resolution?: string | null;
  participants: string[];
}

export interface UMADisputeTrend {
  date: string;
  totalDisputes: number;
  resolvedDisputes: number;
  pendingDisputes: number;
  resolutionRate: number;
}

export interface UMAVoterPerformance {
  address: string;
  totalVotes: number;
  correctVotes: number;
  accuracy: number;
  totalRewards: string;
  lastVoteTime: number;
}

export interface UMAPriceRequestDaily {
  date: string;
  totalRequests: number;
  uniqueIdentifiers: number;
  avgResponseTime: number;
  disputedCount: number;
}

export type DisputeType = 'pending' | 'resolved' | 'failed';
export type DisputeCategory = 'price' | 'state' | 'liquidation' | 'other';

export interface DisputeData {
  id: string;
  type: DisputeCategory;
  identifier: string;
  timestamp: number;
  disputer: string;
  bond: string;
  status: 'active' | 'resolved' | 'rejected';
  resolution?: string | null;
  resolvedAt?: number;
}

export interface ValidatorData {
  id: string;
  address: string;
  totalVotes: number;
  correctVotes: number;
  accuracy: number;
  totalRewards: string;
  lastVoteTime: number;
  isActive: boolean;
}

export interface UMANetworkStats {
  totalAssertions: number;
  totalDisputes: number;
  totalPriceRequests: number;
  totalVoters: number;
  totalBond: string;
  totalRewards: string;
  activeAssertions: number;
  pendingDisputes: number;
  lastUpdated: number;
}

export interface UMADisputeUpdate {
  id: string;
  timestamp: number;
  status: string;
  identifier: string;
  disputer: string;
  bond: string;
}
