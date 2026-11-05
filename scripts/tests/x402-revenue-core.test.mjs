import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MISSING_PAYER,
  formatReport,
  normalizePayer,
  parseAuditArgs,
  parseSelfPayers,
  payerStats,
  summarize,
  suspectedSelfPayers,
} from '../lib/x402-revenue-core.mjs';

const NOW = new Date('2026-11-05T12:00:00.000Z');
const OPS = '0x1111111111111111111111111111111111111111';
const ALICE = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const BOB = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function settled(payer, at, amountUsdc = 0.02, resource = '/api/v1/safety/pre-trade') {
  return {
    payer,
    created_at: at,
    amount_usdc: amountUsdc,
    resource,
    network: 'eip155:8453',
    surface: 'rest',
    acquisition_source: 'unknown',
  };
}

function fixture() {
  const opsRows = [
    settled(OPS, '2026-10-01T10:00:00.000Z', 0.02, 'mcp:pre_trade_safety_check'),
    settled(OPS, '2026-10-01T11:00:00.000Z', 0.02, '/api/v1/safety/pre-trade'),
    settled(OPS, '2026-10-02T10:00:00.000Z', 0.02, 'mcp:get_symbols'),
    settled(OPS, '2026-10-02T11:00:00.000Z'),
    settled(OPS, '2026-10-02T12:00:00.000Z'),
    settled(OPS, '2026-10-03T10:00:00.000Z'),
    settled(OPS, '2026-10-03T11:00:00.000Z'),
    settled(OPS, '2026-10-03T12:00:00.000Z'),
    settled(OPS, '2026-10-03T13:00:00.000Z'),
    settled(OPS, '2026-10-03T14:00:00.000Z'),
    settled(OPS, '2026-10-03T15:00:00.000Z'),
    settled(OPS, '2026-10-03T16:00:00.000Z'),
  ];
  const externalRows = [
    settled(ALICE, '2026-10-20T12:00:00.000Z'),
    settled(ALICE, '2026-10-21T12:00:00.000Z'),
    settled(BOB, '2026-10-23T12:00:00.000Z'),
  ];
  const rows = [...opsRows, ...externalRows];
  const lifecycleCounts = {
    quote_issued: 100,
    payment_verified: 15,
    business_succeeded: 15,
    settled: rows.length,
  };
  return { rows, lifecycleCounts };
}

test('parseAuditArgs reads space-separated and inline values identically', () => {
  const inline = parseAuditArgs([
    '--days=7',
    '--self=0xabc,0xdef',
    '--proxy=http://127.0.0.1:7890',
    '--json',
  ]);
  const spaced = parseAuditArgs([
    '--days',
    '7',
    '--self',
    '0xabc,0xdef',
    '--proxy',
    'http://127.0.0.1:7890',
    '--json',
  ]);
  assert.deepEqual(spaced, inline);
  assert.equal(spaced.days, 7);
  assert.equal(spaced.self, '0xabc,0xdef');
  assert.equal(spaced.proxy, 'http://127.0.0.1:7890');
  assert.equal(spaced.json, true);
  // Regression: the old parser read argv[i + 1] after advancing i, so the
  // token after the value was consumed as the value itself.
  assert.equal(parseAuditArgs(['--days', '7']).days, 7);
  assert.equal(parseAuditArgs(['--days', '7', '--json']).json, true);
});

test('parseAuditArgs validates the window and rejects unknown flags', () => {
  assert.equal(parseAuditArgs([]).days, 30);
  assert.equal(parseAuditArgs(['--all']).all, true);
  assert.equal(parseAuditArgs(['--include-suspected']).includeSuspected, true);
  assert.equal(parseAuditArgs(['--help']).help, true);
  assert.throws(() => parseAuditArgs(['--days']), /positive integer/);
  assert.throws(() => parseAuditArgs(['--days=0']), /positive integer/);
  assert.throws(() => parseAuditArgs(['--days=abc']), /positive integer/);
  assert.throws(() => parseAuditArgs(['--nope']), /unknown option/);
});

test('a fetched-row / lifecycle-count mismatch is surfaced as a warning', () => {
  const summary = summarize({
    lifecycleCounts: { quote_issued: 10, settled: 3 },
    settledRows: [settled(ALICE, '2026-10-23T12:00:00.000Z')],
    now: NOW,
  });
  assert.equal(summary.settledRowsMismatch, true);
  assert.match(
    formatReport(summary),
    /WARNING: fetched 1 settled rows but the lifecycle count is 3/
  );
  assert.doesNotThrow(() => JSON.stringify(summary));
});

test('normalizePayer and parseSelfPayers are case-insensitive and whitespace-safe', () => {
  assert.equal(normalizePayer('  0xABCdef  '), '0xabcdef');
  assert.equal(normalizePayer(null), null);
  assert.equal(normalizePayer('  '), null);
  assert.deepEqual([...parseSelfPayers(' 0xAAA ,0xbbb,, ')].sort(), ['0xaaa', '0xbbb']);
  assert.deepEqual([...parseSelfPayers('')], []);
  assert.deepEqual([...parseSelfPayers(undefined)], []);
});

test('payerStats aggregates calls, gross, active days and resources', () => {
  const { rows } = fixture();
  const stats = payerStats(rows);
  const ops = stats.find((stat) => stat.payer === OPS);
  assert.equal(ops.calls, 12);
  assert.equal(ops.grossUsdc, 0.24);
  assert.equal(ops.activeDays, 3);
  assert.equal(ops.resources, 3);
  assert.equal(ops.networks, 1);
  assert.equal(ops.firstAt, '2026-10-01T10:00:00.000Z');
  assert.equal(ops.lastAt, '2026-10-03T16:00:00.000Z');
  assert.equal(stats[0].payer, OPS, 'highest-volume payer sorts first');
});

test('suspectedSelfPayers flags a high-frequency multi-day wallet only', () => {
  const { rows } = fixture();
  const suspected = suspectedSelfPayers(payerStats(rows), rows.length);
  assert.deepEqual([...suspected], [OPS]);
  const singleDay = [settled(ALICE, '2026-10-20T12:00:00.000Z')];
  assert.equal(suspectedSelfPayers(payerStats(singleDay), 1).size, 0);
  const missing = [settled(null, '2026-10-20T12:00:00.000Z')];
  assert.equal(payerStats(missing)[0].payer, MISSING_PAYER);
  assert.equal(suspectedSelfPayers(payerStats(missing), 1).size, 0);
});

test('summarize separates external revenue from the operations wallet', () => {
  const { rows, lifecycleCounts } = fixture();
  const summary = summarize({ lifecycleCounts, settledRows: rows, now: NOW, windowLabel: 'test' });

  assert.equal(summary.settledRows, 15);
  assert.equal(summary.grossUsdc, 0.3);
  assert.equal(summary.externalPaidCalls, 3);
  assert.equal(summary.uniqueExternalPayers, 2);
  assert.equal(summary.externalGrossUsdc, 0.06);
  assert.equal(summary.excludedCalls, 12);
  assert.equal(summary.excludedGrossUsdc, 0.24);
  assert.equal(summary.quoteToSettledPct, 15);
  assert.equal(summary.lastExternalAt, '2026-10-23T12:00:00.000Z');
  assert.equal(summary.daysSinceLastExternal, 13);
  assert.deepEqual(summary.suspectedSelfPayers, [OPS]);
  assert.equal(summary.externalByDay.length, 3);
  assert.equal(summary.externalByNetwork[0].key, 'eip155:8453');
});

test('--include-suspected restores the operations wallet', () => {
  const { rows, lifecycleCounts } = fixture();
  const summary = summarize({
    lifecycleCounts,
    settledRows: rows,
    includeSuspected: true,
    now: NOW,
  });
  assert.equal(summary.externalPaidCalls, 15);
  assert.equal(summary.uniqueExternalPayers, 3);
  assert.equal(summary.externalGrossUsdc, 0.3);
  assert.equal(summary.excludedCalls, 0);
});

test('explicit --self excludes a named payer regardless of heuristics', () => {
  const { rows, lifecycleCounts } = fixture();
  const summary = summarize({
    lifecycleCounts,
    settledRows: rows,
    selfPayers: parseSelfPayers(ALICE.toUpperCase()),
    now: NOW,
  });
  assert.equal(summary.externalPaidCalls, 1);
  assert.equal(summary.uniqueExternalPayers, 1);
  assert.deepEqual(summary.selfPayers, [ALICE]);
  assert.ok(summary.excludedPayers.includes(ALICE));
});

test('empty window produces an explicit zero-payment verdict', () => {
  const summary = summarize({ lifecycleCounts: { quote_issued: 42 }, settledRows: [], now: NOW });
  assert.equal(summary.externalPaidCalls, 0);
  assert.equal(summary.lastExternalAt, null);
  assert.equal(summary.daysSinceLastExternal, null);
  assert.equal(summary.quoteToSettledPct, 0);
  assert.match(formatReport(summary), /VERDICT: no observed external paid calls/);
});

test('rows without a payer are excluded and reported, never counted as external', () => {
  const rows = [
    settled(null, '2026-10-23T12:00:00.000Z'),
    settled(BOB, '2026-10-23T13:00:00.000Z'),
  ];
  const summary = summarize({
    lifecycleCounts: { settled: 2, quote_issued: 10 },
    settledRows: rows,
    now: NOW,
  });
  assert.equal(summary.externalPaidCalls, 1);
  assert.equal(summary.excludedCalls, 1);
  assert.ok(summary.excludedPayers.includes(MISSING_PAYER));
  assert.match(formatReport(summary), /missing-payer/);
});

test('all-time classification stops a short window from inventing an external payer', () => {
  const { rows, lifecycleCounts } = fixture();
  // One ops-wallet call inside a 7-day window, a genuinely external call
  // outside it. Window-scoped heuristics see 1 call / 1 active day and would
  // report the ops wallet as a brand new external customer.
  const windowRows = [settled(OPS, '2026-11-03T17:05:52.809Z')];
  const windowCounts = { quote_issued: 3027, settled: 1 };

  const naive = summarize({
    lifecycleCounts: windowCounts,
    settledRows: windowRows,
    now: NOW,
    windowLabel: 'last 7 days',
  });
  assert.equal(naive.externalPaidCalls, 1, 'documents the window-scoped false positive');

  const fixed = summarize({
    lifecycleCounts: windowCounts,
    settledRows: windowRows,
    classificationRows: rows,
    now: NOW,
    windowLabel: 'last 7 days',
  });
  assert.equal(fixed.externalPaidCalls, 0);
  assert.equal(fixed.uniqueExternalPayers, 0);
  assert.equal(fixed.lastExternalAt, null);
  assert.equal(fixed.excludedCalls, 1);
  assert.deepEqual(fixed.suspectedSelfPayers, [OPS]);
  assert.equal(fixed.classificationWindow, 'all time');
  assert.equal(fixed.classificationRows, rows.length);
  assert.equal(fixed.settledRows, 1, 'headline stays window-scoped');
  assert.equal(fixed.lifecycle.quote_issued, 3027, 'funnel stays window-scoped');
  assert.equal(fixed.payers.length, 1, 'payer table stays window-scoped');
  assert.match(formatReport(fixed), /Ops-wallet detection: all time \(15 settled rows\)/);
  assert.match(formatReport(fixed), /VERDICT: no observed external paid calls/);
});

test('all-time suspects with no window calls are still named in the report', () => {
  const { rows } = fixture();
  const summary = summarize({
    lifecycleCounts: { quote_issued: 10, settled: 1 },
    settledRows: [settled(BOB, '2026-11-04T09:00:00.000Z')],
    classificationRows: rows,
    now: NOW,
    windowLabel: 'last 7 days',
  });
  assert.equal(summary.externalPaidCalls, 1);
  assert.deepEqual(summary.suspectedSelfPayers, [OPS]);
  assert.ok(summary.excludedPayers.includes(OPS));
  const report = formatReport(summary);
  assert.match(report, /suspected from all-time, no calls in window: 0x11111111…111111/);
  assert.match(report, /Suspected is a heuristic; pass --self/);
});

test('a truncated classification set is surfaced as a warning', () => {
  const summary = summarize({
    settledRows: [],
    classificationRows: [],
    classificationTruncated: true,
    now: NOW,
  });
  assert.equal(summary.classificationTruncated, true);
  assert.match(formatReport(summary), /WARNING: classification rows hit the fetch cap/);
  assert.doesNotThrow(() => JSON.stringify(summary));
});

test('formatReport is JSON-safe and carries the headline numbers', () => {
  const { rows, lifecycleCounts } = fixture();
  const summary = summarize({ lifecycleCounts, settledRows: rows, now: NOW });
  const report = formatReport(summary, { proxy: 'direct' });
  assert.match(report, /External paid calls \(excl\. self\/suspected\): 3/);
  assert.match(report, /Unique external payers:                     2/);
  assert.match(report, /13d ago/);
  assert.match(report, /quote -> settled           15%/);
  assert.doesNotThrow(() => JSON.stringify(summary));
});
