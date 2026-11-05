/**
 * Pure aggregation helpers for the x402 revenue audit.
 *
 * The audit table `public.x402_settlements` is a service-role-only lifecycle
 * ledger (migration 0077 onward). This module contains no I/O so the funnel,
 * self-payer exclusion, and headline numbers can be unit tested offline.
 */

export const LIFECYCLE_STATUSES = [
  'quote_issued',
  'payment_rejected',
  'payment_verified',
  'business_failed',
  'business_succeeded',
  'settled',
  'settlement_failed',
  'verify_failed',
];

export const MISSING_PAYER = '<missing>';

/**
 * CLI argument parsing, kept in the pure module so the value-reading rule is
 * unit tested. Both `--days=7` and `--days 7` must work; with space-separated
 * values it is easy to read argv[i + 1] after the cursor has already advanced.
 */
export function parseAuditArgs(argv = []) {
  const args = {
    days: 30,
    all: false,
    self: '',
    json: false,
    includeSuspected: false,
    proxy: '',
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const eq = token.indexOf('=');
    const name = eq === -1 ? token.slice(2) : token.slice(2, eq);
    const inline = eq === -1 ? null : token.slice(eq + 1);
    const value = () => {
      if (inline !== null) return inline;
      i += 1;
      return argv[i] ?? '';
    };
    if (name === 'help' || name === 'h') args.help = true;
    else if (name === 'all') args.all = true;
    else if (name === 'json') args.json = true;
    else if (name === 'include-suspected') args.includeSuspected = true;
    else if (name === 'days') {
      const parsed = Number.parseInt(value(), 10);
      if (!Number.isFinite(parsed) || parsed <= 0)
        throw new Error('--days must be a positive integer');
      args.days = parsed;
    } else if (name === 'self') args.self = value();
    else if (name === 'proxy') args.proxy = value();
    else throw new Error(`unknown option: --${name}`);
  }
  return args;
}

export function normalizePayer(value) {
  if (typeof value !== 'string') return null;
  const payer = value.trim().toLowerCase();
  return payer.length > 0 ? payer : null;
}

export function parseSelfPayers(value) {
  if (typeof value !== 'string' || value.length === 0) return new Set();
  return new Set(value.split(',').map(normalizePayer).filter(Boolean));
}

export function dayOf(iso) {
  return typeof iso === 'string' && iso.length >= 10 ? iso.slice(0, 10) : 'unknown';
}

function amount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round6(value) {
  return Number(value.toFixed(6));
}

export function payerStats(settledRows) {
  const byPayer = new Map();
  for (const row of settledRows) {
    const payer = normalizePayer(row.payer) ?? MISSING_PAYER;
    let stat = byPayer.get(payer);
    if (!stat) {
      stat = {
        payer,
        calls: 0,
        grossUsdc: 0,
        firstAt: null,
        lastAt: null,
        days: new Set(),
        resources: new Set(),
        networks: new Set(),
      };
      byPayer.set(payer, stat);
    }
    stat.calls += 1;
    stat.grossUsdc += amount(row.amount_usdc);
    const at = typeof row.created_at === 'string' ? row.created_at : null;
    if (at) {
      if (stat.firstAt === null || at < stat.firstAt) stat.firstAt = at;
      if (stat.lastAt === null || at > stat.lastAt) stat.lastAt = at;
      stat.days.add(dayOf(at));
    }
    if (row.resource) stat.resources.add(String(row.resource));
    if (row.network) stat.networks.add(String(row.network));
  }
  return [...byPayer.values()]
    .map((stat) => ({
      payer: stat.payer,
      calls: stat.calls,
      grossUsdc: round6(stat.grossUsdc),
      firstAt: stat.firstAt,
      lastAt: stat.lastAt,
      activeDays: stat.days.size,
      resources: stat.resources.size,
      networks: stat.networks.size,
    }))
    .sort((a, b) => b.calls - a.calls || a.payer.localeCompare(b.payer));
}

/**
 * Heuristic for an operations/test wallet. Such a wallet signs many calls,
 * across many days, resources and networks, and dominates the settled rows.
 * It is a label, never a silent deletion: the report names every excluded
 * payer and `--include-suspected` restores them.
 */
export function suspectedSelfPayers(stats, totalSettled) {
  const suspected = new Set();
  for (const stat of stats) {
    if (stat.payer === MISSING_PAYER) continue;
    const share = totalSettled > 0 ? stat.calls / totalSettled : 0;
    if ((stat.calls >= 10 && stat.activeDays >= 3) || (share >= 0.5 && stat.calls >= 5)) {
      suspected.add(stat.payer);
    }
  }
  return suspected;
}

function byKey(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .map(([key, calls]) => ({ key, calls }));
}

function sumUsdc(rows) {
  return round6(rows.reduce((total, row) => total + amount(row.amount_usdc), 0));
}

/**
 * Build the audit summary. `settledRows` and `lifecycleCounts` must cover the
 * same time window. Only settled rows count as revenue (migration 0079).
 *
 * `classificationRows`, when supplied, is the all-time settled set used only
 * to detect self/operations wallets. Detecting them from a short window is
 * wrong: the same ops wallet that dominates all-time rows looks like a brand
 * new one-off external payer inside a 7-day window, which fabricates demand.
 * Callers should always pass all-time rows; omitting it keeps offline callers
 * and older tests window-scoped.
 */
export function summarize({
  lifecycleCounts = {},
  settledRows = [],
  classificationRows = null,
  classificationTruncated = false,
  selfPayers = new Set(),
  includeSuspected = false,
  now = new Date(),
  windowLabel = 'all time',
} = {}) {
  const lifecycle = {};
  for (const status of LIFECYCLE_STATUSES) lifecycle[status] = lifecycleCounts[status] ?? 0;
  for (const [status, count] of Object.entries(lifecycleCounts)) {
    if (!(status in lifecycle)) lifecycle[status] = count;
  }

  const payers = payerStats(settledRows);
  const baselineRows = classificationRows ?? settledRows;
  const baselineStats = classificationRows ? payerStats(classificationRows) : payers;
  const suspected = suspectedSelfPayers(baselineStats, baselineRows.length);
  const excluded = new Set(selfPayers);
  if (!includeSuspected) for (const payer of suspected) excluded.add(payer);
  if (settledRows.some((row) => normalizePayer(row.payer) === null)) excluded.add(MISSING_PAYER);

  const isExternal = (row) => {
    const payer = normalizePayer(row.payer);
    return payer !== null && !excluded.has(payer);
  };
  const externalRows = settledRows.filter(isExternal);
  const excludedRows = settledRows.filter((row) => !isExternal(row));

  const externalPayers = new Set(externalRows.map((row) => normalizePayer(row.payer)));
  const lastExternalAt = externalRows.reduce((latest, row) => {
    const at = typeof row.created_at === 'string' ? row.created_at : null;
    if (at === null) return latest;
    return latest === null || at > latest ? at : latest;
  }, null);
  const parsedLast = lastExternalAt === null ? NaN : Date.parse(lastExternalAt);
  const daysSinceLastExternal =
    Number.isFinite(parsedLast) && Number.isFinite(now.getTime())
      ? Math.max(0, Math.floor((now.getTime() - parsedLast) / 86400000))
      : null;

  const quotes = lifecycle.quote_issued ?? 0;
  const settled = lifecycle.settled ?? 0;

  return {
    windowLabel,
    generatedAt: now.toISOString(),
    lifecycle,
    quoteToSettledPct: quotes > 0 ? Number(((settled / quotes) * 100).toFixed(3)) : null,
    settledRows: settledRows.length,
    // A mismatch means the paginated fetch missed rows (cap hit / concurrent
    // writes), so the headline cannot be trusted. Always surface it.
    settledRowsMismatch: settledRows.length !== settled,
    grossUsdc: sumUsdc(settledRows),
    externalPaidCalls: externalRows.length,
    uniqueExternalPayers: externalPayers.size,
    externalGrossUsdc: sumUsdc(externalRows),
    excludedCalls: excludedRows.length,
    excludedGrossUsdc: sumUsdc(excludedRows),
    lastExternalAt,
    daysSinceLastExternal,
    selfPayers: [...selfPayers],
    suspectedSelfPayers: [...suspected],
    excludedPayers: [...excluded],
    classificationWindow: classificationRows ? 'all time' : windowLabel,
    classificationRows: baselineRows.length,
    classificationTruncated,
    payers,
    externalByDay: byKey(externalRows, (row) => dayOf(row.created_at)),
    externalByResource: byKey(externalRows, (row) => row.resource ?? null),
    externalBySurface: byKey(externalRows, (row) => row.surface ?? null),
    externalByNetwork: byKey(externalRows, (row) => row.network ?? null),
    externalBySource: byKey(externalRows, (row) => row.acquisition_source ?? null),
  };
}

function pad(value, width) {
  return String(value).padStart(width, ' ');
}

function shortAddress(payer) {
  return payer.length > 18 ? `${payer.slice(0, 10)}…${payer.slice(-6)}` : payer;
}

function section(title) {
  return `\n${title}\n${'-'.repeat(title.length)}`;
}

/** Human-readable report. All numbers come from summarize(); no queries here. */
export function formatReport(summary, { proxy = 'unknown' } = {}) {
  const lines = [];
  lines.push('Insight x402 revenue audit (read-only)');
  lines.push(`Window: ${summary.windowLabel}`);
  lines.push(`Generated: ${summary.generatedAt} | transport: ${proxy}`);
  lines.push(`Source: public.x402_settlements (service-role read)`);

  lines.push(section('Headline'));
  lines.push(`External paid calls (excl. self/suspected): ${summary.externalPaidCalls}`);
  lines.push(`Unique external payers:                     ${summary.uniqueExternalPayers}`);
  lines.push(
    `External gross USDC:                        $${summary.externalGrossUsdc.toFixed(6)}`
  );
  lines.push(
    `Last external payment:                      ${summary.lastExternalAt ?? 'never'}` +
      (summary.daysSinceLastExternal === null ? '' : ` (${summary.daysSinceLastExternal}d ago)`)
  );
  if (summary.externalPaidCalls === 0) {
    lines.push('VERDICT: no observed external paid calls in this window.');
  }

  lines.push(section('Lifecycle funnel'));
  for (const status of LIFECYCLE_STATUSES) {
    lines.push(`  ${status.padEnd(22)} ${pad(summary.lifecycle[status] ?? 0, 8)}`);
  }
  lines.push(`  quote -> settled           ${summary.quoteToSettledPct ?? 'n/a'}%`);
  lines.push(`  settled rows               ${pad(summary.settledRows, 8)}`);
  lines.push(`  gross USDC (all settled)   $${summary.grossUsdc.toFixed(6)}`);
  if (summary.settledRowsMismatch) {
    lines.push(
      `  WARNING: fetched ${summary.settledRows} settled rows but the lifecycle count is ` +
        `${summary.lifecycle.settled ?? 0}; the headline may be incomplete.`
    );
  }

  lines.push(section('Excluded payers (self / suspected)'));
  lines.push(
    `  Ops-wallet detection: ${summary.classificationWindow} ` +
      `(${summary.classificationRows} settled rows), not just this window.`
  );
  if (summary.classificationTruncated) {
    lines.push('  WARNING: classification rows hit the fetch cap; exclusion may be incomplete.');
  }
  if (summary.excludedPayers.length === 0) {
    lines.push('  (none)');
  } else {
    for (const stat of summary.payers) {
      if (!summary.excludedPayers.includes(stat.payer)) continue;
      const tag = summary.selfPayers.includes(stat.payer)
        ? 'self'
        : summary.suspectedSelfPayers.includes(stat.payer)
          ? 'suspected'
          : 'missing-payer';
      lines.push(
        `  ${shortAddress(stat.payer)}  ${pad(stat.calls, 5)} calls  $${stat.grossUsdc.toFixed(6)}  ` +
          `${stat.activeDays}d / ${stat.resources} resources  [${tag}]`
      );
    }
    const windowPayers = new Set(summary.payers.map((stat) => stat.payer));
    const offWindow = summary.suspectedSelfPayers.filter((payer) => !windowPayers.has(payer));
    if (offWindow.length > 0) {
      lines.push(
        `  suspected from all-time, no calls in window: ${offWindow.map(shortAddress).join(', ')}`
      );
    }
  }
  lines.push(
    `  excluded: ${summary.excludedCalls} calls, $${summary.excludedGrossUsdc.toFixed(6)}`
  );
  lines.push(
    '  Suspected is a heuristic; pass --self=<address> to confirm, or --include-suspected to restore.'
  );

  lines.push(section('External payers'));
  const externalStats = summary.payers.filter(
    (stat) => !summary.excludedPayers.includes(stat.payer)
  );
  if (externalStats.length === 0) {
    lines.push('  (none)');
  } else {
    for (const stat of externalStats) {
      lines.push(
        `  ${shortAddress(stat.payer)}  ${pad(stat.calls, 5)} calls  $${stat.grossUsdc.toFixed(6)}  ` +
          `first ${dayOf(stat.firstAt)}  last ${dayOf(stat.lastAt)}`
      );
    }
  }

  const distributions = [
    ['By day (external)', summary.externalByDay],
    ['By resource (external)', summary.externalByResource],
    ['By surface (external)', summary.externalBySurface],
    ['By network (external)', summary.externalByNetwork],
    ['By acquisition source (external)', summary.externalBySource],
  ];
  for (const [title, entries] of distributions) {
    lines.push(section(title));
    if (entries.length === 0) lines.push('  (none)');
    for (const entry of entries.slice(0, 15)) lines.push(`  ${pad(entry.calls, 5)}  ${entry.key}`);
    if (entries.length > 15) lines.push(`  ... ${entries.length - 15} more`);
  }

  return lines.join('\n');
}
