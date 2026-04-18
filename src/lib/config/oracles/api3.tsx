import Image from 'next/image';

import { chartColors } from '@/lib/config/colors';
import { API3Client } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getDefaultMarketData, getDefaultNetworkData } from './helpers';
import { type OracleConfig } from './types';

export const api3Config: OracleConfig = {
  provider: OracleProvider.API3,
  name: 'API3',
  descriptionKey: 'oracles.descriptions.api3',
  symbol: 'API3',
  defaultChain: Blockchain.ETHEREUM,
  supportedChains: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
    Blockchain.OPTIMISM,
  ],
  client: new API3Client(),
  iconBgColor: `bg-[${chartColors.oracle.api3}]`,
  themeColor: '#10b981',
  icon: <Image src="/logos/oracles/api3.svg" alt="API3" width={48} height={48} />,
  marketData: getDefaultMarketData('API3', 'API3'),
  networkData: getDefaultNetworkData(),
  features: {
    hasNodeAnalytics: false,
    hasValidatorAnalytics: false,
    hasPublisherAnalytics: false,
    hasDisputeResolution: false,
    hasPriceFeeds: false,
    hasQuantifiableSecurity: true,
    hasFirstPartyOracle: true,
    hasCoreFeatures: false,
    hasRiskAssessment: true,
  },
  tabs: [
    { id: 'market', label: 'Market Data' },
    { id: 'network', label: 'Network Health' },
    { id: 'airnode', label: 'Airnode' },
    { id: 'dapi', label: 'dAPI' },
    { id: 'ecosystem', label: 'Ecosystem' },
    { id: 'risk', label: 'Risk Assessment' },
  ],
};
