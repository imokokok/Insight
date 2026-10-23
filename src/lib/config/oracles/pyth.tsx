import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

/** Pyth Core integration is intentionally Monad-only until another sponsored chain is verified. */
export const pythConfig = createOracleConfig({
  provider: OracleProvider.PYTH,
  name: 'Pyth',
  symbol: 'PYTH',
  defaultChain: Blockchain.MONAD,
  supportedChains: [Blockchain.MONAD],
  color: '#8B5CF6',
  features: {
    hasPublisherAnalytics: true,
    hasPriceFeeds: true,
    hasCoreFeatures: true,
    hasRiskAssessment: true,
  },
  tabs: [COMMON_TABS.MARKET, COMMON_TABS.NETWORK, COMMON_TABS.PRICE_FEEDS, COMMON_TABS.RISK],
});
