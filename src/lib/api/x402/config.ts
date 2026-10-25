import { z } from 'zod';

import { isSolanaPublicKey } from './solanaEncoding';

/**
 * x402 keyless paid-tier configuration for the pre-trade safety check.
 *
 * Design rules (see ~/.workbuddy/insight-x402/x402-pretrade-plan.md):
 * - The master switch (`X402_ENABLED`) must be exactly "true". EVM payment is
 *   enabled with a valid default `X402_PAY_TO` or explicit
 *   `X402_EVM_PAY_TOS` entries, unless `X402_EVM_ENABLED` is exactly "false".
 *   `X402_EVM_NETWORKS` selects advertised EVM networks and defaults to
 *   `X402_NETWORK`. Solana is an independent opt-in that also requires
 *   `X402_SOLANA_PAY_TO`.
 * - The receiving address lives in server-side env only. It is NEVER read from
 *   request parameters, so a caller cannot redirect a 402 quote to another
 *   wallet.
 * - Prices are expressed in US dollars and converted to USDC atomic units
 *   (6 decimals) at config-parse time, so the wire always carries a
 *   deterministic integer amount.
 */

/** EVM networks with a USDC-class settlement asset reachable by a registered facilitator. */
export const X402_EVM_NETWORK_IDS = [
  'eip155:84532', // Base Sepolia
  'eip155:8453', // Base
  'eip155:1', // Ethereum
  'eip155:10', // OP Mainnet
  'eip155:42161', // Arbitrum One
  'eip155:137', // Polygon PoS
  'eip155:43114', // Avalanche C-Chain
  'eip155:1329', // Sei
  'eip155:196', // X Layer
  'eip155:143', // Monad
  'eip155:56', // BNB Smart Chain (AEON facilitator; bridged USDC, 18 decimals)
] as const;

export type X402NetworkId = (typeof X402_EVM_NETWORK_IDS)[number];

/** Native USDC contract and EIP-712 domain name for each supported EVM network. */
const SUPPORTED_NETWORKS: Record<
  X402NetworkId,
  {
    usdc: string;
    tokenName?: string;
    decimals?: number;
    eip3009?: boolean;
    /** Opt-in additional settlement assets sharing the network's decimals and facilitator flow. */
    extraAssets?: readonly { symbol: string; address: string; tokenName?: string }[];
  }
> = {
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
  'eip155:1': {
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    tokenName: 'USD Coin',
  },
  'eip155:10': {
    usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    tokenName: 'USD Coin',
  },
  'eip155:42161': {
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    tokenName: 'USD Coin',
  },
  'eip155:137': {
    usdc: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    tokenName: 'USD Coin',
  },
  'eip155:43114': {
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    tokenName: 'USD Coin',
  },
  'eip155:1329': {
    usdc: '0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392',
    tokenName: 'USD Coin',
  },
  'eip155:196': {
    usdc: '0xB6CEceAB302E2E4948951eE7843FC24E92933061',
    tokenName: 'USD Coin',
  },
  'eip155:143': {
    /** Chain: Monad mainnet. Circle native USDC (Circle blog, 2025-11-24). */
    usdc: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
    /**
     * On-chain name() = "USDC" (verified via eth_call 2026-10-16 against
     * rpc.monad.xyz), NOT "USD Coin" — same trap as Base Sepolia. version()
     * is "2" and DOMAIN_SEPARATOR matches { name: "USDC", version: "2" },
     * consistent with the @x402/evm >= 2.22 built-in Monad asset config.
     */
    tokenName: 'USDC',
  },
  'eip155:56': {
    /** Chain: BNB Smart Chain. Binance-bridged USDC (18 decimals), the token listed by the AEON x402 facilitator (facilitator.aeon.xyz /supported, kind exact v2 on eip155:56, verified 2026-10-17). */
    usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    /**
     * The bridged token itself exposes no EIP-712 domain (no DOMAIN_SEPARATOR
     * on-chain), but the AEON facilitator's non-EIP-3009 mandate flow signs a
     * TransferWithAuthorization-shaped message against the domain carried in
     * the quote `extra` and verifies it facilitator-side (spender
     * 0x555e3311a9893c9B17444C1Ff0d88192a57Ef13e after a client-side approve).
     * Name/version below are the AEON stack's canonical values for BSC USDC
     * (asset registry in @aeon-ai-pay/evm).
     */
    tokenName: 'USD Coin',
    decimals: 18,
    /** No on-chain EIP-3009; settlement is the AEON facilitator mandate flow. */
    eip3009: false,
    /**
     * USDT (Binance-Peg, 18 decimals) is in the AEON asset registry for chain
     * 56 (TokenSymbolUtil, @aeon-ai-pay/evm 2.1.4) and settles through the same
     * mandate flow as USDC. Emitted as a second challenge option only when
     * X402_BNB_ASSETS lists `usdt`. USD1/United Stables are NOT listed here:
     * they have on-chain EIP-3009 but are absent from the AEON registry, so a
     * challenge advertising them today could not be verified or settled.
     */
    extraAssets: [
      {
        symbol: 'USDT',
        address: '0x55d398326f99059fF775485246999027B3197955',
        tokenName: 'Tether USD',
      },
    ],
  },
};

export const SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;
export const SOLANA_DEVNET_CAIP2 = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1' as const;

export type X402SolanaNetworkId = typeof SOLANA_MAINNET_CAIP2 | typeof SOLANA_DEVNET_CAIP2;

/** Any network that can appear in an x402 `accepts[]` payment option. */
export type X402PaymentNetworkId = X402NetworkId | X402SolanaNetworkId;

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

const NetworkSchema = z.enum(X402_EVM_NETWORK_IDS);
const SolanaNetworkSchema = z.enum([SOLANA_DEVNET_CAIP2, SOLANA_MAINNET_CAIP2]);
const PaymentNetworkSchema = z.union([NetworkSchema, SolanaNetworkSchema]);

const USDC_DECIMALS = 6;

/**
 * Settlement assets selectable for the BNB Smart Chain challenge. `usdc` is
 * the default; `usdt` is opt-in via X402_BNB_ASSETS and shares the AEON
 * mandate flow (both assets are 18-decimal Binance-Peg tokens).
 */
export type X402BnbAsset = 'usdc' | 'usdt';

const BNB_ASSET_CATALOG: readonly X402BnbAsset[] = ['usdc', 'usdt'];

function parseBnbAssets(raw: string | undefined): X402BnbAsset[] {
  if (raw === undefined || raw.trim() === '') return ['usdc'];

  const values = raw.split(',').map((value) => value.trim().toLowerCase());
  if (values.some((value) => value === '')) {
    throw new Error('X402_BNB_ASSETS must be a comma-separated list without empty entries');
  }
  const invalid = values.filter((value) => !BNB_ASSET_CATALOG.includes(value as X402BnbAsset));
  if (invalid.length > 0) {
    throw new Error(
      `X402_BNB_ASSETS has unsupported assets: ${invalid.join(', ')} (supported: ${BNB_ASSET_CATALOG.join(', ')})`
    );
  }
  const unique = [...new Set(values)] as X402BnbAsset[];
  // `usdc` stays first so the primary challenge option is deterministic.
  return ['usdc', ...unique.filter((value) => value !== 'usdc')];
}

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
  /** EVM networks advertised by x402; MPP continues to use `network`. */
  evmNetworks?: X402NetworkId[];
  /** Default EVM recipient, retained for backwards-compatible single-wallet deployments. */
  payTo: string;
  /**
   * Optional EVM-recipient overrides parsed from `X402_EVM_PAY_TOS`.
   * Entries take precedence over `payTo`, allowing per-chain treasury and
   * incident isolation without changing the public payment protocol.
   */
  evmPayTos?: Partial<Record<X402NetworkId, string>>;
  /** USDC atomic units (6 decimals) charged per successful check. */
  amountAtomic: string;
  /** Human-readable USD price for docs/telemetry. */
  priceUsd: number;
  facilitatorUrl: string;
  /**
   * Per-network facilitator overrides parsed from X402_FACILITATOR_URLS
   * (comma-separated "network=url" pairs, e.g.
   * "eip155:143=https://x402-facilitator.molandak.org"). Networks not listed
   * fall back to `facilitatorUrl`. Needed when the primary facilitator (e.g.
   * CDP) does not support every advertised network (e.g. Monad mainnet is
   * served by the Monad x402 facilitator instead). SVM networks are included
   * so Solana can be moved independently of EVM rails.
   */
  facilitatorUrls: Partial<Record<X402PaymentNetworkId, string>>;
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
  /** Optional static Bearer credential for the default facilitator URL. */
  facilitatorBearerToken?: string | null;
  /** Optional static Bearer credential overrides keyed by payment network. */
  facilitatorBearerTokens?: Partial<Record<X402PaymentNetworkId, string>>;
  /** Optional, independently opted-in Solana x402 option. */
  solana?: X402SolanaConfig | null;
  /**
   * Settlement assets advertised for BNB Smart Chain (default `['usdc']`).
   * Parsed from X402_BNB_ASSETS; `usdc` is always first so the primary
   * challenge option is deterministic. Optional so hand-built configs
   * (tests) default to USDC.
   */
  bnbAssets?: X402BnbAsset[];
}

function parseEvmPayTos(raw: string | undefined): Partial<Record<X402NetworkId, string>> {
  if (raw === undefined || raw.trim() === '') return {};

  const payTos: Partial<Record<X402NetworkId, string>> = {};
  for (const pair of raw.split(',')) {
    const trimmed = pair.trim();
    if (trimmed === '') {
      throw new Error('X402_EVM_PAY_TOS must not contain empty entries');
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0 || eq === trimmed.length - 1) {
      throw new Error(
        'X402_EVM_PAY_TOS entries must be "network=0xRecipient" pairs separated by commas'
      );
    }
    const network = NetworkSchema.parse(trimmed.slice(0, eq).trim());
    const payTo = PayToSchema.parse(trimmed.slice(eq + 1).trim());
    if (payTos[network]) {
      throw new Error(`X402_EVM_PAY_TOS has a duplicate entry for ${network}`);
    }
    payTos[network] = payTo;
  }
  return payTos;
}

function parseFacilitatorUrls(
  raw: string | undefined
): Partial<Record<X402PaymentNetworkId, string>> {
  if (raw === undefined || raw.trim() === '') return {};

  const urls: Partial<Record<X402PaymentNetworkId, string>> = {};
  for (const pair of raw.split(',')) {
    const trimmed = pair.trim();
    if (trimmed === '') {
      throw new Error('X402_FACILITATOR_URLS must not contain empty entries');
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0 || eq === trimmed.length - 1) {
      throw new Error(
        'X402_FACILITATOR_URLS entries must be "network=url" pairs separated by commas'
      );
    }
    const network = PaymentNetworkSchema.parse(trimmed.slice(0, eq).trim());
    const url = trimmed.slice(eq + 1).trim();
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        throw new Error('not https');
      }
    } catch {
      throw new Error(`X402_FACILITATOR_URLS entry for ${network} is not a valid https URL`);
    }
    if (urls[network]) {
      throw new Error(`X402_FACILITATOR_URLS has a duplicate entry for ${network}`);
    }
    urls[network] = url;
  }
  return urls;
}

/**
 * Parse a server-side opaque Bearer credential. Authorization header injection
 * is rejected at the configuration boundary; the returned value never carries
 * a `Bearer ` prefix so every caller emits a single canonical header.
 */
function parseBearerToken(raw: string | undefined, name: string): string | null {
  const supplied = raw?.trim() ?? '';
  if (supplied === '') return null;

  const token = supplied.replace(/^Bearer[ \t]+/i, '');
  if (token === '' || /\s/.test(token)) {
    throw new Error(`${name} must be one opaque Bearer token without whitespace`);
  }
  return token;
}

/**
 * Parse per-network static facilitator credentials without ever logging their
 * values. Split only on the first '=': opaque tokens may themselves end in
 * base64 padding.
 */
function parseFacilitatorBearerTokens(
  raw: string | undefined
): Partial<Record<X402PaymentNetworkId, string>> {
  if (raw === undefined || raw.trim() === '') return {};

  const tokens: Partial<Record<X402PaymentNetworkId, string>> = {};
  for (const pair of raw.split(',')) {
    const trimmed = pair.trim();
    if (trimmed === '') {
      throw new Error('X402_FACILITATOR_BEARER_TOKENS must not contain empty entries');
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0 || eq === trimmed.length - 1) {
      throw new Error(
        'X402_FACILITATOR_BEARER_TOKENS entries must be "network=token" pairs separated by commas'
      );
    }
    const network = PaymentNetworkSchema.parse(trimmed.slice(0, eq).trim());
    const token = parseBearerToken(
      trimmed.slice(eq + 1),
      `X402_FACILITATOR_BEARER_TOKENS entry for ${network}`
    );
    if (token === null) {
      throw new Error(`X402_FACILITATOR_BEARER_TOKENS entry for ${network} has no token`);
    }
    if (tokens[network]) {
      throw new Error(`X402_FACILITATOR_BEARER_TOKENS has a duplicate entry for ${network}`);
    }
    tokens[network] = token;
  }
  return tokens;
}

function parsePriceUsd(raw: string | undefined): number {
  const parsed = Number.parseFloat(raw ?? '0.02');
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('X402_PRICE_USD must be a positive number');
  }
  return parsed;
}

function parseEvmNetworks(raw: string | undefined, defaultNetwork: X402NetworkId): X402NetworkId[] {
  if (raw === undefined || raw.trim() === '') return [defaultNetwork];

  const values = raw.split(',').map((value) => value.trim());
  if (values.some((value) => value === '')) {
    throw new Error('X402_EVM_NETWORKS must be a comma-separated list without empty entries');
  }

  const networks = z.array(NetworkSchema).min(1).parse(values);
  if (new Set(networks).size !== networks.length) {
    throw new Error('X402_EVM_NETWORKS must not contain duplicate networks');
  }
  return networks;
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
const DAYDREAMS_FACILITATOR_HOST = 'facilitator.daydreams.systems';

/** True only for the CDP facilitator host, never for a lookalike URL. */
export function isCdpFacilitatorUrl(url: string): boolean {
  try {
    return new URL(url).host === CDP_FACILITATOR_HOST;
  } catch {
    return false;
  }
}

/** True only for the production Daydreams facilitator host. */
export function isDaydreamsFacilitatorUrl(url: string): boolean {
  try {
    return new URL(url).host === DAYDREAMS_FACILITATOR_HOST;
  } catch {
    return false;
  }
}

function parseFacilitatorCdpAuth(
  env: NodeJS.ProcessEnv,
  facilitatorUrls: readonly string[]
): { apiKeyId: string; apiKeySecret: string } | null {
  const apiKeyId = env.X402_CDP_API_KEY_ID?.trim() ?? '';
  const apiKeySecret = env.X402_CDP_API_KEY_SECRET?.trim() ?? '';

  if ((apiKeyId === '') !== (apiKeySecret === '')) {
    throw new Error(
      'X402_CDP_API_KEY_ID and X402_CDP_API_KEY_SECRET must be set together ' +
        '(CDP Secret API key from portal.cdp.coinbase.com)'
    );
  }

  const usesCdp = facilitatorUrls.some(isCdpFacilitatorUrl);

  if (usesCdp && apiKeyId === '') {
    throw new Error(
      'a configured x402 facilitator points at CDP but X402_CDP_API_KEY_ID/' +
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
  const evmNetworks = parseEvmNetworks(env.X402_EVM_NETWORKS, network);
  const priceUsd = parsePriceUsd(env.X402_PRICE_USD);

  const rawPayTo = env.X402_PAY_TO?.trim() ?? '';
  const payTo = rawPayTo === '' ? '' : PayToSchema.parse(rawPayTo);
  const evmPayTos = parseEvmPayTos(env.X402_EVM_PAY_TOS);

  const flagEnabled = env.X402_ENABLED === 'true';
  const hasEvmRecipient = payTo !== '' || Object.keys(evmPayTos).length > 0;
  const evmEnabled = flagEnabled && env.X402_EVM_ENABLED !== 'false' && hasEvmRecipient;
  if (evmEnabled) {
    const missingRecipients = evmNetworks.filter(
      (networkId) => (evmPayTos[networkId] ?? payTo) === ''
    );
    if (missingRecipients.length > 0) {
      throw new Error(
        `enabled EVM x402 networks have no recipient: ${missingRecipients.join(', ')}. ` +
          'Set X402_PAY_TO or add entries to X402_EVM_PAY_TOS.'
      );
    }
  }

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
  const facilitatorUrls = parseFacilitatorUrls(env.X402_FACILITATOR_URLS);
  const facilitatorBearerToken = parseBearerToken(
    env.X402_FACILITATOR_BEARER_TOKEN,
    'X402_FACILITATOR_BEARER_TOKEN'
  );
  const facilitatorBearerTokens = parseFacilitatorBearerTokens(env.X402_FACILITATOR_BEARER_TOKENS);
  const bnbAssets = parseBnbAssets(env.X402_BNB_ASSETS);

  // Daydreams exposes /supported publicly but requires a server Bearer token
  // for the payment path. Fail before advertising a Solana option that could
  // only fail after a buyer signs a payment.
  const activeNetworks: X402PaymentNetworkId[] = [
    ...(evmEnabled ? evmNetworks : []),
    ...(solana ? [solana.network] : []),
  ];
  for (const activeNetwork of activeNetworks) {
    const activeUrl = facilitatorUrls[activeNetwork] ?? facilitatorUrl;
    const token = facilitatorBearerTokens[activeNetwork] ?? facilitatorBearerToken;
    if (isDaydreamsFacilitatorUrl(activeUrl) && token === null) {
      throw new Error(
        `Daydreams facilitator for ${activeNetwork} requires X402_FACILITATOR_BEARER_TOKEN ` +
          `or X402_FACILITATOR_BEARER_TOKENS entry for that network`
      );
    }
  }

  return {
    enabled: evmEnabled || solana !== null,
    evmEnabled,
    network,
    evmNetworks,
    payTo,
    evmPayTos,
    amountAtomic: usdToAtomicUnits(priceUsd),
    priceUsd,
    facilitatorUrl,
    facilitatorUrls,
    facilitatorBearerToken,
    facilitatorBearerTokens,
    facilitatorTimeoutMs: 15_000,
    maxTimeoutSeconds: 60,
    facilitatorCdpAuth: parseFacilitatorCdpAuth(env, [
      facilitatorUrl,
      ...Object.values(facilitatorUrls),
    ]),
    solana,
    bnbAssets,
  };
}

/** The v1 route this paid tier protects; used as the x402 route pattern. */
export const X402_PRE_TRADE_ROUTE = '/api/v1/safety/pre-trade';

/**
 * Chain-neutral action gate. It accepts the same validated evidence inputs as
 * pre-trade and is priced identically; the response is the compact
 * ALLOW/CAUTION/BLOCK decision contract used by agents.
 */
export const X402_EXECUTION_PREFLIGHT_ROUTE = '/api/v1/safety/preflight';

/** Base-only lending decision gate. The caller receives no transaction authority. */
export const X402_BASE_LENDING_GUARD_ROUTE = '/api/v1/safety/base-lending-guard';

/** Monad lending decision gate; payment settlement remains configured separately. */
export const X402_MONAD_LENDING_GUARD_ROUTE = '/api/v1/safety/monad-lending-guard';

/** A two-gate same-chain swap lifecycle with one post-settlement receipt credit. */
export const X402_SWAP_INTENT_ROUTE = '/api/v1/safety/swap-intent';

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
 * Undefined on networks whose settlement token has no EIP-712 domain at all
 * (BNB Smart Chain's bridged USDC), where the quote must not carry an
 * `extra: { name, version }` hint and payment goes through the network's
 * facilitator-specific authorization flow.
 */
export function tokenNameForNetwork(network: X402NetworkId): string | undefined {
  return SUPPORTED_NETWORKS[network].tokenName;
}

/** Resolve the configured EVM recipient for one payment network. */
export function payToForEvmNetwork(cfg: X402Config, network: X402NetworkId): string {
  return cfg.evmPayTos?.[network] ?? cfg.payTo;
}

/** Resolve the configured facilitator for any EVM or Solana payment network. */
export function facilitatorUrlForNetwork(cfg: X402Config, network: X402PaymentNetworkId): string {
  return cfg.facilitatorUrls?.[network] ?? cfg.facilitatorUrl;
}

/** Resolve a static server-side Bearer credential for a payment network. */
export function facilitatorBearerTokenForNetwork(
  cfg: X402Config,
  network: X402PaymentNetworkId
): string | null {
  return cfg.facilitatorBearerTokens?.[network] ?? cfg.facilitatorBearerToken ?? null;
}

/**
 * Like tokenNameForNetwork but requires an EIP-712 domain name. MPP payments
 * build an EIP-3009 authorization against this domain, which only exists on
 * Circle FiatToken deployments; callers on a network without one (BNB Smart
 * Chain) must route through that network's facilitator flow instead.
 */
export function eip3009TokenNameForNetwork(network: X402NetworkId): string {
  const entry = SUPPORTED_NETWORKS[network];
  if (entry.tokenName === undefined || entry.eip3009 === false) {
    throw new Error(
      `network ${network} has no EIP-3009 settlement token; EIP-712 authorization is unavailable`
    );
  }
  return entry.tokenName;
}

/** Token decimals of the network's settlement asset (Circle USDC default: 6). */
export function tokenDecimalsForNetwork(network: X402NetworkId): number {
  return SUPPORTED_NETWORKS[network].decimals ?? USDC_DECIMALS;
}

/**
 * Convert a 6-decimal micro-USDC amount (the canonical internal grid) into the
 * settlement token's atomic units for the given network. On 18-decimal tokens
 * (BNB Smart Chain) the micro amount is shifted by 12 places; integer math
 * keeps this lossless.
 */
export function atomicUnitsForNetwork(network: X402NetworkId, microUsdAtomic: string): string {
  const decimals = tokenDecimalsForNetwork(network);
  if (decimals === USDC_DECIMALS) return microUsdAtomic;
  const shift = BigInt(decimals - USDC_DECIMALS);
  return (BigInt(microUsdAtomic) * 10n ** shift).toString();
}

/** Build the network-specific payment options advertised by REST and MCP. */
export function getX402PaymentOptions(
  cfg: X402Config,
  amountOverride?: string
): X402PaymentOption[] {
  const options: X402PaymentOption[] = [];
  const evmEnabled =
    cfg.evmEnabled ??
    (cfg.enabled && (cfg.payTo !== '' || Object.keys(cfg.evmPayTos ?? {}).length > 0));

  if (evmEnabled) {
    for (const network of cfg.evmNetworks?.length ? cfg.evmNetworks : [cfg.network]) {
      const microAtomic = amountOverride ?? cfg.amountAtomic;
      const payTo = payToForEvmNetwork(cfg, network);
      options.push({
        family: 'evm',
        network,
        payTo,
        asset: usdcForNetwork(network),
        amountAtomic: atomicUnitsForNetwork(network, microAtomic),
        tokenName: tokenNameForNetwork(network),
      });
      // Opt-in additional assets (BNB USDT today) share the network's
      // decimals, pay-to and facilitator flow, so only the asset identity
      // and EIP-712 domain name differ.
      const bnbAssets = cfg.bnbAssets ?? (['usdc'] as X402BnbAsset[]);
      for (const extra of SUPPORTED_NETWORKS[network].extraAssets ?? []) {
        if (!bnbAssets.includes(extra.symbol.toLowerCase() as X402BnbAsset)) continue;
        options.push({
          family: 'evm',
          network,
          payTo,
          asset: extra.address,
          amountAtomic: atomicUnitsForNetwork(network, microAtomic),
          tokenName: extra.tokenName,
        });
      }
    }
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
