import { Bird } from 'lucide-react';

import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

/** Stork is scoped to its reviewed Monad pushed-feed set. */
export const storkConfig = createOracleConfig({
  provider: OracleProvider.STORK,
  name: 'Stork',
  symbol: 'STORK',
  defaultChain: Blockchain.MONAD,
  supportedChains: [Blockchain.MONAD],
  color: '#00A7B5',
  icon: <Bird aria-label="Stork" size={40} strokeWidth={1.75} />,
  features: {
    hasPublisherAnalytics: true,
    hasPriceFeeds: true,
    hasCoreFeatures: true,
    hasRiskAssessment: true,
  },
  tabs: [COMMON_TABS.MARKET, COMMON_TABS.NETWORK, COMMON_TABS.PRICE_FEEDS, COMMON_TABS.RISK],
});
