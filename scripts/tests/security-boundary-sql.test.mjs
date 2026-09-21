import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

async function hasPrivilege(db, role, object, privilege, kind = 'table') {
  const checker = `has_${kind}_privilege`;
  const result = await db.query(`SELECT ${checker}($1, $2, $3) AS allowed`, [
    role,
    object,
    privilege,
  ]);
  return result.rows[0].allowed;
}

test('security hardening removes browser writes and unsafe future-object defaults', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;

      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        GRANT ALL ON TABLES TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

      CREATE TABLE public.api_keys (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL,
        plan text NOT NULL,
        rate_limit integer NOT NULL
      );
      CREATE POLICY "Users can create own API keys" ON public.api_keys
        FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Users can delete own API keys" ON public.api_keys
        FOR DELETE USING (auth.uid() = user_id);
      CREATE POLICY "Users can update own API keys" ON public.api_keys
        FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY "Users can view own API keys" ON public.api_keys
        FOR SELECT USING (auth.uid() = user_id);

      CREATE TABLE public.credit_purchases (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL,
        credits numeric(12,2) NOT NULL,
        price_usd numeric(12,2) NOT NULL
      );
      CREATE TABLE public.feed_health_snapshots (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY
      );
      CREATE TABLE public.market_reference_snapshots (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY
      );
    `);

    const migration = await readFile(
      new URL('../../supabase/migrations/0061_security_boundary_hardening.sql', import.meta.url),
      'utf8'
    );
    await db.exec(migration);

    for (const privilege of ['INSERT', 'UPDATE', 'DELETE']) {
      assert.equal(await hasPrivilege(db, 'authenticated', 'public.api_keys', privilege), false);
      assert.equal(
        await hasPrivilege(db, 'authenticated', 'public.credit_purchases', privilege),
        false
      );
    }
    assert.equal(await hasPrivilege(db, 'anon', 'public.api_keys', 'SELECT'), false);
    assert.equal(await hasPrivilege(db, 'authenticated', 'public.api_keys', 'SELECT'), false);
    assert.equal(await hasPrivilege(db, 'anon', 'public.credit_purchases', 'SELECT'), false);
    assert.equal(
      await hasPrivilege(db, 'authenticated', 'public.credit_purchases', 'SELECT'),
      true
    );

    for (const table of ['public.feed_health_snapshots', 'public.market_reference_snapshots']) {
      for (const role of ['anon', 'authenticated']) {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
          assert.equal(await hasPrivilege(db, role, table, privilege), false);
        }
      }
    }

    for (const table of [
      'public.api_keys',
      'public.credit_purchases',
      'public.feed_health_snapshots',
      'public.market_reference_snapshots',
    ]) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        assert.equal(await hasPrivilege(db, 'service_role', table, privilege), true);
      }
    }

    const rls = await db.query(`
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname = ANY(ARRAY[
        'api_keys', 'credit_purchases',
        'feed_health_snapshots', 'market_reference_snapshots'
      ])
    `);
    assert.equal(rls.rows.length, 4);
    assert.ok(rls.rows.every((row) => row.relrowsecurity === true));

    const apiKeyPolicies = await db.query(
      `SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='api_keys'`
    );
    assert.deepEqual(apiKeyPolicies.rows, []);

    await db.exec(`
      CREATE TABLE public.future_internal_table(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY);
      CREATE FUNCTION public.future_internal_function() RETURNS integer
        LANGUAGE sql AS $$ SELECT 1 $$;
    `);

    for (const role of ['anon', 'authenticated']) {
      assert.equal(await hasPrivilege(db, role, 'public.future_internal_table', 'SELECT'), false);
      assert.equal(
        await hasPrivilege(db, role, 'public.future_internal_table_id_seq', 'USAGE', 'sequence'),
        false
      );
      assert.equal(
        await hasPrivilege(db, role, 'public.future_internal_function()', 'EXECUTE', 'function'),
        false
      );
    }
    assert.equal(
      await hasPrivilege(db, 'service_role', 'public.future_internal_table', 'SELECT'),
      true
    );
    assert.equal(
      await hasPrivilege(
        db,
        'service_role',
        'public.future_internal_function()',
        'EXECUTE',
        'function'
      ),
      true
    );
  } finally {
    await db.close();
  }
});
