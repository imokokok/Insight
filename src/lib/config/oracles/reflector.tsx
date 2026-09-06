import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

export const reflectorConfig = createOracleConfig({
  provider: OracleProvider.REFLECTOR,
  name: 'Reflector',
  symbol: 'XLM',
  defaultChain: Blockchain.STELLAR,
  supportedChains: [Blockchain.STELLAR],
  color: '#F59E0B',
  features: {
    hasNodeAnalytics: true,
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
