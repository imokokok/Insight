import type { FailureMode, ConsensusContext, OracleSignalVector } from '@/types/oracle/signals';

export interface PriceHistoryEntry {
  price: number;
  timestamp: number;
  responseTime: number;
  success: boolean;
  source?: string;
  failureMode?: FailureMode;
  signalVector?: OracleSignalVector;
  consensusContext?: ConsensusContext;
}

export type PriceHistory = PriceHistoryEntry;
