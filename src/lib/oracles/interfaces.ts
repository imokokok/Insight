import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';
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

interface IOracleClient {
  readonly name: OracleProvider;
  readonly supportedChains: Blockchain[];
  getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData>;
  getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData[]>;
}

export interface IOracleClientFactory {
  getClient(provider: OracleProvider): IOracleClient;
  getAllClients(): Record<OracleProvider, IOracleClient>;
  hasClient?(provider: OracleProvider): boolean;
  clearInstances?(): void;
}
