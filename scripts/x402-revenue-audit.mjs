#!/usr/bin/env node
/**
 * Read-only x402 revenue audit.
 *
 * Answers one question: how many paid calls came from wallets that are not
 * ours? The data already lives in `public.x402_settlements` (production
 * lifecycle ledger since migration 0077); this script does not create or
 * modify anything. See docs/operations/x402-settlement-ops.md §2.4.
 *
 * Usage:
 *   npm run audit:x402
 *   node scripts/x402-revenue-audit.mjs --all
 *   node scripts/x402-revenue-audit.mjs --days=7 --self=0xabc...,0xdef... --json
 *
 * Credentials come from the environment or the git-ignored .env.local.
 * Nothing secret is printed. On hosts where outbound HTTPS needs a local
 * proxy, candidates are probed in order and the first working one is used.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import {
  LIFECYCLE_STATUSES,
  formatReport,
  parseAuditArgs,
  parseSelfPayers,
  summarize,
} from './lib/x402-revenue-core.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(new URL('./', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const PAGE_SIZE = 1000;
const MAX_SETTLED_ROWS = 20000;
const PROBE_TIMEOUT_MS = 8000;

function loadLocalEnv() {
  const env = {};
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

function proxyCandidates(explicit) {
  const candidates = [];
  const add = (value) => {
    if (value && !candidates.includes(value)) candidates.push(value);
  };
  add(explicit);
  add(process.env.HTTPS_PROXY);
  add(process.env.https_proxy);
  // Last-resort candidate only. Every candidate is probed against the actual
  // Supabase REST endpoint; a listening port is never assumed to work.
  add('http://127.0.0.1:7890');
  add(null); // direct connection
  return candidates;
}

function clientFor(url, key, proxy) {
  const options = { auth: { persistSession: false } };
  if (proxy) {
    // `undici` is pinned by the `overrides` block in package.json and ships in
    // the dependency tree; knip.json lists it under ignoreDependencies. This
    // stays a soft dependency: when it is unavailable the proxy path is
    // skipped and resolveClient reports the failure instead of crashing.
    let undici;
    try {
      undici = require('undici');
    } catch {
      return null;
    }
    if (typeof undici.ProxyAgent !== 'function' || typeof undici.fetch !== 'function') return null;
    const dispatcher = new undici.ProxyAgent(proxy);
    options.global = {
      fetch: (input, init) => undici.fetch(input, { ...init, dispatcher }),
    };
  }
  return createClient(url, key, options);
}

async function resolveClient(url, key, candidates) {
  const failures = [];
  for (const proxy of candidates) {
    const client = clientFor(url, key, proxy);
    if (!client) {
      failures.push(`${proxy ?? 'direct'}: undici ProxyAgent unavailable`);
      continue;
    }
    try {
      const { error } = await client
        .from('x402_settlements')
        .select('id', { count: 'exact', head: true })
        .abortSignal(AbortSignal.timeout(PROBE_TIMEOUT_MS));
      if (!error) return { client, proxy: proxy ?? 'direct' };
      failures.push(`${proxy ?? 'direct'}: ${error.message}`);
    } catch (error) {
      failures.push(
        `${proxy ?? 'direct'}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  throw new Error(
    `cannot reach Supabase x402_settlements through any transport.\n` +
      failures.map((line) => `  - ${line}`).join('\n') +
      `\nPass a working proxy with --proxy=http://127.0.0.1:<port>.`
  );
}

async function lifecycleCounts(client, since) {
  const counts = {};
  for (const status of LIFECYCLE_STATUSES) {
    let query = client
      .from('x402_settlements')
      .select('id', { count: 'exact', head: true })
      .eq('status', status);
    if (since) query = query.gte('created_at', since);
    const { count, error } = await query;
    if (error) throw new Error(`count query failed for ${status}: ${error.message}`);
    counts[status] = count ?? 0;
  }
  return counts;
}

async function settledRows(client, since) {
  const rows = [];
  let truncated = false;
  for (let from = 0; from < MAX_SETTLED_ROWS; from += PAGE_SIZE) {
    let query = client
      .from('x402_settlements')
      .select(
        'id, created_at, status, payer, amount_usdc, network, resource, surface, acquisition_source, tx_hash'
      )
      .eq('status', 'settled');
    if (since) query = query.gte('created_at', since);
    // A second sort key keeps offset pagination deterministic when rows share
    // the same created_at timestamp.
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`settled query failed: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    if (from + PAGE_SIZE >= MAX_SETTLED_ROWS) {
      truncated = true;
      break;
    }
  }
  return { rows, truncated };
}

function help() {
  return [
    'Read-only x402 revenue audit (public.x402_settlements).',
    '',
    'Options:',
    '  --days=N             Window in days (default 30).',
    '  --all                All time, ignoring --days.',
    '  --self=addr[,addr]   Wallets you own; always excluded from the headline.',
    '  --include-suspected  Do not exclude heuristically detected ops wallets.',
    '  --proxy=URL          Force a proxy; otherwise candidates are probed.',
    '  --json               Machine-readable summary instead of a text report.',
    '',
    'Ops/self wallet detection always uses all-time settled rows, even with',
    '--days=N, so a short window cannot misclassify a known ops wallet as a',
    'new external payer. The funnel and headline remain window-scoped.',
    '',
    'Credentials: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY',
    'from the environment or .env.local. Nothing secret is printed.',
  ].join('\n');
}

async function main() {
  const args = parseAuditArgs(process.argv.slice(2));
  if (args.help) {
    console.log(help());
    return;
  }

  const localEnv = loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || localEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const now = new Date();
  const since = args.all ? null : new Date(now.getTime() - args.days * 86400000).toISOString();
  const windowLabel = args.all
    ? 'all time'
    : `last ${args.days} days (since ${since.slice(0, 10)})`;

  const { client, proxy } = await resolveClient(url, key, proxyCandidates(args.proxy));
  // Always classify self/ops wallets against all-time settled rows. A short
  // window makes a dominant ops wallet look like a fresh one-off external
  // payer, which would turn the headline into a false positive.
  const [counts, settled] = await Promise.all([
    lifecycleCounts(client, since),
    settledRows(client, null),
  ]);
  const allSettledRows = settled.rows;
  const sinceMs = since ? Date.parse(since) : null;
  const rows = sinceMs
    ? allSettledRows.filter((row) => {
        const at = Date.parse(row.created_at);
        return Number.isFinite(at) && at >= sinceMs;
      })
    : allSettledRows;
  const classificationTruncated = settled.truncated;

  const selfPayers = parseSelfPayers(args.self || process.env.X402_SELF_PAYERS || '');
  const summary = summarize({
    lifecycleCounts: counts,
    settledRows: rows,
    classificationRows: allSettledRows,
    classificationTruncated,
    selfPayers,
    includeSuspected: args.includeSuspected,
    now,
    windowLabel,
  });
  summary.transport = proxy;

  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else console.log(formatReport(summary, { proxy }));
}

main().catch((error) => {
  console.error(
    `x402 revenue audit failed: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
