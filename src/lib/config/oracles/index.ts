import { OracleProvider } from '@/types/oracle';

import { api3Config } from './api3';
import { chainlinkConfig } from './chainlink';
import { diaConfig } from './dia';
import { flareConfig } from './flare';
import { pythConfig } from './pyth';
import { redstoneConfig } from './redstone';
import { reflectorConfig } from './reflector';
import { supraConfig } from './supra';
import { twapConfig } from './twap';
import { winklinkConfig } from './winklink';

import type { OracleConfig, OracleViewConfig } from './types';

export const oracleConfigs: Record<OracleProvider, OracleConfig> = {
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
};

export function getOracleConfig(provider: OracleProvider): OracleConfig {
  const config = oracleConfigs[provider];
  if (!config) {
    throw new Error(`Oracle configuration not found for provider: ${provider}`);
  }
  return config;
}

function getAllOracleConfigs(): OracleConfig[] {
  return Object.values(oracleConfigs);
}

function getAllOracleConfigsSortedByMarketCap(): OracleConfig[] {
  return Object.values(oracleConfigs).sort((a, b) => {
    if (a.provider === OracleProvider.API3 && b.provider === OracleProvider.REDSTONE) {
      return -1;
    }
    if (a.provider === OracleProvider.REDSTONE && b.provider === OracleProvider.API3) {
      return 1;
    }
    return b.marketData.marketCap - a.marketData.marketCap;
  });
}

function getOracleProvidersSortedByMarketCap(): OracleProvider[] {
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

export function getPriceOracleProvidersSortedByMarketCap(): OracleProvider[] {
  return getOracleProvidersSortedByMarketCap();
}

function getOracleViews(provider: OracleProvider): OracleViewConfig[] {
  const config = getOracleConfig(provider);
  return (
    config.views ||
    config.tabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      component: `${provider.charAt(0).toUpperCase() + provider.slice(1).replace(/-/g, '')}View`,
    }))
  );
}
