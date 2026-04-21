import { symbols, chainColors, oracleColors } from '@/lib/constants';
import type { OracleProvider, Blockchain, PriceData } from '@/types/oracle';
import type { AnyOnChainData, OnChainData } from '@/types/oracle/onChainData';

export type { PriceData };
export type { AnyOnChainData, OnChainData };

export interface QueryResult {
  provider: OracleProvider;
  chain: Blockchain;
  priceData: PriceData;
}

export { symbols, chainColors, oracleColors };
