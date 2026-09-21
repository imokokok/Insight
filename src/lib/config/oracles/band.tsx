import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

export const bandConfig = createOracleConfig({
  provider: OracleProvider.BAND,
  name: 'Band',
  symbol: 'BAND',
  defaultChain: Blockchain.BANDCHAIN,
  supportedChains: [Blockchain.BANDCHAIN],
  color: '#4520E6',
  features: {
    hasNodeAnalytics: true,
    hasValidatorAnalytics: true,
    hasPriceFeeds: true,
    hasQuantifiableSecurity: true,
    hasCoreFeatures: true,
    hasCrossChain: true,
  },
  tabs: [
    COMMON_TABS.OVERVIEW,
    COMMON_TABS.PRICE_FEEDS,
    COMMON_TABS.NETWORK,
    COMMON_TABS.MARKET,
    COMMON_TABS.CROSS_CHAIN,
  ],
});
