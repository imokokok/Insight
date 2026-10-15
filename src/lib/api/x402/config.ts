import { z } from 'zod';

import { isSolanaPublicKey } from './solanaEncoding';

/**
 * x402 keyless paid-tier configuration for the pre-trade safety check.
 *
 * Design rules (see ~/.workbuddy/insight-x402/x402-pretrade-plan.md):
 * - The master switch (`X402_ENABLED`) must be exactly "true". EVM payment
 *   uses `X402_PAY_TO`; Solana is an independent opt-in that also requires
 *   `X402_SOLANA_PAY_TO`.
 * - The receiving address lives in server-side env only. It is NEVER read from
 *   request parameters, so a caller cannot redirect a 402 quote to another
 *   wallet.
 * - Prices are expressed in US dollars and converted to USDC atomic units
 *   (6 decimals) at config-parse time, so the wire always carries a
 *   deterministic integer amount.
 */

/** Well-known USDC contract per CAIP-2 network id (x402 v2 wire format). */
const SUPPORTED_NETWORKS = {
  'eip155:84532': {
    /** Chain: Base Sepolia (testnet). Circle native USDC. */
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    /**
     * EIP-712 domain name as deployed on-chain (name() selector 0x06fdde03):
     * the Base Sepolia USDC proxy answers name() = "USDC", unlike the Base
     * mainnet proxy which answers "USD Coin". Quoting the wrong name makes the
     * facilitator reject the payment with invalid_exact_evm_token_name_mismatch
     * before the signature is ever checked.
     */
    tokenName: 'USDC',
  },
  'eip155:8453': {
    /** Chain: Base mainnet. */
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    /** On-chain name() = "USD Coin" (validated via DOMAIN_SEPARATOR, 2026-10-07). */
    tokenName: 'USD Coin',
  },
} as const;

export type X402NetworkId = keyof typeof SUPPORTED_NETWORKS;

const NetworkSchema = z.enum(['eip155:84532', 'eip155:8453']);

export const SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;
export const SOLANA_DEVNET_CAIP2 = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1' as const;

export type X402SolanaNetworkId = typeof SOLANA_MAINNET_CAIP2 | typeof SOLANA_DEVNET_CAIP2;

const SOLANA_NETWORKS = {
  [SOLANA_MAINNET_CAIP2]: {
    /** Canonical mainnet USDC mint. */
    usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
  [SOLANA_DEVNET_CAIP2]: {
    /** Circle USDC devnet mint. */
    usdc: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  },
} as const;

export interface X402SolanaConfig {
  network: X402SolanaNetworkId;
  /** Owner wallet address; the associated USDC token account must be provisioned. */
  payTo: string;
  usdcMint: string;
  /** USDC atomic units (6 decimals) charged per successful check. */
  amountAtomic: string;
  priceUsd: number;
}

export interface X402PaymentOption {
  family: 'evm' | 'svm';
  network: X402NetworkId | X402SolanaNetworkId;
  payTo: string;
  asset: string;
  amountAtomic: string;
  tokenName?: string;
}

const SolanaNetworkSchema = z.enum([SOLANA_DEVNET_CAIP2, SOLANA_MAINNET_CAIP2]);

const USDC_DECIMALS = 6;

const PayToSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'X402_PAY_TO must be a 0x-prefixed 20-byte address');

const SolanaPayToSchema = z
  .string()
  .trim()
  .refine(isSolanaPublicKey, 'X402_SOLANA_PAY_TO must be a valid 32-byte Solana public key');

export interface X402Config {
  /** True when the master switch is on and at least one network is configured. */
  enabled: boolean;
  /** EVM remains the MPP rail and the legacy/default x402 payment option. */
  evmEnabled?: boolean;
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
  /** Optional, independently opted-in Solana x402 option. */
  solana?: X402SolanaConfig | null;
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
  const evmEnabled = flagEnabled && payTo !== '';

  const solanaFlagEnabled = flagEnabled && env.X402_SOLANA_ENABLED === 'true';
  const rawSolanaPayTo = env.X402_SOLANA_PAY_TO?.trim() ?? '';
  const solanaPayTo = rawSolanaPayTo === '' ? '' : SolanaPayToSchema.parse(rawSolanaPayTo);
  if (solanaFlagEnabled && solanaPayTo === '') {
    throw new Error('X402_SOLANA_ENABLED=true requires X402_SOLANA_PAY_TO');
  }

  let solana: X402SolanaConfig | null = null;
  if (solanaFlagEnabled && solanaPayTo !== '') {
    const solanaNetwork = SolanaNetworkSchema.parse(env.X402_SOLANA_NETWORK ?? SOLANA_DEVNET_CAIP2);
    const solanaPriceUsd = parsePriceUsd(env.X402_SOLANA_PRICE_USD ?? env.X402_PRICE_USD);
    solana = {
      network: solanaNetwork,
      payTo: solanaPayTo,
      usdcMint: SOLANA_NETWORKS[solanaNetwork].usdc,
      amountAtomic: usdToAtomicUnits(solanaPriceUsd),
      priceUsd: solanaPriceUsd,
    };
  }

  const facilitatorUrl = env.X402_FACILITATOR_URL?.trim() || 'https://x402.org/facilitator';

  return {
    enabled: evmEnabled || solana !== null,
    evmEnabled,
    network,
    payTo,
    amountAtomic: usdToAtomicUnits(priceUsd),
    priceUsd,
    facilitatorUrl,
    facilitatorTimeoutMs: 15_000,
    maxTimeoutSeconds: 60,
    facilitatorCdpAuth: parseFacilitatorCdpAuth(env, facilitatorUrl),
    solana,
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

/** EVM USDC contract for the configured EVM network. */
export function usdcForNetwork(network: X402NetworkId): string {
  return SUPPORTED_NETWORKS[network].usdc;
}

/**
 * EIP-712 domain name of the network's USDC token as deployed on-chain
 * (FiatToken EIP712Domain version is "2" on both supported networks, but the
 * name differs: "USDC" on Base Sepolia vs "USD Coin" on Base mainnet).
 */
export function tokenNameForNetwork(network: X402NetworkId): string {
  return SUPPORTED_NETWORKS[network].tokenName;
}

/** Build the network-specific payment options advertised by REST and MCP. */
export function getX402PaymentOptions(
  cfg: X402Config,
  amountOverride?: string
): X402PaymentOption[] {
  const options: X402PaymentOption[] = [];
  const evmEnabled = cfg.evmEnabled ?? (cfg.enabled && cfg.payTo !== '');

  if (evmEnabled && cfg.payTo !== '') {
    options.push({
      family: 'evm',
      network: cfg.network,
      payTo: cfg.payTo,
      asset: usdcForNetwork(cfg.network),
      amountAtomic: amountOverride ?? cfg.amountAtomic,
      tokenName: tokenNameForNetwork(cfg.network),
    });
  }

  if (cfg.solana) {
    options.push({
      family: 'svm',
      network: cfg.solana.network,
      payTo: cfg.solana.payTo,
      asset: cfg.solana.usdcMint,
      amountAtomic: amountOverride ?? cfg.solana.amountAtomic,
    });
  }

  return options;
}

/**
 * Resolve x402 configuration for a request. Returns `enabled: false` when the
 * master switch is off or no network has a configured receiving wallet, in
 * which case the caller falls through to the legacy API-key path.
 */
export function getX402Config(env: NodeJS.ProcessEnv = process.env): X402Config {
  return parseX402Config(env);
}
