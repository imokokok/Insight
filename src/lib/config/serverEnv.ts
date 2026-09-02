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

// Alchemy API keys are appended as the last URL path segment
// (e.g. https://eth-mainnet.g.alchemy.com/v2/<KEY>). Keys are NOT a fixed
// length: Alchemy has shipped both 32-char hex keys and shorter (~21-char)
// base62 keys, and the format may change again. A length-based check cannot
// reliably tell a valid key from a truncated one — and *dropping* a valid key
// (the previous behaviour, which hard-coded length 32) silently forced every
// chain onto slower public RPCs. Instead we only warn (non-destructively) when
// the key segment looks obviously short; genuine request-time failures are
// handled by the public fallback endpoints that always accompany an Alchemy URL
// in the endpoint arrays (see rpcConfig.ts / api3NetworkService.ts).
const ALCHEMY_KEY_MIN_LENGTH = 16;

function sanitizeAlchemyUrl(network: string, url: string): string {
  if (!url) return '';
  // Allow non-Alchemy URLs (e.g. a custom RPC) through untouched.
  if (!url.includes('alchemy.com')) return url;
  const segments = url.replace(/\/+$/, '').split('/');
  const key = segments[segments.length - 1] ?? '';
  if (key.length < ALCHEMY_KEY_MIN_LENGTH) {
    logger.warn(
      `Alchemy ${network} RPC key looks unusually short (${key.length} chars); if RPC requests fail, replace the key in .env.local. The endpoint is kept and public fallbacks will absorb failures.`,
      { network, keyLength: key.length }
    );
  }
  return url;
}

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
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    logger.warn('Alchemy RPC config validation warnings:', { errors });
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Alchemy RPC config validation failed: ${errors.join(', ')}`);
    }
  }
  const parsed = result.success ? result.data : alchemyRpcSchema.parse({});
  // Warn on suspiciously short Alchemy keys but never drop a valid URL
  // (see sanitizeAlchemyUrl).
  return Object.fromEntries(
    Object.entries(parsed).map(([network, url]) => [
      network,
      sanitizeAlchemyUrl(network, url as string),
    ])
  ) as typeof parsed;
}

const tronConfigSchema = z.object({
  rpcUrl: z.string().url().optional().default('https://api.trongrid.io'),
  solidityRpc: z.string().url().optional().default('https://api.trongrid.io/walletsolidity'),
  fullnodeRpc: z.string().url().optional().default('https://api.trongrid.io/wallet'),
  apiKey: z.string().optional().default(''),
});

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

export const ALCHEMY_RPC = parseAlchemyRpc();

export const TRON_CONFIG = parseTronConfig();

// ---------------------------------------------------------------------------
// NOWPayments configuration for crypto billing (USDC-denominated).
//
// NOWPayments is a crypto payment gateway (0.5% fee, 300+ coins, no account
// approval) used instead of Creem/Stripe/Paddle — all of which refuse
// crypto-related businesses or don't support mainland-China individuals.
// There is no subscription concept: each /v1/invoice is a one-shot payment
// for one billing cycle. The application maintains subscription state.
//
// All fields are optional — billing gracefully degrades (checkout returns a
// clear error, webhook cannot verify) when env is not configured. This lets
// the app run in dev without NOWPayments credentials.
//
// Wallet address is an application-side auditable constant; actual payout
// wallets are configured in the NOWPayments dashboard per currency/chain.
// ---------------------------------------------------------------------------

interface NowPaymentsConfig {
  apiKey: string | null;
  ipnSecret: string | null;
  walletAddress: string | null;
  testMode: boolean;
  isConfigured: boolean;
}

function parseNowPaymentsConfig(): NowPaymentsConfig {
  // Production (api.nowpayments.io) is the default. Sandbox is an EXPLICIT
  // opt-in via NOWPAYMENTS_TEST_MODE=true — this prevents a deployment that
  // forgets the flag from silently running against the sandbox when expecting
  // real payments (the previous `!== 'false'` default did exactly that).
  const testMode = process.env.NOWPAYMENTS_TEST_MODE === 'true';

  const config: NowPaymentsConfig = {
    apiKey: process.env.NOWPAYMENTS_API_KEY || null,
    ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET || null,
    walletAddress: process.env.NOWPAYMENTS_WALLET_ADDRESS || null,
    testMode,
    isConfigured: false,
  };

  // NOWPayments is "configured" only if the API key AND IPN secret are present.
  // Missing IPN secret is fatal for webhook verification. Wallet address is
  // non-fatal (dashboard-configured), but warning-worthy for audit.
  config.isConfigured = !!config.apiKey && !!config.ipnSecret;

  // Loud guard: if test mode is on but the config looks production-ready,
  // surface it clearly so nobody mistakes a sandbox run for a live one.
  if (config.testMode && config.isConfigured) {
    logger.warn(
      'NOWPayments is in SANDBOX (test) mode — invoices go to api-sandbox.nowpayments.io and will NOT receive real payments'
    );
  }

  return config;
}

export const NOWPAYMENTS_CONFIG = parseNowPaymentsConfig();
