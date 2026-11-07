import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// 0125 introduced `budget_warning`; 0126 re-created precheck_credits from a
// snapshot taken before 0125 and dropped it. 0127 restores it. This test pins
// the full production migration order so the regression cannot come back.
const MIGRATIONS = [
  '0039_credit_wallet.sql',
  '0042_consume_credits_row_lock.sql',
  '0125_precheck_budget_warning.sql',
  '0126_credit_ledger_semantics.sql',
];

async function boot(migrations) {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE public.api_keys(id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users(id), plan text);
    CREATE TABLE public.subscriptions(user_id uuid,plan text,status text,current_period_end timestamptz);`);
  for (const migration of migrations) {
    await db.exec(
      await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8')
    );
  }
  const user = '00000000-0000-4000-8000-000000000011';
  const key = '00000000-0000-4000-8000-000000000012';
  await db.query('INSERT INTO auth.users VALUES($1)', [user]);
  await db.query("INSERT INTO public.api_keys(id,user_id,plan) VALUES($1,$2,'developer')", [
    key,
    user,
  ]);
  await db.query('INSERT INTO public.credit_wallet(user_id, balance) VALUES($1, 20)', [user]);
  await db.query('UPDATE public.api_keys SET budget_monthly=8 WHERE id=$1', [key]);
  const precheck = async (cost) =>
    (await db.query('SELECT precheck_credits($1,$2) AS result', [key, cost])).rows[0].result;
  return { db, precheck };
}

test('0127 restores the 80% spend-cap signal that 0126 drops', async () => {
  const withoutFix = await boot(MIGRATIONS);
  try {
    const result = await withoutFix.precheck(7);
    assert.equal(
      'budget_warning' in result,
      false,
      '0126 alone drops budget_warning — 0127 must stay in the migration chain'
    );
  } finally {
    await withoutFix.db.close();
  }

  const withFix = await boot([...MIGRATIONS, '0127_restore_budget_warning.sql']);
  try {
    assert.equal((await withFix.precheck(1)).budget_warning, false); // 1 of 8 credits
    assert.equal((await withFix.precheck(7)).budget_warning, true); // 7 of 8 credits

    const capped = await withFix.precheck(9);
    assert.equal(capped.ok, false);
    assert.equal(capped.reason, 'BUDGET_EXCEEDED');
  } finally {
    await withFix.db.close();
  }
});
