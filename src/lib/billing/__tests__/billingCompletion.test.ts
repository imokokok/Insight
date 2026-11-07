/**
 * Billing completion: per-item batch pricing, request idempotency, and
 * no-usable-data / timeout exemptions.
 */

import {
  isAllItemsFailedResult,
  isInsufficientDataResult,
  isUpstreamTimeoutError,
} from '../exemptions';
import {
  batchChargeCredits,
  countMcpBatchSuccessItems,
  getMcpToolBillableItems,
  getRestBillableItems,
} from '../metering';
import { getMcpToolCreditCostForCall } from '../productPricing';
import {
  clearMcpRequestCache,
  getCachedMcpResult,
  IDEMPOTENCY_KEY_MAX_LENGTH,
  IDEMPOTENCY_WINDOW_MS,
  idempotencyMeteringKey,
  mcpRequestFingerprint,
  resolveClientIdempotencyKey,
  restIdempotencyMeteringKey,
  restRequestFingerprint,
  setCachedMcpResult,
} from '../requestIdempotency';

describe('batch per-item billing', () => {
  it('counts batch assets and legacy batch queries', () => {
    expect(
      getMcpToolBillableItems('get_price_analytics', {
        mode: 'batch',
        assets: [{ symbol: 'ETH' }, { symbol: 'BTC' }, { symbol: 'SOL' }],
      })
    ).toBe(3);
    expect(
      getMcpToolBillableItems('get_price_analytics', {
        mode: 'consensus',
        assets: [{ symbol: 'ETH' }],
      })
    ).toBe(1);
    expect(
      getMcpToolBillableItems('get_oracle_prices_batch', {
        queries: [{ symbol: 'ETH' }, { symbol: 'BTC' }],
      })
    ).toBe(2);
    expect(getMcpToolBillableItems('get_symbols', {})).toBe(1);
  });

  it('scales the MCP call price by the requested item count', () => {
    const one = getMcpToolCreditCostForCall('get_price_analytics', {
      mode: 'batch',
      assets: [{ symbol: 'ETH' }],
    });
    const three = getMcpToolCreditCostForCall('get_price_analytics', {
      mode: 'batch',
      assets: [{ symbol: 'ETH' }, { symbol: 'BTC' }, { symbol: 'SOL' }],
    });
    expect(one).toBe(2);
    expect(three).toBe(6);
  });

  it('scales the REST batch endpoint per requested query', () => {
    expect(getRestBillableItems('/api/v1/prices/batch', { queries: [{}, {}, {}] })).toBe(3);
    expect(getRestBillableItems('/api/v1/deviation', { queries: [{}, {}] })).toBe(1);
    expect(getRestBillableItems('/api/v1/prices/batch', {})).toBe(1);
  });

  it('clamps requested items to the public 20-query batch cap', () => {
    const queries = Array.from({ length: 25 }, () => ({ symbol: 'ETH' }));
    expect(getMcpToolBillableItems('get_oracle_prices_batch', { queries })).toBe(20);
    expect(getRestBillableItems('/api/v1/prices/batch', { queries })).toBe(20);
  });

  it('charges the per-item price with a one-item floor and zero for no successes', () => {
    expect(batchChargeCredits(2, 0)).toBe(0);
    expect(batchChargeCredits(2, 1)).toBe(2);
    expect(batchChargeCredits(2, 3)).toBe(6);
    expect(batchChargeCredits(2, 20)).toBe(40);
  });

  it('counts only successful items in a formatted batch result', () => {
    const text = [
      '**Batch price results (3 queries)**',
      '',
      '**Successful:**',
      '- ETH: $2,500.12',
      '- BTC: $91,000.00',
      '',
      '**Failures:**',
      '- SOL: no price available',
    ].join('\n');
    expect(
      countMcpBatchSuccessItems('get_oracle_prices_batch', { queries: [{}, {}, {}] }, text)
    ).toBe(2);
    expect(
      countMcpBatchSuccessItems('get_price_analytics', { mode: 'batch', assets: [{}, {}] }, text)
    ).toBe(2);
    expect(countMcpBatchSuccessItems('get_symbols', {}, text)).toBeNull();

    const none = '**Batch price results (1 query)**\n\n**Successful:**\nNo successful prices.\n';
    expect(countMcpBatchSuccessItems('get_oracle_prices_batch', { queries: [{}] }, none)).toBe(0);
  });
});

describe('request idempotency', () => {
  beforeEach(() => clearMcpRequestCache());

  it('keys on caller, tool and canonical arguments', () => {
    const a = mcpRequestFingerprint('key:1', 'get_price', { symbol: 'ETH', chain: 'base' });
    expect(mcpRequestFingerprint('key:1', 'get_price', { chain: 'base', symbol: 'ETH' })).toBe(a);
    expect(mcpRequestFingerprint('key:2', 'get_price', { symbol: 'ETH', chain: 'base' })).not.toBe(
      a
    );
    expect(
      mcpRequestFingerprint('key:1', 'get_symbols', { symbol: 'ETH', chain: 'base' })
    ).not.toBe(a);
    expect(mcpRequestFingerprint('key:1', 'get_price', { symbol: 'BTC', chain: 'base' })).not.toBe(
      a
    );
  });

  it('uses one ledger key per 10-minute window', () => {
    const t0 = 1_700_000_000_000;
    expect(idempotencyMeteringKey('fp', t0)).toBe(idempotencyMeteringKey('fp', t0 + 60_000));
    expect(idempotencyMeteringKey('fp', t0)).not.toBe(
      idempotencyMeteringKey('fp', t0 + IDEMPOTENCY_WINDOW_MS)
    );
  });

  it('expires cached results after the window', () => {
    const now = Date.now();
    setCachedMcpResult('fp', { priceCredits: 4, billableItems: 1, result: { ok: true } }, now);
    expect(getCachedMcpResult('fp', now + 1_000)).not.toBeNull();
    expect(getCachedMcpResult('fp', now + IDEMPOTENCY_WINDOW_MS + 1)).toBeNull();
  });

  it('accepts Idempotency-Key first, then X-Request-Id, and ignores unsafe values', () => {
    expect(
      resolveClientIdempotencyKey(
        new Headers({ 'Idempotency-Key': 'abc-123', 'X-Request-Id': 'ignored' })
      )
    ).toBe('abc-123');
    expect(resolveClientIdempotencyKey(new Headers({ 'X-Request-Id': 'req-42' }))).toBe('req-42');
    expect(
      resolveClientIdempotencyKey(
        new Headers({ 'Idempotency-Key': 'a'.repeat(IDEMPOTENCY_KEY_MAX_LENGTH + 1) })
      )
    ).toBeNull();
    expect(resolveClientIdempotencyKey(new Headers({ 'Idempotency-Key': 'bad key!' }))).toBeNull();
  });

  it('scopes an explicit retry key into the fingerprint, method, path and body', () => {
    const base = {
      identity: 'key:1',
      method: 'POST',
      path: '/api/v1/prices/batch',
      search: '?x=1',
      bodyText: '{"queries":[{"symbol":"ETH"}]}',
      clientKey: 'retry-a',
    } as const;
    expect(restRequestFingerprint(base)).toBe(restRequestFingerprint({ ...base }));
    expect(restRequestFingerprint({ ...base, clientKey: 'retry-b' })).not.toBe(
      restRequestFingerprint(base)
    );
    expect(
      restRequestFingerprint({ ...base, bodyText: '{"queries":[{"symbol":"BTC"}]}' })
    ).not.toBe(restRequestFingerprint(base));
    expect(restRequestFingerprint({ ...base, identity: 'key:2' })).not.toBe(
      restRequestFingerprint(base)
    );
    expect(mcpRequestFingerprint('key:1', 'get_price', { symbol: 'ETH' }, 'retry-a')).not.toBe(
      mcpRequestFingerprint('key:1', 'get_price', { symbol: 'ETH' })
    );
  });

  it('uses one REST ledger key per 10-minute window', () => {
    const t0 = 1_700_000_000_000;
    expect(restIdempotencyMeteringKey('fp', t0)).toBe(
      restIdempotencyMeteringKey('fp', t0 + 60_000)
    );
    expect(restIdempotencyMeteringKey('fp', t0)).not.toBe(
      restIdempotencyMeteringKey('fp', t0 + IDEMPOTENCY_WINDOW_MS)
    );
  });
});

describe('billing exemptions', () => {
  it('keeps insufficient evidence separate from an all-failed upstream batch', () => {
    expect(isInsufficientDataResult('Evidence grade: INSUFFICIENT_DATA (freshness stale)')).toBe(
      true
    );
    expect(
      isInsufficientDataResult('**Batch price results (3 queries)**\nNo successful prices.')
    ).toBe(false);
    expect(
      isAllItemsFailedResult('**Batch price results (3 queries)**\nNo successful prices.')
    ).toBe(true);
    expect(isAllItemsFailedResult('Evidence grade: INSUFFICIENT_DATA')).toBe(false);
    expect(isInsufficientDataResult('Price: $2,500.12')).toBe(false);
    expect(isAllItemsFailedResult('Price: $2,500.12')).toBe(false);
  });

  it('detects upstream and chain timeouts by code or wording', () => {
    expect(isUpstreamTimeoutError(new DOMException('aborted', 'AbortError'))).toBe(true);
    expect(isUpstreamTimeoutError(new Error('RPC request timed out after 10s'))).toBe(true);
    expect(isUpstreamTimeoutError(new Error('request failed with ETIMEDOUT'))).toBe(true);
    expect(isUpstreamTimeoutError(new Error('Bad gateway'))).toBe(false);
  });
});
