import { Blockchain, OracleProvider } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

export const chronicleConfig = createOracleConfig({
  provider: OracleProvider.CHRONICLE,
  name: 'Chronicle',
  symbol: 'CHR',
  defaultChain: Blockchain.MONAD,
  supportedChains: [Blockchain.MONAD],
  color: '#1D4ED8',
  features: {
    hasPublisherAnalytics: true,
    hasPriceFeeds: true,
    hasCoreFeatures: true,
    hasDataStreams: false,
    hasCrossChain: false,
    hasRiskAssessment: true,
  },
  tabs: [
    COMMON_TABS.MARKET,
    COMMON_TABS.NETWORK,
    { id: 'providers', label: 'Validators' },
    COMMON_TABS.RISK,
  ],
});
