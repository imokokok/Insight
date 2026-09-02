// Read-only audit of a partner API key's usage against the live Supabase DB.
// Uses the service-role key from .env.local (bypasses RLS, read-only queries).
// Resolve @supabase/supabase-js from the project's own node_modules.
import { createRequire } from 'module';
const require = createRequire('/Users/imokokok/Documents/insight/');
const { createClient } = require('@supabase/supabase-js');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function getArg(name, def) {
  const args = process.argv.slice(2);
  const i = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i === -1) return def;
  const a = args[i];
  if (a.includes('=')) return a.split('=')[1];
  return args[i + 1] ?? def;
}

const name = getArg('name', 'ThoughtProof');
const id = getArg('id', null);
const prefix = getArg('prefix', null);
const days = parseInt(getArg('days', '30'), 10);
const limit = parseInt(getArg('limit', '500'), 10);

// Parse .env.local (KEY=VALUE lines, ignore comments/blank).
const envPath = path.join(root, '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
}
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE = env['SUPABASE_SERVICE_ROLE_KEY'];
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const since = new Date(Date.now() - days * 86400000).toISOString();

function aggregateBy(rows, keyFn) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function dayOf(iso) {
  return iso ? iso.slice(0, 10) : 'unknown';
}

async function main() {
  // 1. Locate the key(s).
  let keyQuery = supabase
    .from('api_keys')
    .select('id, name, key_prefix, last_used_at, expires_at, plan');
  if (id) keyQuery = keyQuery.eq('id', id);
  else if (prefix) keyQuery = keyQuery.eq('key_prefix', prefix);
  else keyQuery = keyQuery.ilike('name', `%${name}%`);

  const { data: keys, error: keyErr } = await keyQuery.order('last_used_at', {
    ascending: false,
  });
  if (keyErr) {
    console.error('Key lookup failed:', keyErr.message);
    process.exit(1);
  }
  if (!keys || keys.length === 0) {
    console.log(
      `No API key matched (name~"${name}"${id ? `, id=${id}` : ''}${prefix ? `, prefix=${prefix}` : ''}).`
    );
    process.exit(0);
  }

  console.log(`\nMatched ${keys.length} key(s) for "${name}":`);
  for (const k of keys) {
    console.log(
      `  - ${k.name} | id=${k.id} | prefix=${k.key_prefix} | last_used=${k.last_used_at ?? 'n/a'} | expires=${k.expires_at ?? 'n/a'} | plan=${k.plan ?? 'n/a'}`
    );
  }

  // Default to the most-recently-used key when several match.
  const chosen = keys[0];
  console.log(`\nUsing: ${chosen.name} (id=${chosen.id})\n`);

  // 2. api_key_usage aggregation.
  const { data: usage, error: uErr } = await supabase
    .from('api_key_usage')
    .select('endpoint, method, status_code, response_time_ms, created_at')
    .eq('api_key_id', chosen.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (uErr) {
    console.error('Usage query failed:', uErr.message);
    process.exit(1);
  }

  console.log(`=== api_key_usage (last ${days}d) ===`);
  console.log(`Total calls: ${usage.length}`);
  if (usage.length > 0) {
    console.log(`First (newest): ${usage[0].created_at}`);
    console.log(`Last  (oldest): ${usage[usage.length - 1].created_at}`);
    console.log('\nBy endpoint:');
    for (const [ep, n] of aggregateBy(usage, (r) => `${r.method} ${r.endpoint}`))
      console.log(`  ${n.toString().padStart(5)}  ${ep}`);
    console.log('\nBy status code:');
    for (const [s, n] of aggregateBy(usage, (r) => r.status_code))
      console.log(`  ${n.toString().padStart(5)}  ${s}`);
    console.log('\nBy day:');
    for (const [d, n] of aggregateBy(usage, (r) => dayOf(r.created_at)))
      console.log(`  ${n.toString().padStart(5)}  ${d}`);
  } else {
    console.log('  (no calls in window)');
  }

  // 3. pre_trade_checks aggregation.
  const { data: checks, error: cErr } = await supabase
    .from('pre_trade_checks')
    .select('verdict, asset, chain_id, action, trade_amount_usd, created_at')
    .eq('api_key_id', chosen.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (cErr) {
    console.error('Checks query failed:', cErr.message);
    process.exit(1);
  }

  console.log(`\n=== pre_trade_checks (last ${days}d) ===`);
  console.log(`Total checks: ${checks.length}`);
  if (checks.length > 0) {
    console.log('\nBy verdict:');
    for (const [v, n] of aggregateBy(checks, (r) => r.verdict))
      console.log(`  ${n.toString().padStart(5)}  ${v}`);
    console.log('\nMost recent 10:');
    for (const c of checks.slice(0, 10)) {
      console.log(
        `  ${c.created_at} | ${c.verdict.padEnd(8)} | ${c.action ?? '?'} | ${c.asset ?? '?'} @ chain ${c.chain_id ?? '?'} | $${c.trade_amount_usd ?? '?'}`
      );
    }
  } else {
    console.log('  (no checks in window)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
