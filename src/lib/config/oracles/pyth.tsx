import { PythClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

export const pythConfig = createOracleConfig({
  provider: OracleProvider.PYTH,
  name: 'Pyth',
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
  clientClass: PythClient,
  color: '#7C3AED',
  features: {
    hasValidatorAnalytics: true,
    hasPublisherAnalytics: true,
    hasPriceFeeds: true,
    hasCoreFeatures: true,
    hasRiskAssessment: true,
  },
  tabs: [
    COMMON_TABS.MARKET,
    COMMON_TABS.NETWORK,
    { id: 'publishers', label: 'Publishers' },
    { id: 'validators', label: 'Validators' },
    COMMON_TABS.PRICE_FEEDS,
    COMMON_TABS.RISK,
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
});
