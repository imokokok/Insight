import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ServerEnv');

/**
 * 服务端环境变量配置
 * 这些变量只在服务端使用，不会暴露给客户端
 */

// Alchemy RPC 配置
export const ALCHEMY_RPC = {
  ethereum: process.env.ALCHEMY_ETHEREUM_RPC || '',
  arbitrum: process.env.ALCHEMY_ARBITRUM_RPC || '',
  polygon: process.env.ALCHEMY_POLYGON_RPC || '',
  base: process.env.ALCHEMY_BASE_RPC || '',
  optimism: process.env.ALCHEMY_OPTIMISM_RPC || '',
  solana: process.env.ALCHEMY_SOLANA_RPC || '',
  bnb: process.env.ALCHEMY_BNB_RPC || '',
  avalanche: process.env.ALCHEMY_AVALANCHE_RPC || '',
  zksync: process.env.ALCHEMY_ZKSYNC_RPC || '',
  scroll: process.env.ALCHEMY_SCROLL_RPC || '',
  mantle: process.env.ALCHEMY_MANTLE_RPC || '',
  linea: process.env.ALCHEMY_LINEA_RPC || '',
};

// TRON 配置
export const TRON_CONFIG = {
  rpcUrl: process.env.TRON_RPC_URL || 'https://api.trongrid.io',
  solidityRpc: process.env.TRON_SOLIDITY_RPC || 'https://api.trongrid.io/walletsolidity',
  fullnodeRpc: process.env.TRON_FULLNODE_RPC || 'https://api.trongrid.io/wallet',
  apiKey: process.env.TRONGRID_API_KEY || '',
};

// The Graph 配置
export const THEGRAPH_CONFIG = {
  apiKey: process.env.THEGRAPH_API_KEY || '',
};

// UMA 配置
export const UMA_CONFIG = {
  subgraphApiKey: process.env.UMA_SUBGRAPH_API_KEY || '',
};

// API3 配置
export const API3_CONFIG = {
  marketApiUrl: process.env.API3_MARKET_API_URL || 'https://market.api3.org/api/v1',
  daoApiUrl: process.env.API3_DAO_API_URL || 'https://api.api3.org',
  wsUrl: process.env.API3_WS_URL || 'wss://ws.api3.org',
};

// 功能开关
export const FEATURE_FLAGS = {
  useRealWinklinkData: process.env.USE_REAL_WINKLINK_DATA === 'true',
  useRealChainlinkData: process.env.USE_REAL_CHAINLINK_DATA === 'true',
  useRealTellorData: process.env.USE_REAL_TELLOR_DATA === 'true',
  useRealUmaData: process.env.USE_REAL_UMA_DATA === 'true',
  useRealApi3Data: process.env.USE_REAL_API3_DATA === 'true',
};

// 缓存配置
export const CACHE_CONFIG = {
  winklinkTtl: parseInt(process.env.WINKLINK_CACHE_TTL || '30000', 10),
  tellorTtl: parseInt(process.env.TELLOR_CACHE_TTL || '60000', 10),
  umaTtl: parseInt(process.env.UMA_CACHE_TTL || '30000', 10),
  chainlinkPriceTtl: parseInt(process.env.CHAINLINK_PRICE_CACHE_TTL || '30000', 10),
  api3PriceTtl: parseInt(process.env.API3_PRICE_CACHE_TTL || '30000', 10),
};

// Supabase 服务端配置
export const SUPABASE_SERVER_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

// 安全配置
export const SECURITY_CONFIG = {
  csrfSecret: process.env.CSRF_SECRET || '',
  jwtSecret: process.env.JWT_SECRET || '',
  cronSecret: process.env.CRON_SECRET || '',
};

/**
 * 验证服务端环境变量
 */
export function validateServerEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // 检查关键的 Alchemy RPC
  if (!ALCHEMY_RPC.ethereum) missing.push('ALCHEMY_ETHEREUM_RPC');

  // 检查 The Graph API Key
  if (!THEGRAPH_CONFIG.apiKey) {
    logger.warn('THEGRAPH_API_KEY not set, using fallback endpoints');
  }

  // 检查 TRON API Key
  if (!TRON_CONFIG.apiKey) {
    logger.warn('TRONGRID_API_KEY not set, rate limiting may apply');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * 获取指定链的 Alchemy RPC URL
 */
export function getAlchemyRpcUrl(chain: keyof typeof ALCHEMY_RPC): string {
  const url = ALCHEMY_RPC[chain];
  if (!url) {
    logger.warn(`Alchemy RPC not configured for chain: ${chain}`);
    return '';
  }
  return url;
}

/**
 * 获取 TRON RPC 配置
 */
export function getTronConfig() {
  return TRON_CONFIG;
}

/**
 * 获取 The Graph API Key
 */
export function getTheGraphApiKey(): string {
  return THEGRAPH_CONFIG.apiKey;
}

/**
 * 获取 UMA Subgraph API Key
 */
export function getUmaSubgraphApiKey(): string {
  return UMA_CONFIG.subgraphApiKey;
}

/**
 * 获取 API3 配置
 */
export function getApi3Config() {
  return API3_CONFIG;
}

// 初始化验证 - 延迟到首次调用时执行
let _validationDone = false;
export function ensureServerEnvValidated(): void {
  if (!_validationDone && typeof window === 'undefined') {
    _validationDone = true;
    const validation = validateServerEnv();
    if (!validation.valid) {
      logger.warn('Missing server environment variables:', { missing: validation.missing });
    }
  }
}
