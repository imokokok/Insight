import Image from 'next/image';

import { chartColors } from '@/lib/config/colors';
import { PythClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getDefaultMarketData, getDefaultNetworkData } from './helpers';
import { type OracleConfig } from './types';

let _client: PythClient | null = null;
function getClient() {
  if (!_client) _client = new PythClient();
  return _client;
}

export const pythConfig: OracleConfig = {
  provider: OracleProvider.PYTH,
  name: 'Pyth',
  descriptionKey: 'oracles.descriptions.pyth',
  symbol: 'PYTH',
  defaultChain: Blockchain.SOLANA,
  supportedChains: [
    Blockchain.SOLANA,
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.OPTIMISM,
    Blockchain.AVALANCHE,
    Blockchain.BASE,
    Blockchain.STARKNET,
    Blockchain.BLAST,
    Blockchain.SUI,
    Blockchain.APTOS,
    Blockchain.INJECTIVE,
    Blockchain.SEI,
  ],
  getClient,
  iconBgColor: `bg-[${chartColors.oracle.pyth}]`,
  themeColor: '#8b5cf6',
  icon: <Image src="/logos/oracles/pyth.svg" alt="Pyth" width={48} height={48} />,
  marketData: getDefaultMarketData('PYTH', 'Pyth'),
  networkData: getDefaultNetworkData(),
  features: {
    hasNodeAnalytics: false,
    hasValidatorAnalytics: true,
    hasPublisherAnalytics: true,
    hasDisputeResolution: false,
    hasPriceFeeds: true,
    hasQuantifiableSecurity: false,
    hasFirstPartyOracle: false,
    hasCoreFeatures: true,
  },
  tabs: [
    { id: 'market', label: 'Market Data' },
    { id: 'network', label: 'Network Health' },
    { id: 'publishers', label: 'Publishers' },
    { id: 'validators', label: 'Validators' },
    { id: 'price-feeds', label: 'Price Feeds' },
    { id: 'risk', label: 'Risk Assessment' },
  ],
  views: [
    {
      id: 'market',
      label: 'Market Data',
      component: 'PythMarketView',
      default: true,
    },
    { id: 'network', label: 'Network Health', component: 'PythNetworkView' },
    { id: 'publishers', label: 'Publishers', component: 'PythPublishersView' },
    { id: 'validators', label: 'Validators', component: 'PythValidatorsView' },
    { id: 'price-feeds', label: 'Price Feeds', component: 'PythPriceFeedsView' },
    { id: 'risk', label: 'Risk Assessment', component: 'PythRiskView' },
  ],
};
