/** Read-only verification of a previously user-signed Hyperliquid perp order. */

import { HYPERLIQUID_INFO_URL, type HyperliquidReviewedPerpMarket } from './hyperliquidPerpMarket';

import type { HyperliquidPerpOrderSide } from './hyperliquidPerpOrder';

type JsonRecord = Record<string, unknown>;
type Fetcher = typeof fetch;

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const CLOID = /^0x[0-9a-fA-F]{32}$/;
// Hyperliquid's Info API rejects zero as an order id even though it is a
// syntactically valid unsigned integer, so reject it locally with a precise
// input error instead of surfacing a misleading transport failure.
const UINT64 = /^[1-9][0-9]{0,19}$/;
const POSITIVE_DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
const MAX_LOOKBACK_MS = 24 * 60 * 60 * 1_000;

export interface HyperliquidPerpExpectedOrder {
  market: HyperliquidReviewedPerpMarket;
  side: HyperliquidPerpOrderSide;
  size: string;
  limitPrice: string;
  reduceOnly: boolean;
  clientOrderId: string;
}

export interface HyperliquidPerpExecutionVerificationRequest {
  /** Main account, subaccount, or vault address — never an API-wallet address. */
  user: string;
  /** Hyperliquid oid (uint64 string) or the 16-byte client order id. */
  orderId: string;
  /** ISO-8601 time immediately before the user submitted the signed action. */
  submittedAt: string;
  expectedOrder: HyperliquidPerpExpectedOrder;
}

export interface HyperliquidPerpExecutionEvidence {
  schema: 'insight.hyperliquid-perp-execution-observation.v1';
  verificationLevel: 'observed';
  observedAt: string;
  user: `0x${string}`;
  orderLookup: string;
  order: {
    known: boolean;
    status: string | null;
    statusTimestamp: string | null;
    oid: string | null;
    market: string | null;
    side: HyperliquidPerpOrderSide | null;
    limitPrice: string | null;
    originalSize: string | null;
    remainingSize: string | null;
    reduceOnly: boolean | null;
    clientOrderId: string | null;
  };
  expectedOrder: { matches: boolean | null; mismatches: string[] };
  fills: {
    queryStart: string;
    queryEnd: string;
    count: number;
    filledBase: number;
    filledNotionalUsd: number;
    averagePrice: number | null;
    totalFeeUsd: number;
    fillHashes: string[];
    firstFilledAt: string | null;
    lastFilledAt: string | null;
  };
  caveats: string[];
}

export class HyperliquidPerpExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HyperliquidPerpExecutionError';
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function canonicalDecimal(
  value: unknown,
  field: string,
  allowZero = false
): { text: string; value: number } {
  if (typeof value !== 'string' || !POSITIVE_DECIMAL.test(value)) {
    throw new HyperliquidPerpExecutionError(`Hyperliquid returned an invalid ${field}.`);
  }
  const [wholeInput, fractionalInput = ''] = value.split('.');
  const whole = wholeInput!.replace(/^0+(?=\d)/, '');
  const fractional = fractionalInput.replace(/0+$/, '');
  const text = fractional.length > 0 ? `${whole}.${fractional}` : whole;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    throw new HyperliquidPerpExecutionError(`Hyperliquid returned an invalid ${field}.`);
  }
  return { text, value: parsed };
}

function exactExpectedDecimal(value: string, field: string): string {
  try {
    return canonicalDecimal(value, field).text;
  } catch {
    throw new HyperliquidPerpExecutionError(`Expected Hyperliquid order ${field} is invalid.`);
  }
}

function safeTimestamp(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new HyperliquidPerpExecutionError(`Hyperliquid returned an invalid ${field}.`);
  }
  return Number(value);
}

async function infoRequest(
  body: JsonRecord,
  fetcher: Fetcher,
  signal?: AbortSignal
): Promise<unknown> {
  const timeout = new AbortController();
  const timeoutId = setTimeout(() => timeout.abort(), 8_000);
  try {
    const response = await fetcher(HYPERLIQUID_INFO_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal,
    });
    if (!response.ok)
      throw new HyperliquidPerpExecutionError('Hyperliquid order evidence is unavailable.');
    return await response.json();
  } catch (error) {
    if (error instanceof HyperliquidPerpExecutionError) throw error;
    throw new HyperliquidPerpExecutionError('Hyperliquid order evidence is unavailable.');
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizedOrderLookup(value: string): string {
  if (typeof value !== 'string' || (!CLOID.test(value) && !UINT64.test(value))) {
    throw new HyperliquidPerpExecutionError(
      'Hyperliquid orderId must be a uint64 string or a 16-byte 0x-prefixed client order id.'
    );
  }
  if (CLOID.test(value)) return value.toLowerCase();
  try {
    if (BigInt(value) > 18_446_744_073_709_551_615n) throw new Error('overflow');
  } catch {
    throw new HyperliquidPerpExecutionError('Hyperliquid orderId exceeds uint64.');
  }
  return value;
}

function assertExpectedOrder(value: HyperliquidPerpExpectedOrder) {
  if (!['BTC', 'ETH', 'HYPE'].includes(value.market)) {
    throw new HyperliquidPerpExecutionError('Expected Hyperliquid market is not reviewed.');
  }
  if (value.side !== 'buy' && value.side !== 'sell') {
    throw new HyperliquidPerpExecutionError('Expected Hyperliquid side must be buy or sell.');
  }
  if (typeof value.reduceOnly !== 'boolean' || !CLOID.test(value.clientOrderId)) {
    throw new HyperliquidPerpExecutionError('Expected Hyperliquid order identity is invalid.');
  }
  return {
    market: value.market,
    side: value.side,
    size: exactExpectedDecimal(value.size, 'size'),
    limitPrice: exactExpectedDecimal(value.limitPrice, 'limitPrice'),
    reduceOnly: value.reduceOnly,
    clientOrderId: value.clientOrderId.toLowerCase(),
  };
}

type ParsedStatus = {
  known: boolean;
  status: string | null;
  statusTimestamp: number | null;
  oid: string | null;
  market: string | null;
  side: HyperliquidPerpOrderSide | null;
  limitPrice: string | null;
  originalSize: string | null;
  remainingSize: string | null;
  reduceOnly: boolean | null;
  clientOrderId: string | null;
};

function unknownOrder(): ParsedStatus {
  return {
    known: false,
    status: null,
    statusTimestamp: null,
    oid: null,
    market: null,
    side: null,
    limitPrice: null,
    originalSize: null,
    remainingSize: null,
    reduceOnly: null,
    clientOrderId: null,
  };
}

function parseOrderStatus(value: unknown): ParsedStatus {
  if (!isRecord(value))
    throw new HyperliquidPerpExecutionError(
      'Hyperliquid returned an invalid order-status response.'
    );
  if (value.status === 'unknownOid') return unknownOrder();
  if (value.status !== 'order' || !isRecord(value.order) || !isRecord(value.order.order)) {
    throw new HyperliquidPerpExecutionError(
      'Hyperliquid returned an invalid order-status response.'
    );
  }
  const order = value.order.order;
  if (
    typeof value.order.status !== 'string' ||
    value.order.status.length === 0 ||
    value.order.status.length > 80 ||
    typeof order.coin !== 'string' ||
    typeof order.side !== 'string' ||
    !['B', 'A'].includes(order.side) ||
    typeof order.reduceOnly !== 'boolean'
  )
    throw new HyperliquidPerpExecutionError('Hyperliquid returned malformed order status fields.');
  const oid = order.oid;
  if (
    !(typeof oid === 'number' && Number.isSafeInteger(oid) && oid >= 0) &&
    !(typeof oid === 'string' && UINT64.test(oid))
  ) {
    throw new HyperliquidPerpExecutionError('Hyperliquid returned an invalid order id.');
  }
  const cloid = order.cloid;
  if (cloid !== null && (typeof cloid !== 'string' || !CLOID.test(cloid))) {
    throw new HyperliquidPerpExecutionError('Hyperliquid returned an invalid client order id.');
  }
  return {
    known: true,
    status: value.order.status,
    statusTimestamp: safeTimestamp(value.order.statusTimestamp, 'order status timestamp'),
    oid: String(oid),
    market: order.coin,
    side: order.side === 'B' ? 'buy' : 'sell',
    limitPrice: canonicalDecimal(order.limitPx, 'order limit price', true).text,
    originalSize: canonicalDecimal(order.origSz, 'order original size').text,
    remainingSize: canonicalDecimal(order.sz, 'order remaining size', true).text,
    reduceOnly: order.reduceOnly,
    clientOrderId: cloid === null ? null : cloid.toLowerCase(),
  };
}

interface ParsedFill {
  price: number;
  size: number;
  fee: number;
  time: number;
  hash: string;
  market: string;
  side: HyperliquidPerpOrderSide;
}

function parseMatchingFills(value: unknown, oid: string | null): ParsedFill[] {
  if (!Array.isArray(value) || value.length > 2_000)
    throw new HyperliquidPerpExecutionError('Hyperliquid returned an invalid fills response.');
  if (oid === null) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry))
      throw new HyperliquidPerpExecutionError('Hyperliquid returned an invalid fill.');
    const entryOid = entry.oid;
    if (String(entryOid) !== oid) return [];
    if (
      (typeof entryOid !== 'number' || !Number.isSafeInteger(entryOid)) &&
      (typeof entryOid !== 'string' || !UINT64.test(entryOid))
    ) {
      throw new HyperliquidPerpExecutionError('Hyperliquid returned an invalid fill order id.');
    }
    if (
      typeof entry.coin !== 'string' ||
      typeof entry.side !== 'string' ||
      !['B', 'A'].includes(entry.side) ||
      typeof entry.hash !== 'string' ||
      !/^0x[0-9a-fA-F]{64}$/.test(entry.hash)
    ) {
      throw new HyperliquidPerpExecutionError('Hyperliquid returned malformed fill fields.');
    }
    const price = canonicalDecimal(entry.px, 'fill price');
    const size = canonicalDecimal(entry.sz, 'fill size');
    const fee = canonicalDecimal(entry.fee, 'fill fee', true);
    return [
      {
        price: price.value,
        size: size.value,
        fee: fee.value,
        time: safeTimestamp(entry.time, 'fill time'),
        hash: entry.hash.toLowerCase(),
        market: entry.coin,
        side: entry.side === 'B' ? 'buy' : 'sell',
      },
    ];
  });
}

/** Read and compare public order/fill evidence; never accepts signing material. */
export async function verifyHyperliquidPerpExecution(
  request: HyperliquidPerpExecutionVerificationRequest,
  options: { fetcher?: Fetcher; nowMs?: number; signal?: AbortSignal } = {}
): Promise<HyperliquidPerpExecutionEvidence> {
  if (typeof request.user !== 'string' || !ADDRESS.test(request.user))
    throw new HyperliquidPerpExecutionError(
      'Hyperliquid user must be a 20-byte 0x-prefixed address.'
    );
  const orderLookup = normalizedOrderLookup(request.orderId);
  const expected = assertExpectedOrder(request.expectedOrder);
  const submittedAtMs = Date.parse(request.submittedAt);
  const nowMs = options.nowMs ?? Date.now();
  if (
    !Number.isSafeInteger(submittedAtMs) ||
    submittedAtMs > nowMs + 5_000 ||
    submittedAtMs < nowMs - MAX_LOOKBACK_MS
  ) {
    throw new HyperliquidPerpExecutionError(
      'Hyperliquid submittedAt must be a valid timestamp within the preceding 24 hours.'
    );
  }
  const queryStartMs = Math.max(submittedAtMs - 5_000, nowMs - MAX_LOOKBACK_MS);
  const fetcher = options.fetcher ?? fetch;
  const [statusPayload, fillsPayload] = await Promise.all([
    infoRequest(
      { type: 'orderStatus', user: request.user.toLowerCase(), oid: orderLookup },
      fetcher,
      options.signal
    ),
    infoRequest(
      {
        type: 'userFillsByTime',
        user: request.user.toLowerCase(),
        startTime: queryStartMs,
        endTime: nowMs,
        aggregateByTime: false,
      },
      fetcher,
      options.signal
    ),
  ]);
  const order = parseOrderStatus(statusPayload);
  const fills = parseMatchingFills(fillsPayload, order.oid);
  const fillsMayBeTruncated = Array.isArray(fillsPayload) && fillsPayload.length === 2_000;
  const mismatches: string[] = [];
  if (order.known) {
    if (order.market !== expected.market) mismatches.push('market');
    if (order.side !== expected.side) mismatches.push('side');
    if (order.originalSize !== expected.size) mismatches.push('size');
    if (order.limitPrice !== expected.limitPrice) mismatches.push('limitPrice');
    if (order.reduceOnly !== expected.reduceOnly) mismatches.push('reduceOnly');
    if (order.clientOrderId !== expected.clientOrderId) mismatches.push('clientOrderId');
  }
  for (const fill of fills) {
    if (fill.market !== expected.market && !mismatches.includes('fill.market'))
      mismatches.push('fill.market');
    if (fill.side !== expected.side && !mismatches.includes('fill.side'))
      mismatches.push('fill.side');
  }
  const filledBase = fills.reduce((total, fill) => total + fill.size, 0);
  const filledNotionalUsd = fills.reduce((total, fill) => total + fill.size * fill.price, 0);
  const totalFeeUsd = fills.reduce((total, fill) => total + fill.fee, 0);
  const fillTimes = fills.map((fill) => fill.time).sort((left, right) => left - right);
  return {
    schema: 'insight.hyperliquid-perp-execution-observation.v1',
    verificationLevel: 'observed',
    observedAt: new Date(nowMs).toISOString(),
    user: request.user.toLowerCase() as `0x${string}`,
    orderLookup,
    order: {
      known: order.known,
      status: order.status,
      statusTimestamp:
        order.statusTimestamp === null ? null : new Date(order.statusTimestamp).toISOString(),
      oid: order.oid,
      market: order.market,
      side: order.side,
      limitPrice: order.limitPrice,
      originalSize: order.originalSize,
      remainingSize: order.remainingSize,
      reduceOnly: order.reduceOnly,
      clientOrderId: order.clientOrderId,
    },
    expectedOrder: { matches: order.known ? mismatches.length === 0 : null, mismatches },
    fills: {
      queryStart: new Date(queryStartMs).toISOString(),
      queryEnd: new Date(nowMs).toISOString(),
      count: fills.length,
      filledBase,
      filledNotionalUsd,
      averagePrice: filledBase > 0 ? filledNotionalUsd / filledBase : null,
      totalFeeUsd,
      fillHashes: fills.map((fill) => fill.hash),
      firstFilledAt: fillTimes[0] === undefined ? null : new Date(fillTimes[0]).toISOString(),
      lastFilledAt:
        fillTimes.length === 0 ? null : new Date(fillTimes[fillTimes.length - 1]!).toISOString(),
    },
    caveats: [
      'This is a public Hyperliquid Info API observation, not an Insight signature or an independent proof of exchange-state correctness.',
      'Only fills returned within the bounded query window are aggregated. A stale or incorrect submittedAt can omit matching fills.',
      ...(fillsMayBeTruncated
        ? [
            'Hyperliquid returned its 2,000-fill response limit, so matching fills may be incomplete even inside this query window.',
          ]
        : []),
      'Insight did not submit, cancel, amend, or sign the order, and never receives an API-wallet key.',
    ],
  };
}
