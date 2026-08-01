import { OracleProvider } from '@/types/oracle';

import { api3Config } from './api3';
import { chainlinkConfig } from './chainlink';
import { diaConfig } from './dia';
import { flareConfig } from './flare';
import { pythConfig } from './pyth';
import { redstoneConfig } from './redstone';
import { reflectorConfig } from './reflector';
import { supraConfig } from './supra';
import { switchboardConfig } from './switchboard';
import { twapConfig } from './twap';
import { winklinkConfig } from './winklink';

import type { OracleConfig } from './types';

const oracleConfigs: Record<OracleProvider, OracleConfig> = {
  [OracleProvider.CHAINLINK]: chainlinkConfig,
  [OracleProvider.PYTH]: pythConfig,
  [OracleProvider.API3]: api3Config,
  [OracleProvider.REDSTONE]: redstoneConfig,
  [OracleProvider.DIA]: diaConfig,
  [OracleProvider.WINKLINK]: winklinkConfig,
  [OracleProvider.SUPRA]: supraConfig,
  [OracleProvider.TWAP]: twapConfig,
  [OracleProvider.REFLECTOR]: reflectorConfig,
  [OracleProvider.FLARE]: flareConfig,
  [OracleProvider.SWITCHBOARD]: switchboardConfig,
};

export function getOracleConfig(provider: OracleProvider): OracleConfig {
  const config = oracleConfigs[provider];
  if (!config) {
    throw new Error(`Oracle configuration not found for provider: ${provider}`);
  }
  return config;
}

export function getPriceOracleProvidersSortedByMarketCap(): OracleProvider[] {
  return Object.values(oracleConfigs)
    .sort((a, b) => {
      if (a.provider === OracleProvider.API3 && b.provider === OracleProvider.REDSTONE) {
        return -1;
      }
      if (a.provider === OracleProvider.REDSTONE && b.provider === OracleProvider.API3) {
        return 1;
      }
      return b.marketData.marketCap - a.marketData.marketCap;
    })
    .map((config) => config.provider);
}
