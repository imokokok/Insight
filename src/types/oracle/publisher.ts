export type PublisherStatus = 'active' | 'inactive' | 'degraded';

export interface Publisher {
  id: string;
  name: string;
  reliabilityScore: number;
  latency: number;
  status: PublisherStatus;
  submissionCount: number;
  lastUpdate: number;
  accuracy?: number;
  priceDeviation?: number;
  submissionFrequency?: number;
}

export interface PublisherStats {
  publisherId: string;
  historicalAccuracy: number[];
  priceDeviations: number[];
  submissionFrequency: number;
  averageDeviation: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface GenericValidator {
  id: string;
  name: string;
  reliabilityScore: number;
  latency: number;
  status: PublisherStatus;
  staked: number;
  region?: string;
  uptime?: number;
  commission?: number;
  totalResponses?: number;
}
