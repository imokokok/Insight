/**
 * Jupiter spot-swap execution adapter for Solana mainnet.
 *
 * This module turns a caller's exact-input swap request into a *signable*
 * Jupiter transaction. It is deliberately separate from every settlement or
 * custody path: Insight never signs or submits the returned transaction, and
 * the caller must review the route summary and bind a risk decision before
 * asking the user to sign.
 *
 * Failure semantics are split into exactly three classes so callers never
 * display an unsupported request as a generic upstream failure:
 *   - `UPSTREAM_UNAVAILABLE` — RPC/Jupiter unreachable, timed out, or misconfigured.
 *   - `MARKET_NOT_FOUND`     — the mint or traded pair does not exist / has no route.
 *   - `UNSUPPORTED`          — the request shape is outside this reviewed adapter.
 */

import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';
import {
  SOLANA_MAINNET_CAIP2,
  SOLANA_MAINNET_GENESIS_HASH,
} from '@/lib/execution/solanaSimulation';

export const SOLANA_JUPITER_SWAP_VENUE = 'jupiter' as const;
export const SOLANA_JUPITER_SWAP_SCHEMA = 'insight.solana-jupiter-swap.v1' as const;

const JUPITER_QUOTE_URL = 'https://api.jup.ag/swap/v1/quote';
const JUPITER_SWAP_URL = 'https://api.jup.ag/swap/v1/swap';

const MAX_UINT64 = (1n << 64n) - 1n;
const MAX_ROUTE_STEPS = 12;
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_QUOTE_TTL_SECONDS = 30;
const MAX_QUOTE_TTL_SECONDS = 120;
const DEFAULT_MAX_SLIPPAGE_BPS = 300;
const MAX_CONTEXT_SLOT_LAG = 300;
const BASE58_DATA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;

export type SolanaJupiterSwapErrorCode =
  | 'UPSTREAM_UNAVAILABLE'
  | 'MARKET_NOT_FOUND'
  | 'UNSUPPORTED';

export class SolanaJupiterSwapError extends Error {
  readonly code: SolanaJupiterSwapErrorCode;
  readonly detail: string | null;

  constructor(code: SolanaJupiterSwapErrorCode, message: string, detail: string | null = null) {
    super(message);
    this.name = 'SolanaJupiterSwapError';
    this.code = code;
    this.detail = detail;
  }

  /** Only upstream failures are worth retrying without changing the request. */
  get retryable(): boolean {
    return this.code === 'UPSTREAM_UNAVAILABLE';
  }
}

export type SolanaJupiterRiskVerdict = 'ALLOW' | 'CAUTION' | 'DANGER' | 'BLOCK' | 'PASS';

/**
 * The caller's risk decision is carried through as a reference. The adapter
 * does not re-implement any guard rule; it only refuses to build a transaction
 * when the referenced decision is blocking.
 */
export interface SolanaJupiterSwapRiskVerdictRef {
  /** Originating surface, e.g. `solana_swap_guard` or `check_trade_safety`. */
  source: string;
  schema?: string;
  verdict: SolanaJupiterRiskVerdict;
  evaluatedAt?: string;
  reasons?: readonly string[];
}

export interface SolanaJupiterSwapRequest {
  /** Token sold. */
  inputMint: string;
  /** Token bought. */
  outputMint: string;
  /** Exact input amount as a decimal string in input-token units. */
  amount: string;
  /** Requested slippage, in basis points. */
  slippageBps: number;
  /** Fee payer and token-owner public key that will sign the returned transaction. */
  userPublicKey: string;
  /** Only exact-input is reviewed; omitted defaults to `exact-in`. */
  direction?: 'exact-in' | 'exact-out';
  /** Hard caller ceiling; the request is rejected when `slippageBps` exceeds it. */
  maxSlippageBps?: number;
  /** Quote freshness window handed to the caller; defaults to 30 seconds. */
  quoteTtlSeconds?: number;
  riskVerdict?: SolanaJupiterSwapRiskVerdictRef;
}

export interface SolanaJupiterSwapRouteStep {
  ammKey: string;
  label: string;
  inputMint: string;
  outputMint: string;
  inAmountRaw: string;
  outAmountRaw: string;
  percent: number;
}

export interface SolanaJupiterSwapQuote {
  inputMint: string;
  outputMint: string;
  inputDecimals: number;
  outputDecimals: number;
  amountInRaw: string;
  amountIn: number;
  amountOutRaw: string;
  amountOut: number;
  minimumOutRaw: string;
  priceImpactPct: number;
  slippageBps: number;
  contextSlot: number;
  route: SolanaJupiterSwapRouteStep[];
  quotedAt: string;
  expiresAt: string;
  validitySeconds: number;
}

export interface SolanaJupiterSwapTransaction {
  /** Base64-encoded versioned transaction returned by Jupiter; not signed. */
  base64: string;
  lastValidBlockHeight: number;
  signatureRequired: 'user';
  wrapAndUnwrapSol: true;
}

export interface SolanaJupiterSwapResult {
  schema: typeof SOLANA_JUPITER_SWAP_SCHEMA;
  venue: typeof SOLANA_JUPITER_SWAP_VENUE;
  network: typeof SOLANA_MAINNET_CAIP2;
  /** Project-internal chain id: 0 is Solana (see src/lib/attestations/caip19.ts). */
  chainId: 0;
  verdict: 'READY_TO_SIGN' | 'CAUTION' | 'BLOCK';
  direction: {
    mode: 'exact-in';
    inputMint: string;
    outputMint: string;
  };
  quote: SolanaJupiterSwapQuote | null;
  transaction: SolanaJupiterSwapTransaction | null;
  /** Finalized Solana slot witnessed through the execution RPC at build time. */
  slot: number | null;
  quoteExpiresAt: string | null;
  quoteValiditySeconds: number;
  riskVerdictRef: SolanaJupiterSwapRiskVerdictRef | null;
  blockingReasons: string[];
  caveats: string[];
}

export interface SolanaJupiterSwapOptions {
  apiKey?: string;
  endpoints?: readonly string[];
  fetcher?: typeof fetch;
  nowMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSolanaAddress(value: unknown): value is string {
  return typeof value === 'string' && BASE58_DATA.test(value);
}

function asRawUint64(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      `Jupiter returned an invalid ${field}.`
    );
  }
  if (BigInt(value) > MAX_UINT64) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      `Jupiter returned an out-of-range ${field}.`
    );
  }
  return value;
}

function asSafeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      `Solana RPC returned an invalid ${field}.`
    );
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
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      `Jupiter returned an invalid ${field}.`
    );
  }
  return parsed;
}

/** Strict decimal-to-raw conversion; sub-raw-unit amounts are not supported. */
function decimalToRaw(value: string, decimals: number, field: string): string {
  if (typeof value !== 'string' || !DECIMAL.test(value)) {
    throw new SolanaJupiterSwapError(
      'UNSUPPORTED',
      `Solana swap ${field} must be a positive decimal string without exponent notation.`
    );
  }
  const [whole, fractional = ''] = value.split('.');
  if (fractional.length > decimals) {
    throw new SolanaJupiterSwapError(
      'UNSUPPORTED',
      `Solana swap ${field} has more fractional digits than the token supports (${decimals}).`
    );
  }
  const raw = `${whole}${fractional.padEnd(decimals, '0')}`.replace(/^0+(?=\d)/, '');
  const parsed = BigInt(raw);
  if (parsed <= 0n) {
    throw new SolanaJupiterSwapError(
      'UNSUPPORTED',
      `Solana swap ${field} must be greater than zero.`
    );
  }
  if (parsed > MAX_UINT64) {
    throw new SolanaJupiterSwapError(
      'UNSUPPORTED',
      `Solana swap ${field} exceeds the Solana u64 token amount range.`
    );
  }
  return parsed.toString();
}

function rawToNumber(raw: string, decimals: number): number {
  const value = Number(BigInt(raw)) / 10 ** decimals;
  return Number.isFinite(value) ? value : 0;
}

function httpsEndpoints(): string[] {
  const endpoints = getRpcEndpoints(0) ?? [];
  return [
    ...new Set(
      endpoints.filter((endpoint) => {
        try {
          return new URL(endpoint).protocol === 'https:';
        } catch {
          return false;
        }
      })
    ),
  ];
}

function combinedSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function rpcResult(
  endpoints: readonly string[],
  method: string,
  params: unknown[],
  fetcher: typeof fetch,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<unknown> {
  for (const endpoint of endpoints) {
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: combinedSignal(signal, timeoutMs),
      });
      if (!response.ok) continue;
      const body: unknown = await response.json();
      if (isRecord(body) && body.error === undefined && 'result' in body) return body.result;
    } catch {
      // Independent endpoints are tried; no endpoint URL or raw error is exposed.
    }
  }
  throw new SolanaJupiterSwapError(
    'UPSTREAM_UNAVAILABLE',
    `Solana RPC ${method} is unavailable or timed out.`
  );
}

async function verifiedFinalizedSlot(
  endpoints: readonly string[],
  fetcher: typeof fetch,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<number> {
  const genesis = await rpcResult(endpoints, 'getGenesisHash', [], fetcher, timeoutMs, signal);
  if (genesis !== SOLANA_MAINNET_GENESIS_HASH) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      'Configured Solana RPC is not connected to mainnet-beta.'
    );
  }
  return asSafeInteger(
    await rpcResult(
      endpoints,
      'getSlot',
      [{ commitment: 'finalized' }],
      fetcher,
      timeoutMs,
      signal
    ),
    'finalized slot'
  );
}

/**
 * Read an SPL mint's decimals from the verified RPC. A missing mint is a
 * market-not-found outcome; anything else is an upstream failure.
 */
async function readMintDecimals(
  endpoints: readonly string[],
  mint: string,
  role: 'input' | 'output',
  fetcher: typeof fetch,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<number> {
  for (const endpoint of endpoints) {
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenSupply',
          params: [mint],
        }),
        signal: combinedSignal(signal, timeoutMs),
      });
      if (!response.ok) continue;
      const body: unknown = await response.json();
      if (isRecord(body) && body.error !== undefined) {
        // Only an invalid-parameter/missing-mint error is a market outcome;
        // rate limits and transport errors fall through to the next endpoint.
        const rpcError = isRecord(body.error) ? body.error : {};
        const message = typeof rpcError.message === 'string' ? rpcError.message : '';
        if (
          rpcError.code === -32602 ||
          /invalid param|not a token mint|not found|could not find/i.test(message)
        ) {
          throw new SolanaJupiterSwapError(
            'MARKET_NOT_FOUND',
            `Solana ${role} mint was not found as an SPL mint on mainnet.`
          );
        }
        continue;
      }
      if (!isRecord(body) || !('result' in body)) continue;
      if (body.result === null) {
        throw new SolanaJupiterSwapError(
          'MARKET_NOT_FOUND',
          `Solana ${role} mint was not found on mainnet.`
        );
      }
      if (!isRecord(body.result)) continue;
      if (body.result.value === null) {
        throw new SolanaJupiterSwapError(
          'MARKET_NOT_FOUND',
          `Solana ${role} mint was not found on mainnet.`
        );
      }
      if (!isRecord(body.result.value)) continue;
      const decimals = body.result.value.decimals;
      if (
        typeof decimals !== 'number' ||
        !Number.isSafeInteger(decimals) ||
        decimals < 0 ||
        decimals > 18
      ) {
        throw new SolanaJupiterSwapError(
          'UNSUPPORTED',
          `Solana ${role} mint has an unsupported decimals value.`
        );
      }
      return decimals;
    } catch (error) {
      if (error instanceof SolanaJupiterSwapError) throw error;
    }
  }
  throw new SolanaJupiterSwapError(
    'UPSTREAM_UNAVAILABLE',
    `Solana RPC could not read the ${role} mint supply.`
  );
}

function routeSteps(
  value: unknown,
  inputMint: string,
  outputMint: string
): SolanaJupiterSwapRouteStep[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ROUTE_STEPS) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      'Jupiter returned an invalid route plan.'
    );
  }
  return value.map((entry, index) => {
    if (!isRecord(entry) || !isRecord(entry.swapInfo)) {
      throw new SolanaJupiterSwapError(
        'UPSTREAM_UNAVAILABLE',
        'Jupiter returned an invalid route step.'
      );
    }
    const info = entry.swapInfo;
    const percent = entry.percent;
    if (
      !isSolanaAddress(info.ammKey) ||
      typeof info.label !== 'string' ||
      info.label.length === 0 ||
      info.label.length > 80 ||
      !isSolanaAddress(info.inputMint) ||
      !isSolanaAddress(info.outputMint) ||
      typeof percent !== 'number' ||
      !Number.isSafeInteger(percent) ||
      percent < 1 ||
      percent > 100
    ) {
      throw new SolanaJupiterSwapError(
        'UPSTREAM_UNAVAILABLE',
        'Jupiter returned an invalid route step.'
      );
    }
    if (
      (index === 0 && info.inputMint !== inputMint) ||
      (index === value.length - 1 && info.outputMint !== outputMint)
    ) {
      throw new SolanaJupiterSwapError(
        'UPSTREAM_UNAVAILABLE',
        'Jupiter route endpoints do not match the requested pair.'
      );
    }
    const inAmountRaw = asRawUint64(info.inAmount, 'route input amount');
    const outAmountRaw = asRawUint64(info.outAmount, 'route output amount');
    if (BigInt(inAmountRaw) === 0n || BigInt(outAmountRaw) === 0n) {
      throw new SolanaJupiterSwapError(
        'UPSTREAM_UNAVAILABLE',
        'Jupiter returned an empty route step.'
      );
    }
    return {
      ammKey: info.ammKey,
      label: info.label,
      inputMint: info.inputMint,
      outputMint: info.outputMint,
      inAmountRaw,
      outAmountRaw,
      percent,
    };
  });
}

function jupiterErrorDetail(body: unknown): string | null {
  if (!isRecord(body)) return null;
  const candidates = [body.error, body.errorCode, body.message, body.simulationError];
  const text = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return typeof text === 'string' ? text.slice(0, 240) : null;
}

function isNoRouteError(status: number, detail: string | null): boolean {
  if (status === 404) return true;
  if (!detail) return status === 400 || status === 422;
  return /route|pair|market|token|mint|not found|no liquidity/i.test(detail);
}

function isBlockingRiskVerdict(verdict: SolanaJupiterRiskVerdict): boolean {
  return verdict === 'BLOCK' || verdict === 'DANGER';
}

function assertRequest(request: SolanaJupiterSwapRequest): {
  direction: 'exact-in';
  maxSlippageBps: number;
  quoteTtlSeconds: number;
} {
  if (!isSolanaAddress(request.inputMint) || !isSolanaAddress(request.outputMint)) {
    throw new SolanaJupiterSwapError(
      'UNSUPPORTED',
      'Solana swap mints must be base58 SPL mint addresses.'
    );
  }
  if (request.inputMint === request.outputMint) {
    throw new SolanaJupiterSwapError('UNSUPPORTED', 'Solana swap mints must differ.');
  }
  if (!isSolanaAddress(request.userPublicKey)) {
    throw new SolanaJupiterSwapError(
      'UNSUPPORTED',
      'Solana swap userPublicKey is not a valid address.'
    );
  }
  if (request.direction !== undefined && request.direction !== 'exact-in') {
    throw new SolanaJupiterSwapError(
      'UNSUPPORTED',
      'This Jupiter adapter builds exact-input swaps only.'
    );
  }
  if (
    !Number.isSafeInteger(request.slippageBps) ||
    request.slippageBps < 1 ||
    request.slippageBps > 10_000
  ) {
    throw new SolanaJupiterSwapError(
      'UNSUPPORTED',
      'Solana swap slippageBps must be an integer in 1..10000.'
    );
  }
  const maxSlippageBps = request.maxSlippageBps ?? DEFAULT_MAX_SLIPPAGE_BPS;
  if (!Number.isSafeInteger(maxSlippageBps) || maxSlippageBps < 1 || maxSlippageBps > 10_000) {
    throw new SolanaJupiterSwapError('UNSUPPORTED', 'Solana swap maxSlippageBps is invalid.');
  }
  if (request.slippageBps > maxSlippageBps) {
    throw new SolanaJupiterSwapError(
      'UNSUPPORTED',
      `Solana swap slippage ${request.slippageBps} bps exceeds the caller ceiling ${maxSlippageBps} bps.`
    );
  }
  const quoteTtlSeconds = request.quoteTtlSeconds ?? DEFAULT_QUOTE_TTL_SECONDS;
  if (
    !Number.isSafeInteger(quoteTtlSeconds) ||
    quoteTtlSeconds < 5 ||
    quoteTtlSeconds > MAX_QUOTE_TTL_SECONDS
  ) {
    throw new SolanaJupiterSwapError(
      'UNSUPPORTED',
      `Solana swap quoteTtlSeconds must be an integer in 5..${MAX_QUOTE_TTL_SECONDS}.`
    );
  }
  return { direction: 'exact-in', maxSlippageBps, quoteTtlSeconds };
}

async function fetchQuote(options: {
  inputMint: string;
  outputMint: string;
  amountInRaw: string;
  slippageBps: number;
  inputDecimals: number;
  outputDecimals: number;
  quoteTtlSeconds: number;
  apiKey: string;
  timeoutMs: number;
  nowMs: number;
  signal?: AbortSignal;
  fetcher: typeof fetch;
}): Promise<{ quote: SolanaJupiterSwapQuote; raw: JsonRecord }> {
  const url = new URL(JUPITER_QUOTE_URL);
  url.search = new URLSearchParams({
    inputMint: options.inputMint,
    outputMint: options.outputMint,
    amount: options.amountInRaw,
    slippageBps: String(options.slippageBps),
    swapMode: 'ExactIn',
    instructionVersion: 'V2',
  }).toString();

  let response: Response;
  try {
    response = await options.fetcher(url, {
      headers: { 'x-api-key': options.apiKey },
      signal: combinedSignal(options.signal, options.timeoutMs),
    });
  } catch {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      'Jupiter quote request timed out or is unreachable.'
    );
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail = jupiterErrorDetail(body);
    if (isNoRouteError(response.status, detail)) {
      throw new SolanaJupiterSwapError(
        'MARKET_NOT_FOUND',
        'Jupiter has no executable route for this mint pair and amount.',
        detail
      );
    }
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      `Jupiter quote failed with HTTP ${response.status}.`,
      detail
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!isRecord(body)) {
    throw new SolanaJupiterSwapError('UPSTREAM_UNAVAILABLE', 'Jupiter returned an invalid quote.');
  }
  if (
    body.inputMint !== options.inputMint ||
    body.outputMint !== options.outputMint ||
    asRawUint64(body.inAmount, 'input amount') !== options.amountInRaw ||
    body.swapMode !== 'ExactIn' ||
    body.slippageBps !== options.slippageBps
  ) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      'Jupiter quote does not match the requested swap.'
    );
  }

  const outAmountRaw = asRawUint64(body.outAmount, 'output amount');
  const minimumOutRaw = asRawUint64(body.otherAmountThreshold, 'minimum output amount');
  if (
    BigInt(outAmountRaw) === 0n ||
    BigInt(minimumOutRaw) === 0n ||
    BigInt(minimumOutRaw) > BigInt(outAmountRaw)
  ) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      'Jupiter returned an invalid output amount.'
    );
  }

  const quotedAtMs = options.nowMs;
  const expiresAtMs = quotedAtMs + options.quoteTtlSeconds * 1_000;
  return {
    quote: {
      inputMint: options.inputMint,
      outputMint: options.outputMint,
      inputDecimals: options.inputDecimals,
      outputDecimals: options.outputDecimals,
      amountInRaw: options.amountInRaw,
      amountIn: rawToNumber(options.amountInRaw, options.inputDecimals),
      amountOutRaw: outAmountRaw,
      amountOut: rawToNumber(outAmountRaw, options.outputDecimals),
      minimumOutRaw,
      priceImpactPct: asFiniteNumber(body.priceImpactPct, 'price impact', -100, 100),
      slippageBps: options.slippageBps,
      contextSlot: asSafeInteger(body.contextSlot, 'quote context slot'),
      route: routeSteps(body.routePlan, options.inputMint, options.outputMint),
      quotedAt: new Date(quotedAtMs).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      validitySeconds: options.quoteTtlSeconds,
    },
    raw: body,
  };
}

async function buildSwapTransaction(
  quoteResponse: unknown,
  userPublicKey: string,
  options: {
    apiKey: string;
    timeoutMs: number;
    fetcher: typeof fetch;
    signal?: AbortSignal;
  }
): Promise<{ base64: string; lastValidBlockHeight: number }> {
  let response: Response;
  try {
    response = await options.fetcher(JUPITER_SWAP_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': options.apiKey,
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
      }),
      signal: combinedSignal(options.signal, options.timeoutMs),
    });
  } catch {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      'Jupiter swap-build request timed out or is unreachable.'
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = jupiterErrorDetail(body);
    if (isNoRouteError(response.status, detail)) {
      throw new SolanaJupiterSwapError(
        'MARKET_NOT_FOUND',
        'Jupiter could not build a route for this swap at request time.',
        detail
      );
    }
    if (detail !== null && /quote|expired|blockhash|timeout/i.test(detail)) {
      throw new SolanaJupiterSwapError(
        'UPSTREAM_UNAVAILABLE',
        'Jupiter rejected a stale quote; re-quote before building again.',
        detail
      );
    }
    throw new SolanaJupiterSwapError(
      'UNSUPPORTED',
      `Jupiter refused to build this swap (HTTP ${response.status}).`,
      detail
    );
  }
  if (!isRecord(body)) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      'Jupiter returned an invalid swap payload.'
    );
  }
  if (typeof body.error === 'string' || typeof body.simulationError === 'string') {
    const detail = jupiterErrorDetail(body);
    throw new SolanaJupiterSwapError(
      'UNSUPPORTED',
      'Jupiter could not simulate the requested swap.',
      detail
    );
  }
  const base64 = body.swapTransaction;
  if (typeof base64 !== 'string' || base64.length < 64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      'Jupiter returned an invalid unsigned transaction payload.'
    );
  }
  const lastValidBlockHeight = body.lastValidBlockHeight;
  if (
    typeof lastValidBlockHeight !== 'number' ||
    !Number.isSafeInteger(lastValidBlockHeight) ||
    lastValidBlockHeight <= 0
  ) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      'Jupiter returned an invalid lastValidBlockHeight.'
    );
  }
  return { base64, lastValidBlockHeight };
}

/**
 * Build one signable Jupiter exact-input swap.
 *
 * The returned transaction is only produced when every static check, RPC read,
 * quote check and swap-build check passed and the referenced risk verdict is
 * not blocking. A blocking verdict is returned as `verdict: 'BLOCK'` with the
 * forwarded reasons — it is never re-thrown as a generic error.
 */
export async function prepareSolanaJupiterSwap(
  request: SolanaJupiterSwapRequest,
  options: SolanaJupiterSwapOptions = {}
): Promise<SolanaJupiterSwapResult> {
  const { quoteTtlSeconds } = assertRequest(request);
  const nowMs = options.nowMs ?? Date.now();
  const timeoutMs = Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100) {
    throw new SolanaJupiterSwapError(
      'UNSUPPORTED',
      'Solana swap timeoutMs must be an integer >= 100.'
    );
  }

  const base: Omit<
    SolanaJupiterSwapResult,
    'verdict' | 'quote' | 'transaction' | 'slot' | 'quoteExpiresAt' | 'blockingReasons'
  > = {
    schema: SOLANA_JUPITER_SWAP_SCHEMA,
    venue: SOLANA_JUPITER_SWAP_VENUE,
    network: SOLANA_MAINNET_CAIP2,
    chainId: 0,
    direction: {
      mode: 'exact-in',
      inputMint: request.inputMint,
      outputMint: request.outputMint,
    },
    quoteValiditySeconds: quoteTtlSeconds,
    riskVerdictRef: request.riskVerdict ?? null,
    caveats: [
      'Insight does not sign, submit, or custody this transaction; the user wallet must review and sign it.',
      'A Jupiter quote is executable route context, not a block-pinned pool read. Re-quote if the caller waits past the stated validity window.',
      'Token-2022 transfer hooks or fees can change delivered amounts; this adapter only checks the mint supply account.',
    ],
  };

  // The referenced guard decision is authoritative for execution readiness.
  if (request.riskVerdict && isBlockingRiskVerdict(request.riskVerdict.verdict)) {
    return {
      ...base,
      verdict: 'BLOCK',
      quote: null,
      transaction: null,
      slot: null,
      quoteExpiresAt: null,
      blockingReasons: [
        `Referenced risk verdict ${request.riskVerdict.verdict} from ${request.riskVerdict.source} blocks execution.`,
        ...(request.riskVerdict.reasons ?? []),
      ],
    };
  }

  const apiKey = (options.apiKey ?? process.env.JUPITER_API_KEY)?.trim();
  if (!apiKey) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      'Jupiter swap execution is not configured (JUPITER_API_KEY is missing).'
    );
  }
  const endpoints = options.endpoints ?? httpsEndpoints();
  if (endpoints.length === 0) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      'No Solana mainnet RPC endpoint is configured.'
    );
  }
  const fetcher = options.fetcher ?? fetch;

  const [finalizedSlot, inputDecimals, outputDecimals] = await Promise.all([
    verifiedFinalizedSlot(endpoints, fetcher, timeoutMs, options.signal),
    readMintDecimals(endpoints, request.inputMint, 'input', fetcher, timeoutMs, options.signal),
    readMintDecimals(endpoints, request.outputMint, 'output', fetcher, timeoutMs, options.signal),
  ]);
  const amountInRaw = decimalToRaw(request.amount, inputDecimals, 'amount');

  const { quote, raw: quoteResponse } = await fetchQuote({
    inputMint: request.inputMint,
    outputMint: request.outputMint,
    amountInRaw,
    slippageBps: request.slippageBps,
    inputDecimals,
    outputDecimals,
    quoteTtlSeconds,
    apiKey,
    timeoutMs,
    nowMs,
    signal: options.signal,
    fetcher,
  });

  if (quote.contextSlot + MAX_CONTEXT_SLOT_LAG < finalizedSlot) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      'Jupiter quote context is too far behind finalized Solana state.'
    );
  }

  // Build the swap from the exact quote body that passed validation.
  const transaction = await buildSwapTransaction(quoteResponse, request.userPublicKey, {
    apiKey,
    timeoutMs,
    fetcher,
    signal: options.signal,
  });
  const completedAtMs = options.nowMs ?? Date.now();
  if (completedAtMs >= Date.parse(quote.expiresAt)) {
    throw new SolanaJupiterSwapError(
      'UPSTREAM_UNAVAILABLE',
      'Jupiter quote expired before the swap transaction was built.'
    );
  }

  return {
    ...base,
    verdict: request.riskVerdict?.verdict === 'CAUTION' ? 'CAUTION' : 'READY_TO_SIGN',
    quote,
    transaction: {
      ...transaction,
      signatureRequired: 'user',
      wrapAndUnwrapSol: true,
    },
    slot: finalizedSlot,
    quoteExpiresAt: quote.expiresAt,
    blockingReasons: [],
  };
}
