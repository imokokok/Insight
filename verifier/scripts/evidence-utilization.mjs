#!/usr/bin/env node
/**
 * Evidence utilization rate — the verification-visibility metric that does NOT
 * depend on anyone telling us they verified something.
 *
 * THE PROBLEM
 * -----------
 * Once verification runs locally (in this package, in a partner's own service,
 * in a contract), Insight cannot count verifications. Client-side telemetry
 * could recover some of that, but only from callers who opt in, and an
 * unauthenticated public counter is trivially gameable — useless as a business
 * metric.
 *
 * THE METRIC
 * ----------
 *   Of the attestations Insight issued, how many came back attached to a real
 *   execution?
 *
 *   numerator   = issued attestations whose uid appears as
 *                 execution_receipts.pre_trade_uid
 *   denominator = all issued attestations (pre_trade_checks.attestation_uid)
 *
 * Measured entirely from data Insight already holds. Zero client cooperation.
 * Cannot be inflated by a third party, because the numerator only moves when
 * Insight itself issues a receipt. Survives verification moving fully local,
 * which is the thing we actually want to know.
 *
 * This is the number to put in front of a partner or an investor. Telemetry is
 * the long tail on top of it.
 *
 * USAGE
 *   node verifier/scripts/evidence-utilization.mjs [--days 30] [--json]
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
 * insight/.env.local. Read-only: no writes, no schema changes.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE_SIZE = 1000;

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { days: 30, json: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--days') out.days = Number(argv[i + 1]);
    if (argv[i] === '--json') out.json = true;
  }
  if (!Number.isFinite(out.days) || out.days <= 0) {
    throw new Error(`--days must be a positive number, got: ${argv[argv.indexOf('--days') + 1]}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Minimal .env.local parser (no dotenv dependency in this package). */
function loadEnv() {
  const envPath = resolve(HERE, '..', '..', '.env.local');
  let raw;
  try {
    raw = readFileSync(envPath, 'utf8');
  } catch {
    throw new Error(
      `Cannot read ${envPath}\n` +
        `This script needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.`
    );
  }

  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  return { url: url.replace(/\/$/, ''), key };
}

// ---------------------------------------------------------------------------
// PostgREST with mandatory paging
// ---------------------------------------------------------------------------

/**
 * Supabase truncates responses at db-max-rows (default 1000) SILENTLY — HTTP
 * stays 20x and only the content-range header reveals the truth. Always page.
 */
async function pagedFetch({ url, key, table, select, filters = {} }) {
  const rows = [];
  let start = 0;
  let total = null;

  for (;;) {
    const target = new URL(`${url}/rest/v1/${table}`);
    target.searchParams.set('select', select);
    for (const [k, v] of Object.entries(filters)) target.searchParams.append(k, v);

    const res = await fetch(target, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${start}-${start + PAGE_SIZE - 1}`,
        Prefer: 'count=exact',
      },
    });

    if (!res.ok && res.status !== 206) {
      throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    }

    const batch = await res.json();
    if (!Array.isArray(batch)) throw new Error(`${table}: unexpected response shape`);
    rows.push(...batch);

    const range = res.headers.get('content-range');
    if (!range) break; // server did not report a total; single page
    const [, countPart] = range.split('/');
    if (!countPart || countPart === '*') break;

    total = Number(countPart);
    start += PAGE_SIZE;
    if (batch.length === 0 || start >= total) break;
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  const { url, key } = loadEnv();

  const since = new Date(Date.now() - args.days * 86_400_000).toISOString();

  // Attestations issued in the window.
  const issued = await pagedFetch({
    url,
    key,
    table: 'pre_trade_checks',
    select: 'attestation_uid,created_at',
    filters: {
      attestation_uid: 'not.is.null',
      created_at: `gte.${since}`,
    },
  });

  // Executions that bound themselves to an attestation. Pulled unfiltered by
  // time: an execution can land after its pre-trade check, and we join on uid,
  // so the window is already enforced by the issued side.
  const executions = await pagedFetch({
    url,
    key,
    table: 'execution_receipts',
    select: 'pre_trade_uid',
    filters: { pre_trade_uid: 'not.is.null' },
  });

  const executionUids = new Set();
  for (const row of executions) {
    if (row.pre_trade_uid) executionUids.add(row.pre_trade_uid);
  }

  const issuedUids = new Set(issued.map((r) => r.attestation_uid).filter(Boolean));
  let paired = 0;
  for (const uid of issuedUids) {
    if (executionUids.has(uid)) paired += 1;
  }

  const rate = issuedUids.size === 0 ? null : paired / issuedUids.size;

  const report = {
    windowDays: args.days,
    since,
    attestationsIssued: issuedUids.size,
    pairedWithExecution: paired,
    utilizationRate: rate,
    executionRowsScanned: executions.length,
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  const pct = rate === null ? 'n/a' : `${(rate * 100).toFixed(1)}%`;
  process.stdout.write(
    [
      '',
      `Evidence utilization — last ${args.days} days (since ${since.slice(0, 10)})`,
      '-'.repeat(56),
      `Attestations issued          ${issuedUids.size}`,
      `Paired with an execution    ${paired}`,
      `Utilization rate            ${pct}`,
      '',
      'Read this as: of the receipts we issued, how many came back attached to',
      'a real execution. It is measured only from data Insight already holds,',
      'so no third party can inflate it and no client cooperation is required.',
      '',
    ].join('\n')
  );
}

main().catch((error) => {
  process.stderr.write(`\n${error.message}\n`);
  process.exitCode = 1;
});
