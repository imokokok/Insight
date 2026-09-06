import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

export const diaConfig = createOracleConfig({
  provider: OracleProvider.DIA,
  name: 'DIA',
  symbol: 'DIA',
  defaultChain: Blockchain.ETHEREUM,
  supportedChains: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
    Blockchain.FANTOM,
    Blockchain.CRONOS,
    Blockchain.MOONBEAM,
    Blockchain.GNOSIS,
    Blockchain.KAVA,
  ],
  color: '#6366F1',
  features: {
    hasCoreFeatures: true,
    hasRiskAssessment: true,
  },
  tabs: [
    COMMON_TABS.MARKET,
    COMMON_TABS.NETWORK,
    { id: 'data-feeds', label: 'Price Feeds' },
    COMMON_TABS.RISK,
  ],
});
