import { z } from 'zod';

import { createLogger } from '@/lib/utils/logger';

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

export const ALCHEMY_RPC = parseAlchemyRpc();

export const TRON_CONFIG = parseTronConfig();

export const STELLAR_CONFIG = parseStellarConfig();
