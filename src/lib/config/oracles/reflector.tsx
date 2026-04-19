import Image from 'next/image';

import { ReflectorClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getDefaultMarketData, getDefaultNetworkData } from './helpers';
import { type OracleConfig } from './types';

let _client: ReflectorClient | null = null;
function getClient() {
  if (!_client) _client = new ReflectorClient({ useRealData: true });
  return _client;
}

export const reflectorConfig: OracleConfig = {
  provider: OracleProvider.REFLECTOR,
  name: 'Reflector',
  descriptionKey: 'oracles.descriptions.reflector',
  symbol: 'XLM',
  defaultChain: Blockchain.STELLAR,
  supportedChains: [Blockchain.STELLAR],
  getClient,
  iconBgColor: '#F59E0B',
  themeColor: '#F59E0B',
  icon: <Image src="/logos/oracles/reflector.svg" alt="Reflector" width={48} height={48} />,
  marketData: getDefaultMarketData('XLM', 'Reflector'),
  networkData: getDefaultNetworkData(),
  features: {
    hasNodeAnalytics: true,
    hasValidatorAnalytics: false,
    hasPublisherAnalytics: false,
    hasDisputeResolution: false,
    hasPriceFeeds: true,
    hasQuantifiableSecurity: true,
    hasFirstPartyOracle: true,
    hasCoreFeatures: true,
    hasCrossChain: false,
  },
  tabs: [
    { id: 'overview', label: 'Overview' },
    { id: 'price-feeds', label: 'Price Feeds' },
    { id: 'network', label: 'Network Health' },
    { id: 'market', label: 'Market Data' },
    { id: 'on-chain', label: 'On-Chain' },
  ],
};
