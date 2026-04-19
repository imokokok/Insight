import Image from 'next/image';

import { DIAClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getDefaultMarketData, getDefaultNetworkData } from './helpers';
import { type OracleConfig } from './types';

let _client: DIAClient | null = null;
function getClient() {
  if (!_client) _client = new DIAClient();
  return _client;
}

export const diaConfig: OracleConfig = {
  provider: OracleProvider.DIA,
  name: 'DIA',
  descriptionKey: 'oracles.descriptions.dia',
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
  getClient,
  iconBgColor: 'bg-indigo-600',
  themeColor: '#6366f1',
  icon: <Image src="/logos/oracles/dia.svg" alt="DIA" width={48} height={48} />,
  marketData: getDefaultMarketData('DIA', 'DIA'),
  networkData: getDefaultNetworkData(),
  features: {
    hasNodeAnalytics: false,
    hasValidatorAnalytics: false,
    hasPublisherAnalytics: false,
    hasDisputeResolution: false,
    hasPriceFeeds: false,
    hasQuantifiableSecurity: false,
    hasFirstPartyOracle: false,
    hasCoreFeatures: true,
  },
  tabs: [
    { id: 'market', label: 'Market Data' },
    { id: 'network', label: 'Network Health' },
    { id: 'data-feeds', label: 'Price Feeds' },
    { id: 'nft-data', label: 'NFT Data' },
    { id: 'staking', label: 'Staking' },
    { id: 'ecosystem', label: 'Ecosystem' },
    { id: 'risk', label: 'Risk Assessment' },
  ],
};
