import Image from 'next/image';

import { chartColors } from '@/lib/config/colors';
import { WINkLinkClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getDefaultMarketData, getDefaultNetworkData } from './helpers';
import { type OracleConfig } from './types';

let _client: WINkLinkClient | null = null;
function getClient() {
  if (!_client) _client = new WINkLinkClient();
  return _client;
}

export const winklinkConfig: OracleConfig = {
  provider: OracleProvider.WINKLINK,
  name: 'WINkLink',
  descriptionKey: 'oracles.descriptions.winklink',
  symbol: 'WIN',
  defaultChain: Blockchain.BNB_CHAIN,
  supportedChains: [Blockchain.BNB_CHAIN, Blockchain.TRON, Blockchain.ETHEREUM],
  getClient,
  iconBgColor: `bg-[${chartColors.oracle.winklink}]`,
  themeColor: '#ec4899',
  icon: <Image src="/logos/oracles/winklink.svg" alt="WINkLink" width={48} height={48} />,
  marketData: getDefaultMarketData('WINKLINK', 'WINkLink'),
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
  },
  tabs: [
    { id: 'market', label: 'Market Data' },
    { id: 'network', label: 'Network Health' },
    { id: 'tron', label: 'TRON Ecosystem' },
    { id: 'risk', label: 'Risk Assessment' },
  ],
};
