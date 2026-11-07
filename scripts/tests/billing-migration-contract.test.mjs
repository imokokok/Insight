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
  '0128_waiver_comment.sql',
  '0129_product_24h_concurrency_caps.sql',
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
    CREATE TABLE public.subscriptions(id uuid PRIMARY KEY, user_id uuid, plan text, interval text, status text, current_period_end timestamptz);
    CREATE TABLE public.oracle_watch_windows(id uuid PRIMARY KEY, api_key_id uuid, status text, expires_at timestamptz);
    CREATE TABLE public.position_lifecycles(id uuid PRIMARY KEY, api_key_id uuid, status text, expires_at timestamptz);`);
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

test('record_waived_credit documents the current zero-charge vocabulary', async () => {
  const db = await boot(CHAIN);
  try {
    const { rows } = await db.query(
      `SELECT obj_description(
          'public.record_waived_credit(uuid,text,text,text,text,text,jsonb)'::regprocedure,
          'pg_proc'
        ) AS comment`
    );
    const comment = rows[0].comment;
    assert.ok(comment, 'record_waived_credit has no comment');
    assert.match(comment, /upstream_failed/, `missing upstream_failed: ${comment}`);
    assert.equal(/no[_-]data/i.test(comment), false, `retired no_data wording: ${comment}`);
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

test('0129 caps match the service constants and fire only on INSERT', async () => {
  const codeLimits = await readFile(
    new URL('../../src/lib/api/services/productLimits.ts', import.meta.url),
    'utf8'
  );
  const codeCap = (name) => {
    const match = codeLimits.match(new RegExp(`${name}:\\s*(\\d+)`));
    assert.ok(match, `productLimits.ts: missing ${name}`);
    return Number(match[1]);
  };
  const limits = {
    enforce_product_window_cap: codeCap('maxOpenWindowsPerKey'),
    enforce_product_lifecycle_cap: codeCap('maxOpenLifecyclesPerKey'),
  };

  const db = await boot(CHAIN);
  try {
    const { rows } = await db.query(`
      SELECT t.tgname, t.tgtype, pg_get_triggerdef(t.oid) AS def, p.prosrc
        FROM pg_trigger t
        JOIN pg_proc p ON p.oid = t.tgfoid
       WHERE t.tgrelid IN ('public.oracle_watch_windows'::regclass, 'public.position_lifecycles'::regclass)
         AND NOT t.tgisinternal
       ORDER BY t.tgname`);

    assert.equal(rows.length, 2, 'expected exactly the two product-cap triggers');
    for (const [name, cap] of Object.entries(limits)) {
      const trigger = rows.find((row) => row.tgname === name);
      assert.ok(trigger, `missing trigger ${name}`);
      // tgtype bits: 1 = ROW, 2 = BEFORE, 4 = INSERT, 8 = DELETE, 16 = UPDATE, 32 = TRUNCATE.
      assert.equal(trigger.tgtype & 1, 1, `${name}: must be FOR EACH ROW`);
      assert.equal(trigger.tgtype & 2, 2, `${name}: must be BEFORE`);
      assert.equal(trigger.tgtype & 4, 4, `${name}: must fire on INSERT`);
      assert.equal(trigger.tgtype & (8 | 16 | 32), 0, `${name}: must not fire on UPDATE/DELETE/TRUNCATE`);
      assert.match(trigger.def, /BEFORE INSERT ON public\./, `${name}: unexpected trigger definition`);
      assert.match(trigger.prosrc, /pg_advisory_xact_lock\(/, `${name}: missing advisory lock`);
      assert.match(trigger.prosrc, /hashtextextended\(/, `${name}: lock key must be per API key`);
      assert.match(trigger.prosrc, /product_concurrency_limit/, `${name}: refusal prefix changed`);
      assert.match(trigger.prosrc, /ERRCODE = 'check_violation'/, `${name}: error code changed`);
      assert.match(
        trigger.prosrc,
        new RegExp(`active_count >= ${cap}\\b`),
        `${name}: cap drifted from productLimits.ts (${cap})`
      );
    }

    const key = '11111111-1111-4111-8111-111111111111';
    const insertWindow = (apiKeyId) =>
      db.query(
        `INSERT INTO public.oracle_watch_windows(id, api_key_id, status, expires_at)
         VALUES (gen_random_uuid(), $1, 'active', now() + interval '24 hours')`,
        [apiKeyId]
      );

    // Expired rows do not occupy a slot, even while status stays 'active'.
    for (let i = 0; i < 10; i++) {
      await db.query(
        `INSERT INTO public.oracle_watch_windows(id, api_key_id, status, expires_at)
         VALUES (gen_random_uuid(), $1, 'active', now() - interval '1 hour')`,
        [key]
      );
    }

    // Five is the promise: five concurrent windows are accepted, the sixth is refused.
    for (let i = 0; i < limits.enforce_product_window_cap; i++) await insertWindow(key);
    await assert.rejects(insertWindow(key), /product_concurrency_limit: open_windows limit 5/);

    // Keyless x402 buyers are pre-paid per window and carry no key-level inventory.
    for (let i = 0; i < 10; i++) await insertWindow(null);

    const insertLifecycle = (apiKeyId) =>
      db.query(
        `INSERT INTO public.position_lifecycles(id, api_key_id, status, expires_at)
         VALUES (gen_random_uuid(), $1, 'active', now() + interval '24 hours')`,
        [apiKeyId]
      );
    for (let i = 0; i < limits.enforce_product_lifecycle_cap; i++) await insertLifecycle(key);
    await assert.rejects(
      insertLifecycle(key),
      /product_concurrency_limit: open_lifecycles limit 3/
    );
  } finally {
    await db.close();
  }
});
