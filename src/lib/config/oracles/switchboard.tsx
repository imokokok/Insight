import { SwitchboardClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

export const switchboardConfig = createOracleConfig({
  provider: OracleProvider.SWITCHBOARD,
  name: 'Switchboard',
  symbol: 'SWTCH',
  defaultChain: Blockchain.ETHEREUM,
  supportedChains: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.SOLANA,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
    Blockchain.SCROLL,
    Blockchain.ZKSYNC,
    Blockchain.APTOS,
    Blockchain.SUI,
    Blockchain.MANTLE,
    Blockchain.LINEA,
    Blockchain.FLARE,
    Blockchain.SUPRA_CHAIN,
  ],
  clientClass: SwitchboardClient,
  color: '#2DD4BF',
  features: {
    hasPriceFeeds: true,
    hasQuantifiableSecurity: true,
    hasFirstPartyOracle: true,
    hasCoreFeatures: true,
    hasCrossChain: true,
    hasDataStreams: true,
    hasRiskAssessment: true,
  },
  tabs: [
    COMMON_TABS.OVERVIEW,
    COMMON_TABS.PRICE_FEEDS,
    COMMON_TABS.MARKET,
    COMMON_TABS.NETWORK,
    COMMON_TABS.DATA_STREAMS,
    COMMON_TABS.CROSS_CHAIN,
    COMMON_TABS.RISK,
  ],
});
