import Image from 'next/image';

import { RedStoneClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getDefaultMarketData, getDefaultNetworkData } from './helpers';
import { type OracleConfig } from './types';

let _client: RedStoneClient | null = null;
function getClient() {
  if (!_client) _client = new RedStoneClient();
  return _client;
}

export const redstoneConfig: OracleConfig = {
  provider: OracleProvider.REDSTONE,
  name: 'RedStone',
  descriptionKey: 'oracles.descriptions.redstone',
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
  getClient,
  iconBgColor: '#FF6B6B',
  themeColor: '#FF6B6B',
  icon: <Image src="/logos/oracles/redstone.svg" alt="RedStone" width={48} height={48} />,
  marketData: getDefaultMarketData('RED', 'RedStone'),
  networkData: getDefaultNetworkData(),
  features: {
    hasNodeAnalytics: false,
    hasValidatorAnalytics: false,
    hasPublisherAnalytics: true,
    hasDisputeResolution: false,
    hasPriceFeeds: true,
    hasQuantifiableSecurity: false,
    hasFirstPartyOracle: false,
    hasCoreFeatures: true,
    hasDataStreams: true,
    hasCrossChain: true,
    hasRiskAssessment: true,
  },
  tabs: [
    { id: 'market', label: 'Market Data' },
    { id: 'network', label: 'Network Health' },
    { id: 'providers', label: 'Providers' },
    { id: 'data-streams', label: 'Data Streams' },
    { id: 'cross-chain', label: 'Cross-Chain' },
    { id: 'ecosystem', label: 'Ecosystem' },
    { id: 'risk', label: 'Risk Assessment' },
  ],
};
