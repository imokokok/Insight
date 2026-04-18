import Image from 'next/image';

import { chartColors } from '@/lib/config/colors';
import { RedStoneClient } from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getDefaultMarketData, getDefaultNetworkData } from './helpers';
import { type OracleConfig } from './types';

export const redstoneConfig: OracleConfig = {
  provider: OracleProvider.REDSTONE,
  name: 'RedStone',
  descriptionKey: 'oracles.descriptions.redstone',
  symbol: 'RED',
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
    Blockchain.LINEA,
    Blockchain.MANTLE,
    Blockchain.SCROLL,
    Blockchain.ZKSYNC,
    Blockchain.BLAST,
    Blockchain.STARKNET,
    Blockchain.APTOS,
    Blockchain.SUI,
  ],
  client: new RedStoneClient(),
  iconBgColor: `bg-[${chartColors.oracle.redstone}]`,
  themeColor: '#ef4444',
  icon: <Image src="/logos/oracles/redstone.svg" alt="RedStone" width={48} height={48} />,
  marketData: getDefaultMarketData('REDSTONE', 'RedStone'),
  networkData: getDefaultNetworkData(),
  features: {
    hasNodeAnalytics: false,
    hasValidatorAnalytics: false,
    hasPublisherAnalytics: true,
    hasDisputeResolution: false,
    hasPriceFeeds: true,
    hasQuantifiableSecurity: false,
    hasFirstPartyOracle: false,
    hasCoreFeatures: true,
    hasDataStreams: true,
    hasCrossChain: true,
  },
  tabs: [
    { id: 'market', label: 'Market' },
    { id: 'network', label: 'Network' },
    { id: 'providers', label: 'Providers' },
    { id: 'data-streams', label: 'Data Streams' },
    { id: 'cross-chain', label: 'Cross-Chain' },
    { id: 'ecosystem', label: 'Ecosystem' },
    { id: 'risk', label: 'Risk Assessment' },
  ],
};
