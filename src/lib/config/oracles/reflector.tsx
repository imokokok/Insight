import Image from 'next/image';

import { ReflectorClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getDefaultMarketData, getDefaultNetworkData } from './helpers';
import { type OracleConfig } from './types';

export const reflectorConfig: OracleConfig = {
  provider: OracleProvider.REFLECTOR,
  name: 'Reflector',
  descriptionKey: 'reflector.description',
  symbol: 'XLM',
  defaultChain: Blockchain.STELLAR,
  supportedChains: [Blockchain.STELLAR],
  client: new ReflectorClient({ useRealData: true }),
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
    { id: 'network', label: 'Network' },
    { id: 'market', label: 'Market' },
    { id: 'on-chain', label: 'On-Chain' },
  ],
};
