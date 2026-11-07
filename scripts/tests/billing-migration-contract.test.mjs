import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// 0126 rebuilt several credit functions from a schema snapshot. It silently
// dropped `budget_warning` from precheck_credits, which 0125 had added.
// This test snapshots the FINAL contract of the whole billing migration chain,
// so any future migration that rebuilds a function from an older snapshot and
// loses a signature, a return field, a CHECK value, or a column fails here.
const CHAIN = [
  '0039_credit_wallet.sql',
  '0042_consume_credits_row_lock.sql',
  '0123_credit_rebase_v1.sql',
  '0124_monthly_trial_grant.sql',
  '0125_precheck_budget_warning.sql',
  '0126_credit_ledger_semantics.sql',
  '0127_restore_budget_warning.sql',
];

const CONTRACT = {
  add_monthly_credits: { args: '', result: 'integer' },
  consume_credits: {
    args: 'p_key_id uuid, p_cost numeric, p_metering_key text, p_ref text, p_source text, p_reason text, p_request_id text, p_meta jsonb',
    result: 'jsonb',
    fields: ['balance', 'budget', 'cost', 'idempotent', 'ok', 'reason', 'used'],
  },
  precheck_credits: {
    args: 'p_key_id uuid, p_cost numeric',
    result: 'jsonb',
    fields: ['balance', 'budget', 'budget_warning', 'cost', 'ok', 'reason', 'used'],
  },
  record_pending_settlement: {
    args: 'p_key_id uuid, p_cost numeric, p_metering_key text, p_ref text, p_source text, p_reason text, p_request_id text, p_meta jsonb, p_error text',
    result: 'bigint',
  },
  record_waived_credit: {
    args: 'p_key_id uuid, p_metering_key text, p_ref text, p_source text, p_reason text, p_request_id text, p_meta jsonb',
    result: 'jsonb',
    fields: ['balance', 'idempotent', 'ok', 'reason', 'waived'],
  },
  settle_pending_credits: {
    args: 'p_limit integer',
    result: 'jsonb',
    fields: ['abandoned', 'pending', 'settled'],
  },
  top_up_credits: {
    args: 'p_user_id uuid, p_amount numeric, p_metering_key text, p_kind text, p_ref text, p_source text, p_reason text, p_request_id text, p_meta jsonb',
    result: 'numeric',
  },
};

const LEDGER_CHECKS = {
  credit_ledger_kind_check: ['topup', 'usage', 'refund', 'grant', 'waiver'],
  credit_ledger_source_check: ['signup', 'x402', 'subscription', 'wallet', 'free'],
};

const LEDGER_COLUMNS = [
  'delta',
  'balance_after',
  'metering_key',
  'kind',
  'period_month',
  'source',
  'reason',
  'request_id',
  'meta',
];

async function boot(migrations) {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE public.api_keys(id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users(id), plan text);
    CREATE TABLE public.subscriptions(id uuid PRIMARY KEY, user_id uuid, plan text, interval text, status text, current_period_end timestamptz);`);
  for (const migration of migrations) {
    await db.exec(
      await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8')
    );
  }
  return db;
}

// Every string literal used as the key of a jsonb_build_object(...) call.
function jsonbKeys(source) {
  const keys = new Set();
  const marker = 'jsonb_build_object(';
  let cursor = 0;
  while ((cursor = source.indexOf(marker, cursor)) !== -1) {
    const start = cursor + marker.length;
    let depth = 1;
    let quoted = false;
    let end = start;
    for (; end < source.length && depth > 0; end++) {
      const char = source[end];
      if (char === "'") quoted = !quoted;
      else if (!quoted && char === '(') depth++;
      else if (!quoted && char === ')') depth--;
    }
    const inner = source.slice(start, end - 1);
    let parens = 0;
    let inQuote = false;
    let partStart = 0;
    const parts = [];
    for (let i = 0; i <= inner.length; i++) {
      const char = inner[i];
      if (char === "'") inQuote = !inQuote;
      else if (!inQuote && char === '(') parens++;
      else if (!inQuote && char === ')') parens--;
      if ((char === ',' && parens === 0 && !inQuote) || i === inner.length) {
        parts.push(inner.slice(partStart, i));
        partStart = i + 1;
      }
    }
    for (const part of parts) {
      const key = part.trim().match(/^'([a-z_]+)'$/);
      if (key) keys.add(key[1]);
    }
    cursor = end;
  }
  return [...keys].sort();
}

test('the final billing migration chain keeps every function signature and return field', async () => {
  const db = await boot(CHAIN);
  try {
    const { rows } = await db.query(
      `SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
              pg_get_function_result(p.oid) AS result, p.prosrc
         FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = ANY($1)
        ORDER BY p.proname`,
      [Object.keys(CONTRACT)]
    );

    for (const [name, expected] of Object.entries(CONTRACT)) {
      const matches = rows.filter((row) => row.proname === name);
      // A stale overload left behind by DROP/CREATE would make PostgREST
      // ambiguous, so exactly one definition per name is part of the contract.
      assert.equal(matches.length, 1, `${name}: expected exactly one definition`);
      const fn = matches[0];
      assert.equal(fn.args, expected.args, `${name}: signature changed`);
      assert.equal(fn.result, expected.result, `${name}: return type changed`);
      if (expected.fields) {
        assert.deepEqual(jsonbKeys(fn.prosrc), expected.fields, `${name}: return fields changed`);
      }
    }

    const checks = await db.query(
      `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
        WHERE conrelid = 'public.credit_ledger'::regclass AND contype = 'c'`
    );
    for (const [name, allowed] of Object.entries(LEDGER_CHECKS)) {
      const check = checks.rows.find((row) => row.conname === name);
      assert.ok(check, `credit_ledger: missing ${name}`);
      const values = [...check.def.matchAll(/'([a-z0-9_]+)'(?:::text)?/g)].map((m) => m[1]).sort();
      assert.deepEqual(values, [...allowed].sort(), `${name}: allowed values changed`);
    }

    const columns = await db.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'credit_ledger'`
    );
    const present = new Set(columns.rows.map((row) => row.column_name));
    for (const column of LEDGER_COLUMNS) {
      assert.ok(present.has(column), `credit_ledger: missing column ${column}`);
    }
  } finally {
    await db.close();
  }
});

test('no migration after the chain redefines the contract behind its back', async () => {
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  const last = CHAIN[CHAIN.length - 1];
  const later = (await readdir(dir)).filter((file) => file.endsWith('.sql') && file > last).sort();

  for (const file of later) {
    const sql = await readFile(new URL(file, dir), 'utf8');
    for (const name of Object.keys(CONTRACT)) {
      const redefines = new RegExp(`CREATE OR REPLACE FUNCTION "public"\\."${name}"`);
      assert.equal(redefines.test(sql), false, `${file} redefines ${name}; add it to CHAIN`);
    }
    assert.equal(
      /ALTER TABLE "public"\."credit_ledger"/.test(sql),
      false,
      `${file} alters credit_ledger; add it to CHAIN`
    );
  }
});
