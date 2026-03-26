import {
  providerNames,
  chainNames,
  symbols,
  chainColors,
  oracleColors,
  TIME_RANGES,
  DEVIATION_THRESHOLD,
  oracleI18nKeys,
} from '@/lib/constants';
import { type OracleProvider, type Blockchain, type PriceData } from '@/lib/oracles';

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
  oracleI18nKeys,
};
