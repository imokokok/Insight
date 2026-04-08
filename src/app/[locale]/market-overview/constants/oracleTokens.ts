/**
 * 预言机代币常量定义
 */

import { OracleProvider } from '@/types/oracle';

/**
 * 预言机代币配置
 */
export interface OracleTokenConfig {
  /** 预言机提供商 */
  provider: OracleProvider;
  /** 预言机名称 */
  oracleName: string;
  /** 代币符号 */
  symbol: string;
  /** 代币名称 */
  tokenName: string;
  /** Logo 路径 */
  logoPath: string;
  /** 主题颜色 */
  themeColor: string;
}

/**
 * 9个预言机代币配置列表
 */
export const ORACLE_TOKENS: OracleTokenConfig[] = [
  {
    provider: OracleProvider.CHAINLINK,
    oracleName: 'Chainlink',
    symbol: 'LINK',
    tokenName: 'Chainlink',
    logoPath: '/logos/oracles/chainlink.svg',
    themeColor: '#375bd2',
  },
  {
    provider: OracleProvider.BAND_PROTOCOL,
    oracleName: 'Band Protocol',
    symbol: 'BAND',
    tokenName: 'Band Protocol',
    logoPath: '/logos/oracles/band.svg',
    themeColor: '#7c3aed',
  },
  {
    provider: OracleProvider.UMA,
    oracleName: 'UMA',
    symbol: 'UMA',
    tokenName: 'UMA',
    logoPath: '/logos/oracles/uma.svg',
    themeColor: '#dc2626',
  },
  {
    provider: OracleProvider.PYTH,
    oracleName: 'Pyth',
    symbol: 'PYTH',
    tokenName: 'Pyth Network',
    logoPath: '/logos/oracles/pyth.svg',
    themeColor: '#8b5cf6',
  },
  {
    provider: OracleProvider.API3,
    oracleName: 'API3',
    symbol: 'API3',
    tokenName: 'API3',
    logoPath: '/logos/oracles/api3.svg',
    themeColor: '#10b981',
  },
  {
    provider: OracleProvider.REDSTONE,
    oracleName: 'RedStone',
    symbol: 'RED',
    tokenName: 'RedStone',
    logoPath: '/logos/oracles/redstone.svg',
    themeColor: '#ef4444',
  },
  {
    provider: OracleProvider.DIA,
    oracleName: 'DIA',
    symbol: 'DIA',
    tokenName: 'DIA',
    logoPath: '/logos/oracles/dia.svg',
    themeColor: '#6366f1',
  },
  {
    provider: OracleProvider.WINKLINK,
    oracleName: 'WINkLink',
    symbol: 'WIN',
    tokenName: 'WINkLink',
    logoPath: '/logos/oracles/winklink.svg',
    themeColor: '#ec4899',
  },
];

/**
 * 获取代币符号列表
 */
export const ORACLE_TOKEN_SYMBOLS = ORACLE_TOKENS.map((token) => token.symbol);

/**
 * 根据代币符号获取配置
 */
export function getOracleTokenConfig(symbol: string): OracleTokenConfig | undefined {
  return ORACLE_TOKENS.find((token) => token.symbol.toUpperCase() === symbol.toUpperCase());
}

/**
 * 根据预言机提供商获取配置
 */
export function getOracleTokenConfigByProvider(
  provider: OracleProvider
): OracleTokenConfig | undefined {
  return ORACLE_TOKENS.find((token) => token.provider === provider);
}
