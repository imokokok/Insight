import { FlareClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

export const flareConfig = createOracleConfig({
  provider: OracleProvider.FLARE,
  name: 'Flare',
  symbol: 'FLR',
  defaultChain: Blockchain.FLARE,
  supportedChains: [Blockchain.FLARE],
  clientClass: FlareClient,
  clientOptions: { useRealData: true },
  color: '#8B0FE5',
  features: {
    hasNodeAnalytics: true,
    hasValidatorAnalytics: true,
    hasPriceFeeds: true,
    hasQuantifiableSecurity: true,
    hasFirstPartyOracle: true,
    hasCoreFeatures: true,
    hasCrossChain: false,
  },
  tabs: [
    COMMON_TABS.OVERVIEW,
    COMMON_TABS.PRICE_FEEDS,
    COMMON_TABS.NETWORK,
    COMMON_TABS.MARKET,
    COMMON_TABS.ON_CHAIN,
  ],
});
