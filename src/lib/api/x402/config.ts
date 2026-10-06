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
    /** Chain: Base Sepolia (testnet). Circle native USDC. */
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
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
  /**
   * CDP Secret API key credentials. Required (and validated) whenever the
   * facilitator URL points at api.cdp.coinbase.com, since CDP rejects
   * unauthenticated verify/settle calls. Null = no auth (x402.org default).
   */
  facilitatorCdpAuth: { apiKeyId: string; apiKeySecret: string } | null;
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

const CDP_FACILITATOR_HOST = 'api.cdp.coinbase.com';

function parseFacilitatorCdpAuth(
  env: NodeJS.ProcessEnv,
  facilitatorUrl: string
): { apiKeyId: string; apiKeySecret: string } | null {
  const apiKeyId = env.X402_CDP_API_KEY_ID?.trim() ?? '';
  const apiKeySecret = env.X402_CDP_API_KEY_SECRET?.trim() ?? '';

  if ((apiKeyId === '') !== (apiKeySecret === '')) {
    throw new Error(
      'X402_CDP_API_KEY_ID and X402_CDP_API_KEY_SECRET must be set together ' +
        '(CDP Secret API key from portal.cdp.coinbase.com)'
    );
  }

  let host = '';
  try {
    host = new URL(facilitatorUrl).host;
  } catch {
    // URL syntax errors surface later via the facilitator client; do not
    // double-report here.
  }

  if (host === CDP_FACILITATOR_HOST && apiKeyId === '') {
    throw new Error(
      'X402_FACILITATOR_URL points at the CDP facilitator but X402_CDP_API_KEY_ID/' +
        'X402_CDP_API_KEY_SECRET are missing — CDP requires authenticated verify/settle'
    );
  }

  return apiKeyId === '' ? null : { apiKeyId, apiKeySecret };
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
  const facilitatorUrl = env.X402_FACILITATOR_URL?.trim() || 'https://x402.org/facilitator';

  return {
    enabled: flagEnabled && payTo !== '',
    network,
    payTo,
    amountAtomic: usdToAtomicUnits(priceUsd),
    priceUsd,
    facilitatorUrl,
    facilitatorTimeoutMs: 15_000,
    maxTimeoutSeconds: 60,
    facilitatorCdpAuth: parseFacilitatorCdpAuth(env, facilitatorUrl),
  };
}

/** The v1 route this paid tier protects; used as the x402 route pattern. */
export const X402_PRE_TRADE_ROUTE = '/api/v1/safety/pre-trade';

/** The MCP streamable-HTTP route paid per tools/call (JSON-RPC POST). */
export const X402_MCP_ROUTE = '/api/mcp';

/**
 * USD value of one billing credit for the MCP x402 tier, derived from the
 * REST anchor: the pre-trade check (metering class C3 = 5 credits) sells for
 * $0.02 on the keyless tier, so 1 credit = $0.004. The MCP bridge converts a
 * tool's credit cost (getToolCreditCost) into a USDC amount with this factor,
 * keeping the two payment rails price-consistent by construction.
 */
export const X402_CREDIT_USD = 0.004;

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
