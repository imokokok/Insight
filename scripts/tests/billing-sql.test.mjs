import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('actual billing SQL debits, rejects, replays and restores without duplicate charges', async () => {
  const db = new PGlite();
  let restored;
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE public.api_keys(id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users(id), plan text);
      CREATE TABLE public.subscriptions(user_id uuid,plan text,status text,current_period_end timestamptz);`);
    for (const migration of [
      '0039_credit_wallet.sql',
      '0042_consume_credits_row_lock.sql',
      '0125_precheck_budget_warning.sql',
    ]) {
      await db.exec(
        await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8')
      );
    }
    const user = '00000000-0000-4000-8000-000000000001';
    const key = '00000000-0000-4000-8000-000000000002';
    await db.query('INSERT INTO auth.users VALUES($1)', [user]);
    await db.query("INSERT INTO api_keys(id,user_id,plan) VALUES($1,$2,'developer')", [key, user]);
    await db.query("SELECT top_up_credits($1,20,'test-grant','grant',NULL)", [user]);
    await db.query("SELECT top_up_credits($1,20,'test-grant','grant',NULL)", [user]);
    const charge = async (id, cost = 5, target = db) =>
      (
        await target.query('SELECT consume_credits($1,$2,$3,$4) AS result', [
          key,
          cost,
          id,
          '/test/isolated',
        ])
      ).rows[0].result;
    assert.equal((await charge('call-1')).balance, 15);
    assert.equal((await charge('call-1')).idempotent, true);
    const precheck = async (cost) =>
      (await db.query('SELECT precheck_credits($1,$2) AS result', [key, cost])).rows[0].result;

    // Spend cap: the same read-only gate that blocks at 100% warns at 80%.
    await db.query('UPDATE api_keys SET budget_monthly=100 WHERE id=$1', [key]);
    const quarterUsed = await precheck(5);
    assert.equal(quarterUsed.ok, true);
    assert.equal(Number(quarterUsed.used), 5);
    assert.equal(Number(quarterUsed.budget), 100);
    assert.equal(quarterUsed.budget_warning, false);

    await db.query('UPDATE api_keys SET budget_monthly=8 WHERE id=$1', [key]);
    assert.equal((await precheck(1)).budget_warning, false); // 6 of 8 credits (75%)
    assert.equal((await precheck(2)).budget_warning, true); // 7 of 8 credits (87.5%)
    const capped = await precheck(4);
    assert.equal(capped.ok, false);
    assert.equal(capped.reason, 'BUDGET_EXCEEDED');
    assert.equal(Number(capped.used), 5);
    assert.equal(
      Number((await db.query('SELECT balance FROM credit_wallet')).rows[0].balance),
      15,
      'a rejected precheck must not debit the wallet'
    );

    await db.query('UPDATE api_keys SET budget_monthly=5 WHERE id=$1', [key]);
    assert.equal((await charge('budget-rejected')).reason, 'BUDGET_EXCEEDED');
    await db.query('UPDATE api_keys SET budget_monthly=NULL WHERE id=$1', [key]);
    assert.equal((await charge('insufficient', 100)).reason, 'INSUFFICIENT_CREDITS');
    const batch = await Promise.all(Array.from({ length: 5 }, (_, i) => charge(`parallel-${i}`)));
    assert.equal(batch.filter((result) => result.ok).length, 3);
    assert.equal(Number((await db.query('SELECT balance FROM credit_wallet')).rows[0].balance), 0);
    // Embedded PostgreSQL serializes queries; this exercises SQL accounting,
    // not independent multi-connection lock contention on a hosted database.
    const snapshot = await db.dumpDataDir();
    restored = new PGlite({ loadDataDir: snapshot });
    assert.equal((await charge('call-1', 5, restored)).idempotent, true);
    const reconcile = await readFile(new URL('../credit-reconcile.sql', import.meta.url), 'utf8');
    const result = (await restored.exec(reconcile)).find(
      (item) => item.rows?.[0]?.wallets_checked !== undefined
    ).rows[0];
    assert.equal(Number(result.wallets_checked), 1);
    assert.equal(Number(result.ledger_rows_checked), 5);
    for (const field of [
      'wallet_mismatches',
      'ledger_chain_mismatches',
      'invalid_wallets',
      'missing_wallets',
    ])
      assert.equal(Number(result[field]), 0, field);
  } finally {
    await restored?.close();
    await db.close();
  }
});
