import { ChainlinkClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

export const chainlinkConfig = createOracleConfig({
  provider: OracleProvider.CHAINLINK,
  name: 'Chainlink',
  symbol: 'LINK',
  defaultChain: Blockchain.ETHEREUM,
  // Must stay in sync with CHAINLINK_RPC_CONFIG (rpcConfig.ts) and
  // ChainlinkClient.supportedChains. Solana/Starknet dropped (non-EVM, the
  // EVM Feed Registry path cannot serve them); Scroll/zkSync Era/Linea added.
  supportedChains: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
    Blockchain.SCROLL,
    Blockchain.ZKSYNC,
    Blockchain.LINEA,
  ],
  clientClass: ChainlinkClient,
  clientOptions: { useRealData: true },
  color: '#2563EB',
  features: {
    hasNodeAnalytics: true,
    hasRiskAssessment: true,
  },
  tabs: [
    COMMON_TABS.MARKET,
    COMMON_TABS.NETWORK,
    { id: 'nodes', label: 'Nodes' },
    { id: 'data-feeds', label: 'Data Feeds' },
    { id: 'services', label: 'Services' },
    COMMON_TABS.ECOSYSTEM,
    COMMON_TABS.RISK,
  ],
  views: [
    {
      id: 'market',
      label: 'Market Data',
      component: 'ChainlinkMarketView',
      default: true,
    },
    {
      id: 'network',
      label: 'Network Health',
      component: 'ChainlinkNetworkView',
    },
    { id: 'nodes', label: 'Nodes', component: 'ChainlinkNodesView' },
    {
      id: 'data-feeds',
      label: 'Data Feeds',
      component: 'ChainlinkDataFeedsView',
    },
    { id: 'services', label: 'Services', component: 'ChainlinkServicesView' },
    {
      id: 'ecosystem',
      label: 'Ecosystem',
      component: 'ChainlinkEcosystemView',
    },
    { id: 'risk', label: 'Risk Assessment', component: 'ChainlinkRiskView' },
  ],
});
