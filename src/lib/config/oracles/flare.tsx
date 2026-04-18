import Image from 'next/image';

import { FlareClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getDefaultMarketData, getDefaultNetworkData } from './helpers';
import { type OracleConfig } from './types';

let _client: FlareClient | null = null;
function getClient() {
  if (!_client) _client = new FlareClient({ useRealData: true });
  return _client;
}

export const flareConfig: OracleConfig = {
  provider: OracleProvider.FLARE,
  name: 'Flare',
  descriptionKey: 'flare.description',
  symbol: 'FLR',
  defaultChain: Blockchain.FLARE,
  supportedChains: [Blockchain.FLARE],
  getClient,
  iconBgColor: '#E84142',
  themeColor: '#E84142',
  icon: <Image src="/logos/oracles/flare.svg" alt="Flare" width={48} height={48} />,
  marketData: getDefaultMarketData('FLR', 'Flare'),
  networkData: getDefaultNetworkData(),
  features: {
    hasNodeAnalytics: true,
    hasValidatorAnalytics: true,
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
