import { CHAINLINK_SUPPORTED_CHAINS } from '@/lib/oracles/constants/chainlinkSupportedChains';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

export const chainlinkConfig = createOracleConfig({
  provider: OracleProvider.CHAINLINK,
  name: 'Chainlink',
  symbol: 'LINK',
  defaultChain: Blockchain.ETHEREUM,
  // Derived from the same catalog-based single source as the runtime client —
  // the previous hand-written list had drifted to 20 entries of which 11 had
  // no runtime data on this platform (Fantom, Gnosis, Metis, Scroll, Celo,
  // Moonbeam, Moonriver, Starknet, Blast, Kava, Linea).
  supportedChains: [...CHAINLINK_SUPPORTED_CHAINS],
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
