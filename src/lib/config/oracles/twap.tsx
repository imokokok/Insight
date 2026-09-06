import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

export const twapConfig = createOracleConfig({
  provider: OracleProvider.TWAP,
  name: 'TWAP',
  symbol: 'UNI',
  defaultChain: Blockchain.ETHEREUM,
  supportedChains: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
  ],
  color: '#FF007A',
  features: {
    hasPriceFeeds: true,
    hasCoreFeatures: true,
    hasCrossChain: true,
  },
  tabs: [
    COMMON_TABS.OVERVIEW,
    COMMON_TABS.PRICE_FEEDS,
    COMMON_TABS.NETWORK,
    COMMON_TABS.MARKET,
    COMMON_TABS.ON_CHAIN,
    COMMON_TABS.CROSS_CHAIN,
    { id: 'methodology', label: 'Methodology' },
  ],
});
