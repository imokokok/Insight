import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';
import {
  SOLANA_MAINNET_CAIP2,
  SOLANA_MAINNET_GENESIS_HASH,
} from '@/lib/execution/solanaSimulation';

/** Canonical wrapped SOL mint used by Solana swap programs. */
export const SOLANA_WRAPPED_SOL = 'So11111111111111111111111111111111111111112' as const;
/** Canonical Circle-issued USDC mint on Solana mainnet-beta. */
export const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as const;

const JUPITER_QUOTE_URL = 'https://api.jup.ag/swap/v1/quote';
const MAX_UINT64 = (1n << 64n) - 1n;
const MAX_ROUTE_STEPS = 12;
const MAX_QUOTE_CONTEXT_SLOT_LAG = 300;

type JsonRecord = Record<string, unknown>;

export interface SolanaJupiterRouteProfile {
  id: string;
  network: typeof SOLANA_MAINNET_CAIP2;
  venue: 'jupiter';
  market: string;
  input: { mint: string; symbol: string; decimals: number };
  output: { mint: string; symbol: string; decimals: number };
  /** Exact input values in raw token units, expressed as canonical decimals. */
  quoteAmountsRaw: readonly string[];
  slippageBps: number;
  restrictIntermediateTokens: boolean;
  maxContextSlotLag: number;
  maxSourceAgeSeconds: number;
  cacheTtlMs: number;
}

export interface SolanaJupiterRouteStep {
  ammKey: string;
  label: string;
  inputMint: string;
  outputMint: string;
  inAmountRaw: string;
  outAmountRaw: string;
  percent: number;
}

export interface SolanaJupiterRouteQuote {
  amountInRaw: string;
  amountIn: number;
  amountOutRaw: string;
  amountOut: number;
  effectiveOutputPerInput: number;
  minimumOutRaw: string;
  priceImpactPct: number;
  contextSlot: number;
  route: SolanaJupiterRouteStep[];
}

/**
 * A quote is fresh executable-route context from Jupiter's route engine. It is
 * intentionally not described as a block-pinned pool read or a simulated swap:
 * a caller that needs signing-time certainty must pair it with the existing
 * signed Solana transaction-simulation receipt.
 */
export interface SolanaJupiterRouteSnapshot {
  source: 'dex-route';
  venue: 'jupiter';
  network: typeof SOLANA_MAINNET_CAIP2;
  market: string;
  sourceFreshnessSeconds: number;
  observedAt: string;
  finalizedSlot: number;
  quotes: SolanaJupiterRouteQuote[];
}

export class SolanaJupiterRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolanaJupiterRouteError';
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBase58Address(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 32 &&
    value.length <= 44 &&
    /^[1-9A-HJ-NP-Za-km-z]+$/.test(value)
  );
}

function asRawUint64(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new SolanaJupiterRouteError(`Jupiter returned an invalid ${field}.`);
  }
  const parsed = BigInt(value);
  if (parsed > MAX_UINT64) {
    throw new SolanaJupiterRouteError(`Jupiter returned an out-of-range ${field}.`);
  }
  return value;
}

function asSafeSlot(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new SolanaJupiterRouteError(`Solana RPC returned an invalid ${field}.`);
  }
  return value;
}

function asFiniteNumber(value: unknown, field: string, min: number, max: number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new SolanaJupiterRouteError(`Jupiter returned an invalid ${field}.`);
  }
  return parsed;
}

function rawUnitsToNumber(raw: string, decimals: number, field: string): number {
  const value = Number(BigInt(raw)) / 10 ** decimals;
  if (!Number.isFinite(value) || value <= 0) {
    throw new SolanaJupiterRouteError(`Jupiter returned an out-of-range ${field}.`);
  }
  return value;
}

function httpsEndpoints(): string[] {
  const endpoints = getRpcEndpoints(0) ?? [];
  const valid = endpoints.filter((endpoint) => {
    try {
      return new URL(endpoint).protocol === 'https:';
    } catch {
      return false;
    }
  });
  return [...new Set(valid)];
}

/** The first reviewed Solana route-evidence profile: SOL → USDC. */
export function solanaJupiterSolUsdcProfile(): SolanaJupiterRouteProfile {
  return {
    id: 'solana-jupiter-sol-usdc',
    network: SOLANA_MAINNET_CAIP2,
    venue: 'jupiter',
    market: 'SOL/USDC',
    input: { mint: SOLANA_WRAPPED_SOL, symbol: 'SOL', decimals: 9 },
    output: { mint: SOLANA_USDC, symbol: 'USDC', decimals: 6 },
    quoteAmountsRaw: ['1000000000', '10000000000', '100000000000'],
    slippageBps: 50,
    restrictIntermediateTokens: true,
    maxContextSlotLag: MAX_QUOTE_CONTEXT_SLOT_LAG,
    maxSourceAgeSeconds: 60,
    cacheTtlMs: 5_000,
  };
}

/** Validate the configuration before any external read or route selection. */
export function assertSolanaJupiterRouteProfile(profile: SolanaJupiterRouteProfile): void {
  if (
    !profile.id ||
    !profile.market ||
    profile.network !== SOLANA_MAINNET_CAIP2 ||
    profile.venue !== 'jupiter' ||
    !isBase58Address(profile.input.mint) ||
    !isBase58Address(profile.output.mint) ||
    profile.input.mint === profile.output.mint ||
    !profile.input.symbol ||
    !profile.output.symbol ||
    !Number.isSafeInteger(profile.input.decimals) ||
    !Number.isSafeInteger(profile.output.decimals) ||
    profile.input.decimals < 0 ||
    profile.input.decimals > 18 ||
    profile.output.decimals < 0 ||
    profile.output.decimals > 18 ||
    !Number.isSafeInteger(profile.slippageBps) ||
    profile.slippageBps < 1 ||
    profile.slippageBps > 10_000 ||
    !Number.isSafeInteger(profile.maxContextSlotLag) ||
    profile.maxContextSlotLag < 0 ||
    !Number.isSafeInteger(profile.maxSourceAgeSeconds) ||
    profile.maxSourceAgeSeconds < 1 ||
    !Number.isSafeInteger(profile.cacheTtlMs) ||
    profile.cacheTtlMs < 1 ||
    profile.quoteAmountsRaw.length === 0
  ) {
    throw new SolanaJupiterRouteError('Solana Jupiter route profile has invalid metadata.');
  }

  let prior = 0n;
  for (const amount of profile.quoteAmountsRaw) {
    const normalized = asRawUint64(amount, 'quote amount');
    const parsed = BigInt(normalized);
    if (parsed === 0n || parsed <= prior) {
      throw new SolanaJupiterRouteError(
        'Solana Jupiter route profile has an unordered quote ladder.'
      );
    }
    prior = parsed;
  }
}

async function rpcResult(
  endpoints: readonly string[],
  method: string,
  params: unknown[],
  fetcher: typeof fetch,
  signal?: AbortSignal
): Promise<unknown> {
  for (const endpoint of endpoints) {
    const timeout = new AbortController();
    const timeoutId = setTimeout(() => timeout.abort(), 8_000);
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal,
      });
      if (!response.ok) continue;
      const body: unknown = await response.json();
      if (isRecord(body) && 'result' in body && body.error === undefined) return body.result;
    } catch {
      // Independent public endpoints are tried without exposing their URL or errors.
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw new SolanaJupiterRouteError(`Solana RPC ${method} is unavailable.`);
}

async function verifiedFinalizedSlot(
  endpoints: readonly string[],
  fetcher: typeof fetch,
  signal?: AbortSignal
): Promise<number> {
  const genesis = await rpcResult(endpoints, 'getGenesisHash', [], fetcher, signal);
  if (genesis !== SOLANA_MAINNET_GENESIS_HASH) {
    throw new SolanaJupiterRouteError('Solana RPC is not connected to mainnet-beta.');
  }
  return asSafeSlot(
    await rpcResult(endpoints, 'getSlot', [{ commitment: 'finalized' }], fetcher, signal),
    'finalized slot'
  );
}

function routeSteps(value: unknown, profile: SolanaJupiterRouteProfile): SolanaJupiterRouteStep[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ROUTE_STEPS) {
    throw new SolanaJupiterRouteError('Jupiter returned an invalid route plan.');
  }
  return value.map((entry, index) => {
    if (!isRecord(entry) || !isRecord(entry.swapInfo)) {
      throw new SolanaJupiterRouteError('Jupiter returned an invalid route step.');
    }
    const info = entry.swapInfo;
    const percent = entry.percent;
    if (
      !isBase58Address(info.ammKey) ||
      typeof info.label !== 'string' ||
      info.label.length === 0 ||
      info.label.length > 80 ||
      !isBase58Address(info.inputMint) ||
      !isBase58Address(info.outputMint) ||
      typeof percent !== 'number' ||
      !Number.isSafeInteger(percent) ||
      percent < 1 ||
      percent > 100
    ) {
      throw new SolanaJupiterRouteError('Jupiter returned an invalid route step.');
    }
    const inputMint = info.inputMint;
    const outputMint = info.outputMint;
    if (
      (index === 0 && inputMint !== profile.input.mint) ||
      (index === value.length - 1 && outputMint !== profile.output.mint)
    ) {
      throw new SolanaJupiterRouteError(
        'Jupiter route endpoints do not match the reviewed market.'
      );
    }
    const inAmountRaw = asRawUint64(info.inAmount, 'route input amount');
    const outAmountRaw = asRawUint64(info.outAmount, 'route output amount');
    if (BigInt(inAmountRaw) === 0n || BigInt(outAmountRaw) === 0n) {
      throw new SolanaJupiterRouteError('Jupiter returned an empty route step.');
    }
    return {
      ammKey: info.ammKey,
      label: info.label,
      inputMint,
      outputMint,
      inAmountRaw,
      outAmountRaw,
      percent,
    };
  });
}

async function fetchQuote(
  profile: SolanaJupiterRouteProfile,
  amountInRaw: string,
  apiKey: string,
  fetcher: typeof fetch,
  signal?: AbortSignal
): Promise<SolanaJupiterRouteQuote> {
  const url = new URL(JUPITER_QUOTE_URL);
  url.search = new URLSearchParams({
    inputMint: profile.input.mint,
    outputMint: profile.output.mint,
    amount: amountInRaw,
    slippageBps: String(profile.slippageBps),
    restrictIntermediateTokens: String(profile.restrictIntermediateTokens),
    instructionVersion: 'V2',
  }).toString();

  let response: Response;
  try {
    response = await fetcher(url, { headers: { 'x-api-key': apiKey }, signal });
  } catch {
    throw new SolanaJupiterRouteError('Jupiter route quote is unavailable.');
  }
  if (!response.ok) throw new SolanaJupiterRouteError('Jupiter route quote is unavailable.');
  const body: unknown = await response.json();
  if (!isRecord(body)) throw new SolanaJupiterRouteError('Jupiter returned an invalid quote.');
  if (
    body.inputMint !== profile.input.mint ||
    body.outputMint !== profile.output.mint ||
    asRawUint64(body.inAmount, 'input amount') !== amountInRaw ||
    body.swapMode !== 'ExactIn' ||
    body.slippageBps !== profile.slippageBps
  ) {
    throw new SolanaJupiterRouteError('Jupiter quote does not match the reviewed request.');
  }
  const outAmountRaw = asRawUint64(body.outAmount, 'output amount');
  const minimumOutRaw = asRawUint64(body.otherAmountThreshold, 'minimum output amount');
  if (
    BigInt(outAmountRaw) === 0n ||
    BigInt(minimumOutRaw) === 0n ||
    BigInt(minimumOutRaw) > BigInt(outAmountRaw)
  ) {
    throw new SolanaJupiterRouteError('Jupiter returned an invalid output amount.');
  }
  const amountIn = rawUnitsToNumber(amountInRaw, profile.input.decimals, 'input amount');
  const amountOut = rawUnitsToNumber(outAmountRaw, profile.output.decimals, 'output amount');
  return {
    amountInRaw,
    amountIn,
    amountOutRaw: outAmountRaw,
    amountOut,
    effectiveOutputPerInput: amountOut / amountIn,
    minimumOutRaw,
    priceImpactPct: asFiniteNumber(body.priceImpactPct, 'price impact', 0, 100),
    contextSlot: asSafeSlot(body.contextSlot, 'quote context slot'),
    route: routeSteps(body.routePlan, profile),
  };
}

const cachedSnapshots = new Map<string, { expiresAt: number; value: SolanaJupiterRouteSnapshot }>();
const inFlightSnapshots = new Map<string, Promise<SolanaJupiterRouteSnapshot>>();

/** Test hook for the short per-profile route-quote cache. */
export function resetSolanaJupiterRouteCacheForTests(profileId?: string): void {
  if (profileId) {
    cachedSnapshots.delete(profileId);
    inFlightSnapshots.delete(profileId);
    return;
  }
  cachedSnapshots.clear();
  inFlightSnapshots.clear();
}

/**
 * Fetch an authenticated Jupiter exact-input route ladder and bind it to a
 * verified Solana mainnet RPC witness. It does not execute or simulate a swap.
 */
export async function getSolanaJupiterRouteSnapshot(
  profile: SolanaJupiterRouteProfile = solanaJupiterSolUsdcProfile(),
  options: {
    apiKey?: string;
    endpoints?: readonly string[];
    fetcher?: typeof fetch;
    nowMs?: number;
    signal?: AbortSignal;
  } = {}
): Promise<SolanaJupiterRouteSnapshot> {
  assertSolanaJupiterRouteProfile(profile);
  const nowMs = options.nowMs ?? Date.now();
  const apiKey = (options.apiKey ?? process.env.JUPITER_API_KEY)?.trim();
  if (!apiKey || apiKey.trim().length === 0) {
    throw new SolanaJupiterRouteError('Jupiter route evidence is not configured.');
  }
  const endpoints = options.endpoints ?? httpsEndpoints();
  if (endpoints.length === 0) {
    throw new SolanaJupiterRouteError('No Solana mainnet RPC endpoint is configured.');
  }
  const useCache =
    options.fetcher === undefined &&
    options.endpoints === undefined &&
    options.apiKey === undefined;
  if (useCache) {
    const cached = cachedSnapshots.get(profile.id);
    if (cached && cached.expiresAt > nowMs) return cached.value;
    const inFlight = inFlightSnapshots.get(profile.id);
    if (inFlight) return inFlight;
  }

  const request = (async (): Promise<SolanaJupiterRouteSnapshot> => {
    const fetcher = options.fetcher ?? fetch;
    const finalizedSlot = await verifiedFinalizedSlot(endpoints, fetcher, options.signal);
    const quotes = await Promise.all(
      profile.quoteAmountsRaw.map((amount) =>
        fetchQuote(profile, amount, apiKey, fetcher, options.signal)
      )
    );
    for (const quote of quotes) {
      if (quote.contextSlot + profile.maxContextSlotLag < finalizedSlot) {
        throw new SolanaJupiterRouteError(
          'Jupiter quote context is too far behind finalized Solana state.'
        );
      }
    }
    const observedAtMs = Math.max(nowMs, Date.now());
    const sourceFreshnessSeconds = Math.max(0, (observedAtMs - nowMs) / 1_000);
    if (sourceFreshnessSeconds > profile.maxSourceAgeSeconds) {
      throw new SolanaJupiterRouteError('Jupiter route evidence exceeded its freshness limit.');
    }
    return {
      source: 'dex-route',
      venue: 'jupiter',
      network: profile.network,
      market: profile.market,
      sourceFreshnessSeconds,
      observedAt: new Date(observedAtMs).toISOString(),
      finalizedSlot,
      quotes,
    };
  })();
  if (useCache) inFlightSnapshots.set(profile.id, request);
  try {
    const value = await request;
    if (useCache) cachedSnapshots.set(profile.id, { value, expiresAt: nowMs + profile.cacheTtlMs });
    return value;
  } finally {
    if (useCache) inFlightSnapshots.delete(profile.id);
  }
}
