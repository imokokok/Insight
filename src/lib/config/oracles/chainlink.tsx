import Image from 'next/image';

import { ChainlinkClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getDefaultMarketData, getDefaultNetworkData } from './helpers';
import { type OracleConfig } from './types';

let _client: ChainlinkClient | null = null;
function getClient() {
  if (!_client) _client = new ChainlinkClient({ useRealData: true });
  return _client;
}

export const chainlinkConfig: OracleConfig = {
  provider: OracleProvider.CHAINLINK,
  name: 'Chainlink',
  descriptionKey: 'oracles.descriptions.chainlink',
  symbol: 'LINK',
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
    Blockchain.GNOSIS,
    Blockchain.METIS,
    Blockchain.SCROLL,
    Blockchain.CELO,
    Blockchain.MOONBEAM,
    Blockchain.MOONRIVER,
    Blockchain.STARKNET,
    Blockchain.BLAST,
    Blockchain.KAVA,
    Blockchain.LINEA,
    Blockchain.SOLANA,
  ],
  getClient,
  iconBgColor: 'bg-primary-600',
  themeColor: '#375bd2',
  icon: <Image src="/logos/oracles/chainlink.svg" alt="Chainlink" width={48} height={48} />,
  marketData: getDefaultMarketData('LINK', 'Chainlink'),
  networkData: getDefaultNetworkData(),
  features: {
    hasNodeAnalytics: true,
    hasValidatorAnalytics: false,
    hasPublisherAnalytics: false,
    hasDisputeResolution: false,
    hasPriceFeeds: false,
    hasQuantifiableSecurity: false,
    hasFirstPartyOracle: false,
    hasCoreFeatures: false,
  },
  tabs: [
    { id: 'market', label: 'Market Data' },
    { id: 'network', label: 'Network Health' },
    { id: 'nodes', label: 'Nodes' },
    { id: 'data-feeds', label: 'Data Feeds' },
    { id: 'services', label: 'Services' },
    { id: 'ecosystem', label: 'Ecosystem' },
    { id: 'risk', label: 'Risk Assessment' },
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
};
