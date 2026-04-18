import Image from 'next/image';

import { chartColors } from '@/lib/config/colors';
import { WINkLinkClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getDefaultMarketData, getDefaultNetworkData } from './helpers';
import { type OracleConfig } from './types';

export const winklinkConfig: OracleConfig = {
  provider: OracleProvider.WINKLINK,
  name: 'WINkLink',
  descriptionKey: 'oracles.descriptions.winklink',
  symbol: 'WIN/USD',
  defaultChain: Blockchain.BNB_CHAIN,
  supportedChains: [Blockchain.BNB_CHAIN, Blockchain.TRON, Blockchain.ETHEREUM],
  client: new WINkLinkClient(),
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
    { id: 'staking', label: 'Staking' },
    { id: 'gaming', label: 'Gaming' },
    { id: 'risk', label: 'Risk Assessment' },
  ],
};
