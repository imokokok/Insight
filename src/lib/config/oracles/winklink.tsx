import { WINkLinkClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

export const winklinkConfig = createOracleConfig({
  provider: OracleProvider.WINKLINK,
  name: 'WINkLink',
  symbol: 'WIN',
  defaultChain: Blockchain.TRON,
  supportedChains: [Blockchain.BNB_CHAIN, Blockchain.TRON, Blockchain.ETHEREUM],
  clientClass: WINkLinkClient,
  color: '#FF4D4D',
  features: {
    hasPriceFeeds: true,
    hasCoreFeatures: true,
    hasRiskAssessment: true,
  },
  tabs: [
    COMMON_TABS.MARKET,
    COMMON_TABS.NETWORK,
    { id: 'tron', label: 'TRON Ecosystem' },
    COMMON_TABS.RISK,
  ],
});
