import Image from 'next/image';

import { SupraClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getDefaultMarketData, getDefaultNetworkData } from './helpers';
import { type OracleConfig } from './types';

let _client: SupraClient | null = null;
function getClient() {
  if (!_client) _client = new SupraClient();
  return _client;
}

export const supraConfig: OracleConfig = {
  provider: OracleProvider.SUPRA,
  name: 'Supra',
  descriptionKey: 'oracles.descriptions.supra',
  symbol: 'SUPRA',
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
    Blockchain.SCROLL,
    Blockchain.ZKSYNC,
    Blockchain.MANTLE,
    Blockchain.LINEA,
    Blockchain.SOLANA,
    Blockchain.APTOS,
    Blockchain.SUI,
    Blockchain.INJECTIVE,
    Blockchain.SEI,
    Blockchain.CELO,
    Blockchain.GNOSIS,
    Blockchain.CRONOS,
    Blockchain.MOONBEAM,
    Blockchain.KAVA,
    Blockchain.METIS,
    Blockchain.BLAST,
    Blockchain.STARKNET,
  ],
  getClient,
  iconBgColor: 'bg-teal-600',
  themeColor: '#14B8A6',
  icon: <Image src="/logos/oracles/supra.svg" alt="Supra" width={48} height={48} />,
  marketData: getDefaultMarketData('SUPRA', 'Supra'),
  networkData: getDefaultNetworkData(),
  features: {
    hasNodeAnalytics: false,
    hasValidatorAnalytics: true,
    hasPublisherAnalytics: false,
    hasDisputeResolution: false,
    hasPriceFeeds: true,
    hasQuantifiableSecurity: true,
    hasFirstPartyOracle: false,
    hasCoreFeatures: true,
    hasDataStreams: true,
    hasCrossChain: true,
  },
  tabs: [
    { id: 'market', label: 'Market Data' },
    { id: 'network', label: 'Network Health' },
    { id: 'price-feeds', label: 'Price Feeds' },
    { id: 'cross-chain', label: 'Cross-Chain' },
    { id: 'ecosystem', label: 'Ecosystem' },
    { id: 'risk', label: 'Risk Assessment' },
  ],
  views: [
    {
      id: 'market',
      label: 'Market',
      component: 'SupraMarketView',
      default: true,
    },
    { id: 'network', label: 'Network', component: 'SupraNetworkView' },
    { id: 'price-feeds', label: 'Price Feeds', component: 'SupraPriceFeedsView' },
    { id: 'cross-chain', label: 'Cross-Chain', component: 'SupraCrossChainView' },
    { id: 'ecosystem', label: 'Ecosystem', component: 'SupraEcosystemView' },
    { id: 'risk', label: 'Risk Assessment', component: 'SupraRiskView' },
  ],
};
