import { financeColors, baseColors, semanticColors } from '@/lib/config/colors';

import { OracleProvider, Blockchain } from './enums';
import { type OracleProviderConfig } from './oracle';

export interface ChartThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  neutral: string;
  grid: string;
  text: string;
  background: string;
}

export const DEFAULT_CHART_THEME: ChartThemeColors = {
  primary: financeColors.secondary,
  secondary: baseColors.gray[500],
  success: semanticColors.success.DEFAULT,
  warning: semanticColors.warning.DEFAULT,
  danger: semanticColors.danger.DEFAULT,
  info: baseColors.primary[500],
  neutral: baseColors.gray[400],
  grid: baseColors.gray[200],
  text: baseColors.gray[700],
  background: baseColors.gray[50],
};

export const ORACLE_PROVIDERS: Record<OracleProvider, OracleProviderConfig> = {
  [OracleProvider.CHAINLINK]: {
    provider: OracleProvider.CHAINLINK,
    name: 'Chainlink',
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.AVALANCHE,
      Blockchain.BNB_CHAIN,
      Blockchain.BASE,
      Blockchain.SOLANA,
    ],
    description: 'Decentralized oracle network',
    website: 'https://chain.link',
    active: true,
  },
  [OracleProvider.BAND_PROTOCOL]: {
    provider: OracleProvider.BAND_PROTOCOL,
    name: 'Band Protocol',
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.POLYGON,
      Blockchain.AVALANCHE,
      Blockchain.BNB_CHAIN,
      Blockchain.COSMOS,
      Blockchain.OSMOSIS,
      Blockchain.JUNO,
    ],
    description: 'Cross-chain data oracle platform',
    website: 'https://bandprotocol.com',
    active: true,
  },
  [OracleProvider.UMA]: {
    provider: OracleProvider.UMA,
    name: 'UMA',
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.POLYGON,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.BASE,
    ],
    description: 'Optimistic oracle and dispute arbitration',
    website: 'https://umaproject.org',
    active: true,
  },
  [OracleProvider.PYTH]: {
    provider: OracleProvider.PYTH,
    name: 'Pyth',
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.SOLANA,
      Blockchain.AVALANCHE,
      Blockchain.BNB_CHAIN,
      Blockchain.APTOS,
      Blockchain.SUI,
    ],
    description: 'Low-latency price oracle',
    website: 'https://pyth.network',
    active: true,
  },
  [OracleProvider.API3]: {
    provider: OracleProvider.API3,
    name: 'API3',
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.POLYGON,
      Blockchain.AVALANCHE,
      Blockchain.BNB_CHAIN,
      Blockchain.BASE,
    ],
    description: 'First-party oracle infrastructure',
    website: 'https://api3.org',
    active: true,
  },
  [OracleProvider.REDSTONE]: {
    provider: OracleProvider.REDSTONE,
    name: 'RedStone',
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
    ],
    description: 'Modular oracle with pull-based data delivery',
    website: 'https://redstone.finance',
    active: true,
  },
  [OracleProvider.DIA]: {
    provider: OracleProvider.DIA,
    name: 'DIA',
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.POLYGON,
      Blockchain.AVALANCHE,
      Blockchain.BNB_CHAIN,
      Blockchain.BASE,
    ],
    description: 'Cross-chain oracle for DeFi and NFT data',
    website: 'https://diadata.org',
    active: true,
  },
  [OracleProvider.TELLOR]: {
    provider: OracleProvider.TELLOR,
    name: 'Tellor',
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.BASE,
      Blockchain.AVALANCHE,
    ],
    description: 'Decentralized oracle for crypto data',
    website: 'https://tellor.io',
    active: true,
  },
  [OracleProvider.CHRONICLE]: {
    provider: OracleProvider.CHRONICLE,
    name: 'Chronicle',
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.BASE,
      Blockchain.AVALANCHE,
    ],
    description: 'MakerDAO native oracle protocol',
    website: 'https://chroniclelabs.org',
    active: true,
  },
  [OracleProvider.WINKLINK]: {
    provider: OracleProvider.WINKLINK,
    name: 'WINkLink',
    supportedChains: [Blockchain.TRON, Blockchain.BNB_CHAIN],
    description: 'TRON ecosystem oracle solution',
    website: 'https://winklink.org',
    active: true,
  },
};
