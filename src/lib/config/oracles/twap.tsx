import Image from 'next/image';

import { TWAPClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getDefaultMarketData, getDefaultNetworkData } from './helpers';
import { type OracleConfig } from './types';

let _client: TWAPClient | null = null;
function getClient() {
  if (!_client) _client = new TWAPClient({ useRealData: true });
  return _client;
}

export const twapConfig: OracleConfig = {
  provider: OracleProvider.TWAP,
  name: 'TWAP Oracle',
  descriptionKey: 'twap.description',
  symbol: 'UNI',
  defaultChain: Blockchain.ETHEREUM,
  supportedChains: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
  ],
  getClient,
  iconBgColor: '#FF007A',
  themeColor: '#FF007A',
  icon: <Image src="/logos/oracles/twap.svg" alt="TWAP Oracle" width={48} height={48} />,
  marketData: getDefaultMarketData('UNI', 'TWAP Oracle'),
  networkData: getDefaultNetworkData(),
  features: {
    hasNodeAnalytics: false,
    hasValidatorAnalytics: false,
    hasPublisherAnalytics: false,
    hasDisputeResolution: false,
    hasPriceFeeds: true,
    hasQuantifiableSecurity: false,
    hasFirstPartyOracle: false,
    hasCoreFeatures: true,
    hasCrossChain: true,
  },
  tabs: [
    { id: 'overview', label: 'Overview' },
    { id: 'price-feeds', label: 'Price Feeds' },
    { id: 'network', label: 'Network' },
    { id: 'market', label: 'Market' },
    { id: 'on-chain', label: 'On-Chain' },
    { id: 'methodology', label: 'Methodology' },
  ],
};
