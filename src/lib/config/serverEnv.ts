import { z } from 'zod';

import { createLogger } from '@/lib/utils/logger';

import { FEATURE_FLAGS as _FEATURE_FLAGS } from './env';

const logger = createLogger('ServerEnv');

const alchemyRpcSchema = z.object({
  ethereum: z.string().url().optional().default(''),
  arbitrum: z.string().url().optional().default(''),
  polygon: z.string().url().optional().default(''),
  base: z.string().url().optional().default(''),
  optimism: z.string().url().optional().default(''),
  solana: z.string().url().optional().default(''),
  bnb: z.string().url().optional().default(''),
  avalanche: z.string().url().optional().default(''),
  zksync: z.string().url().optional().default(''),
  scroll: z.string().url().optional().default(''),
  mantle: z.string().url().optional().default(''),
  linea: z.string().url().optional().default(''),
});

const tronConfigSchema = z.object({
  rpcUrl: z.string().url().optional().default('https://api.trongrid.io'),
  solidityRpc: z.string().url().optional().default('https://api.trongrid.io/walletsolidity'),
  fullnodeRpc: z.string().url().optional().default('https://api.trongrid.io/wallet'),
  apiKey: z.string().optional().default(''),
});

const stellarConfigSchema = z.object({
  rpcUrl: z.string().url().optional().default(''),
  reflectorCryptoContract: z.string().optional().default(''),
  reflectorForexContract: z.string().optional().default(''),
});

const cacheConfigSchema = z.object({
  winklinkTtl: z.coerce.number().positive().default(30000),
  chainlinkPriceTtl: z.coerce.number().positive().default(30000),
  api3PriceTtl: z.coerce.number().positive().default(30000),
  twapPriceTtl: z.coerce.number().positive().default(30000),
});

const securityConfigSchema = z.object({
  csrfSecret: z.string().min(1),
  jwtSecret: z.string().min(1),
  cronSecret: z.string().min(1),
});

const lenientSecurityConfigSchema = z.object({
  csrfSecret: z.string().optional().default(''),
  jwtSecret: z.string().optional().default(''),
  cronSecret: z.string().optional().default(''),
});

function parseAlchemyRpc() {
  const raw = {
    ethereum: process.env.ALCHEMY_ETHEREUM_RPC || undefined,
    arbitrum: process.env.ALCHEMY_ARBITRUM_RPC || undefined,
    polygon: process.env.ALCHEMY_POLYGON_RPC || undefined,
    base: process.env.ALCHEMY_BASE_RPC || undefined,
    optimism: process.env.ALCHEMY_OPTIMISM_RPC || undefined,
    solana: process.env.ALCHEMY_SOLANA_RPC || undefined,
    bnb: process.env.ALCHEMY_BNB_RPC || undefined,
    avalanche: process.env.ALCHEMY_AVALANCHE_RPC || undefined,
    zksync: process.env.ALCHEMY_ZKSYNC_RPC || undefined,
    scroll: process.env.ALCHEMY_SCROLL_RPC || undefined,
    mantle: process.env.ALCHEMY_MANTLE_RPC || undefined,
    linea: process.env.ALCHEMY_LINEA_RPC || undefined,
  };
  const result = alchemyRpcSchema.safeParse(raw);
  if (result.success) return result.data;
  logger.warn('Alchemy RPC config validation warnings:', {
    errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  });
  return alchemyRpcSchema.parse({});
}

function parseTronConfig() {
  const raw = {
    rpcUrl: process.env.TRON_RPC_URL || undefined,
    solidityRpc: process.env.TRON_SOLIDITY_RPC || undefined,
    fullnodeRpc: process.env.TRON_FULLNODE_RPC || undefined,
    apiKey: process.env.TRONGRID_API_KEY || undefined,
  };
  const result = tronConfigSchema.safeParse(raw);
  if (result.success) return result.data;
  logger.warn('TRON config validation warnings:', {
    errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  });
  return tronConfigSchema.parse({});
}

function parseStellarConfig() {
  const raw = {
    rpcUrl: process.env.STELLAR_RPC_URL || undefined,
    reflectorCryptoContract: process.env.REFLECTOR_CRYPTO_CONTRACT || undefined,
    reflectorForexContract: process.env.REFLECTOR_FOREX_CONTRACT || undefined,
  };
  const result = stellarConfigSchema.safeParse(raw);
  if (result.success) return result.data;
  logger.warn('Stellar config validation warnings:', {
    errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  });
  return stellarConfigSchema.parse({});
}

function parseCacheConfig() {
  const raw = {
    winklinkTtl: process.env.WINKLINK_CACHE_TTL || undefined,
    chainlinkPriceTtl: process.env.CHAINLINK_PRICE_CACHE_TTL || undefined,
    api3PriceTtl: process.env.API3_PRICE_CACHE_TTL || undefined,
    twapPriceTtl: process.env.TWAP_PRICE_CACHE_TTL || undefined,
  };
  const result = cacheConfigSchema.safeParse(raw);
  if (result.success) return result.data;
  logger.warn('Cache config validation warnings:', {
    errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  });
  return cacheConfigSchema.parse({});
}

function parseSecurityConfig() {
  const raw = {
    csrfSecret: process.env.CSRF_SECRET || undefined,
    jwtSecret: process.env.JWT_SECRET || undefined,
    cronSecret: process.env.CRON_SECRET || undefined,
  };
  const result = securityConfigSchema.safeParse(raw);
  if (result.success) return result.data;

  if (process.env.NODE_ENV === 'production') {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(
      `FATAL: Security configuration validation failed in production:\n${errors.join('\n')}`
    );
  }

  logger.warn('Security config validation warnings (non-production):', {
    errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  });
  return lenientSecurityConfigSchema.parse(raw);
}

export const ALCHEMY_RPC = parseAlchemyRpc();

export const TRON_CONFIG = parseTronConfig();

export const THEGRAPH_CONFIG = {
  apiKey: process.env.THEGRAPH_API_KEY || '',
};

export const API3_CONFIG = {
  marketApiUrl: process.env.API3_MARKET_API_URL || 'https://market.api3.org/api/v1',
  daoApiUrl: process.env.API3_DAO_API_URL || 'https://api.api3.org',
  wsUrl: process.env.API3_WS_URL || 'wss://ws.api3.org',
};

export const STELLAR_CONFIG = parseStellarConfig();

export const FLARE_CONFIG = {
  rpcUrl: process.env.FLARE_RPC_URL || '',
};

export const CACHE_CONFIG = parseCacheConfig();

export const SUPABASE_SERVER_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

export const SECURITY_CONFIG = parseSecurityConfig();

export function validateServerEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!ALCHEMY_RPC.ethereum) missing.push('ALCHEMY_ETHEREUM_RPC');

  if (!THEGRAPH_CONFIG.apiKey) {
    logger.warn('THEGRAPH_API_KEY not set, using fallback endpoints');
  }

  if (!TRON_CONFIG.apiKey) {
    logger.warn('TRONGRID_API_KEY not set, rate limiting may apply');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function getAlchemyRpcUrl(chain: keyof typeof ALCHEMY_RPC): string {
  const url = ALCHEMY_RPC[chain];
  if (!url) {
    logger.warn(`Alchemy RPC not configured for chain: ${chain}`);
    return '';
  }
  return url;
}

export function getTronConfig() {
  return TRON_CONFIG;
}

export function getTheGraphApiKey(): string {
  return THEGRAPH_CONFIG.apiKey;
}

export function getApi3Config() {
  return API3_CONFIG;
}

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
