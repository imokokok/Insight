import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

/** Pyth Core reads reviewed sponsored accounts on Monad and Solana. */
export const pythConfig = createOracleConfig({
  provider: OracleProvider.PYTH,
  name: 'Pyth',
  symbol: 'PYTH',
  defaultChain: Blockchain.MONAD,
  supportedChains: [Blockchain.MONAD, Blockchain.SOLANA],
  color: '#8B5CF6',
  features: {
    hasPublisherAnalytics: true,
    hasPriceFeeds: true,
    hasCoreFeatures: true,
    hasRiskAssessment: true,
  },
  tabs: [COMMON_TABS.MARKET, COMMON_TABS.NETWORK, COMMON_TABS.PRICE_FEEDS, COMMON_TABS.RISK],
});
