import { RedStoneClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

export const redstoneConfig = createOracleConfig({
  provider: OracleProvider.REDSTONE,
  name: 'RedStone',
  symbol: 'RED',
  defaultChain: Blockchain.ETHEREUM,
  supportedChains: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
    Blockchain.FANTOM,
    Blockchain.LINEA,
    Blockchain.MANTLE,
    Blockchain.SCROLL,
    Blockchain.ZKSYNC,
    Blockchain.BLAST,
    Blockchain.STARKNET,
    Blockchain.APTOS,
    Blockchain.SUI,
  ],
  clientClass: RedStoneClient,
  color: '#FF6B6B',
  features: {
    hasPublisherAnalytics: true,
    hasPriceFeeds: true,
    hasCoreFeatures: true,
    hasDataStreams: true,
    hasCrossChain: true,
    hasRiskAssessment: true,
  },
  tabs: [
    COMMON_TABS.MARKET,
    COMMON_TABS.NETWORK,
    { id: 'providers', label: 'Providers' },
    COMMON_TABS.DATA_STREAMS,
    COMMON_TABS.CROSS_CHAIN,
    COMMON_TABS.ECOSYSTEM,
    COMMON_TABS.RISK,
  ],
});
