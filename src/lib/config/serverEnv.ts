import { createLogger } from '@/lib/utils/logger';

import { FEATURE_FLAGS as _FEATURE_FLAGS } from './env';

const logger = createLogger('ServerEnv');

/**
 * Server environment variable configuration
 * These variables are only used on the server side and will not be exposed to the client
 */

// Alchemy RPC configuration
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

// TRON configuration
export const TRON_CONFIG = {
  rpcUrl: process.env.TRON_RPC_URL || 'https://api.trongrid.io',
  solidityRpc: process.env.TRON_SOLIDITY_RPC || 'https://api.trongrid.io/walletsolidity',
  fullnodeRpc: process.env.TRON_FULLNODE_RPC || 'https://api.trongrid.io/wallet',
  apiKey: process.env.TRONGRID_API_KEY || '',
};

// The Graph configuration
const THEGRAPH_CONFIG = {
  apiKey: process.env.THEGRAPH_API_KEY || '',
};

// API3 configuration
const API3_CONFIG = {
  marketApiUrl: process.env.API3_MARKET_API_URL || 'https://market.api3.org/api/v1',
  daoApiUrl: process.env.API3_DAO_API_URL || 'https://api.api3.org',
  wsUrl: process.env.API3_WS_URL || 'wss://ws.api3.org',
};

// Stellar RPC configuration
export const STELLAR_CONFIG = {
  rpcUrl: process.env.STELLAR_RPC_URL || '',
  reflectorCryptoContract: process.env.REFLECTOR_CRYPTO_CONTRACT || '',
  reflectorForexContract: process.env.REFLECTOR_FOREX_CONTRACT || '',
};

// Flare RPC configuration
const FLARE_CONFIG = {
  rpcUrl: process.env.FLARE_RPC_URL || '',
};

// Feature flags - re-exported from featureFlags for backward compatibility
// Cache configuration
const CACHE_CONFIG = {
  winklinkTtl: parseInt(process.env.WINKLINK_CACHE_TTL || '30000', 10),
  chainlinkPriceTtl: parseInt(process.env.CHAINLINK_PRICE_CACHE_TTL || '30000', 10),
  api3PriceTtl: parseInt(process.env.API3_PRICE_CACHE_TTL || '30000', 10),
  twapPriceTtl: parseInt(process.env.TWAP_PRICE_CACHE_TTL || '30000', 10),
};

// Supabase server configuration
const SUPABASE_SERVER_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

// Security configuration
const SECURITY_CONFIG = {
  csrfSecret: process.env.CSRF_SECRET || '',
  jwtSecret: process.env.JWT_SECRET || '',
  cronSecret: process.env.CRON_SECRET || '',
};

if (process.env.NODE_ENV === 'production') {
  if (!SECURITY_CONFIG.csrfSecret) {
    logger.error('FATAL: CSRF_SECRET is not set in production');
  }
  if (!SECURITY_CONFIG.jwtSecret) {
    logger.error('FATAL: JWT_SECRET is not set in production');
  }
  if (!SECURITY_CONFIG.cronSecret) {
    logger.error('FATAL: CRON_SECRET is not set in production');
  }
}

/**
 * Validate server environment variables
 */
function validateServerEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Check critical Alchemy RPC
  if (!ALCHEMY_RPC.ethereum) missing.push('ALCHEMY_ETHEREUM_RPC');

  // Check The Graph API Key
  if (!THEGRAPH_CONFIG.apiKey) {
    logger.warn('THEGRAPH_API_KEY not set, using fallback endpoints');
  }

  // Check TRON API Key
  if (!TRON_CONFIG.apiKey) {
    logger.warn('TRONGRID_API_KEY not set, rate limiting may apply');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get the Alchemy RPC URL for the specified chain
 */
function getAlchemyRpcUrl(chain: keyof typeof ALCHEMY_RPC): string {
  const url = ALCHEMY_RPC[chain];
  if (!url) {
    logger.warn(`Alchemy RPC not configured for chain: ${chain}`);
    return '';
  }
  return url;
}

/**
 * Get TRON RPC configuration
 */
function getTronConfig() {
  return TRON_CONFIG;
}

/**
 * Get The Graph API Key
 */
function getTheGraphApiKey(): string {
  return THEGRAPH_CONFIG.apiKey;
}

/**
 * Get API3 configuration
 */
function getApi3Config() {
  return API3_CONFIG;
}

// Initialization validation - deferred until first call
let _validationDone = false;
function ensureServerEnvValidated(): void {
  if (!_validationDone && typeof window === 'undefined') {
    _validationDone = true;
    const validation = validateServerEnv();
    if (!validation.valid) {
      logger.warn('Missing server environment variables:', { missing: validation.missing });
    }
  }
}
