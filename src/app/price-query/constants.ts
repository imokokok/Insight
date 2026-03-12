import { OracleProvider, Blockchain, PriceData } from '@/lib/oracles';
import {
  providerNames,
  chainNames,
  symbols,
  chainColors,
  oracleColors,
  TIME_RANGES,
  DEVIATION_THRESHOLD,
} from '@/lib/constants';

export type { PriceData };

export interface QueryResult {
  provider: OracleProvider;
  chain: Blockchain;
  priceData: PriceData;
}

export {
  providerNames,
  chainNames,
  symbols,
  chainColors,
  oracleColors,
  TIME_RANGES,
  DEVIATION_THRESHOLD,
};
