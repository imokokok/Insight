import { z } from 'zod';

/**
 * x402 keyless paid-tier configuration for the pre-trade safety check.
 *
 * Design rules (see ~/.workbuddy/insight-x402/x402-pretrade-plan.md):
 * - The kill switch (`X402_ENABLED`) must be exactly "true" AND a syntactically
 *   valid `X402_PAY_TO` must be present for the paid tier to arm. An empty
 *   payTo therefore keeps the endpoint's behaviour byte-identical to today.
 * - The receiving address lives in server-side env only. It is NEVER read from
 *   request parameters, so a caller cannot redirect a 402 quote to another
 *   wallet.
 * - Price is expressed in US dollars and converted to USDC atomic units
 *   (6 decimals) at config-parse time, so the wire always carries a
 *   deterministic integer amount.
 */

/** Well-known USDC contract per CAIP-2 network id (x402 v2 wire format). */
const SUPPORTED_NETWORKS = {
  'eip155:84532': {
    /** Chain: Base Sepolia (testnet). */
    usdc: '0x036CbD53842C5b0Bb4dAaCa107AdCa4Ac6b51246',
  },
  'eip155:8453': {
    /** Chain: Base mainnet. */
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
} as const;

export type X402NetworkId = keyof typeof SUPPORTED_NETWORKS;

const NetworkSchema = z.enum(['eip155:84532', 'eip155:8453']);

const USDC_DECIMALS = 6;

const PayToSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'X402_PAY_TO must be a 0x-prefixed 20-byte address');

export interface X402Config {
  /** True only when the kill switch is on AND payTo is a valid address. */
  enabled: boolean;
  network: X402NetworkId;
  payTo: string;
  /** USDC atomic units (6 decimals) charged per successful check. */
  amountAtomic: string;
  /** Human-readable USD price for docs/telemetry. */
  priceUsd: number;
  facilitatorUrl: string;
  /** Facilitator HTTP timeout (verify + settle), bounded well below 90s default. */
  facilitatorTimeoutMs: number;
  /** Payment authorization validity window advertised in 402 requirements. */
  maxTimeoutSeconds: number;
}

function parsePriceUsd(raw: string | undefined): number {
  const parsed = Number.parseFloat(raw ?? '0.02');
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('X402_PRICE_USD must be a positive number');
  }
  return parsed;
}

function usdToAtomicUnits(usd: number): string {
  // Integer math on the micro-dollar grid avoids binary float drift.
  const microUsd = Math.round(usd * 10 ** USDC_DECIMALS);
  if (microUsd <= 0) {
    throw new Error('X402_PRICE_USD resolves to zero USDC atomic units');
  }
  return String(microUsd);
}

/**
 * Parse and validate x402 env configuration. Throws on a malformed value so a
 * misconfigured deployment fails loudly instead of silently under- or
 * over-charging.
 */
export function parseX402Config(env: NodeJS.ProcessEnv = process.env): X402Config {
  const network = NetworkSchema.parse(env.X402_NETWORK ?? 'eip155:84532');
  const priceUsd = parsePriceUsd(env.X402_PRICE_USD);

  const rawPayTo = env.X402_PAY_TO?.trim() ?? '';
  const payTo = rawPayTo === '' ? '' : PayToSchema.parse(rawPayTo);

  const flagEnabled = env.X402_ENABLED === 'true';

  return {
    enabled: flagEnabled && payTo !== '',
    network,
    payTo,
    amountAtomic: usdToAtomicUnits(priceUsd),
    priceUsd,
    facilitatorUrl: env.X402_FACILITATOR_URL?.trim() || 'https://x402.org/facilitator',
    facilitatorTimeoutMs: 15_000,
    maxTimeoutSeconds: 60,
  };
}

/** The v1 route this paid tier protects; used as the x402 route pattern. */
export const X402_PRE_TRADE_ROUTE = '/api/v1/safety/pre-trade';

/** USDC asset address for the configured network. */
export function usdcForNetwork(network: X402NetworkId): string {
  return SUPPORTED_NETWORKS[network].usdc;
}

/**
 * Resolve the x402 config for a request. Returns `enabled: false` when the
 * paid tier is not armed (kill switch off, or payTo intentionally left empty),
 * in which case the caller must fall through to the legacy API-key path.
 */
export function getX402Config(env: NodeJS.ProcessEnv = process.env): X402Config {
  return parseX402Config(env);
}
