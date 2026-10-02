import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const ownerKey = '10000000-0000-4000-8000-000000000001';
const otherKey = '10000000-0000-4000-8000-000000000002';
const auditTables = ['pre_trade_checks', 'execution_receipts', 'oracle_watch_checks'];

test('audit RLS reads require ownership without exposing API keys', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
      CREATE TABLE public.api_keys(id uuid PRIMARY KEY, user_id uuid NOT NULL);
      INSERT INTO public.api_keys(id,user_id) VALUES
        ('${ownerKey}','${owner}'), ('${otherKey}','${other}');
      ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON public.api_keys FROM PUBLIC, anon, authenticated;
    `);
    for (const table of auditTables) {
      const nullBypass = table === 'oracle_watch_checks' ? 'api_key_id IS NULL OR ' : '';
      await db.exec(`
        CREATE TABLE public.${table}(id integer PRIMARY KEY, api_key_id uuid);
        INSERT INTO public.${table}(id,api_key_id) VALUES
          (1,'${ownerKey}'), (2,'${otherKey}'), (3,NULL);
        ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
        CREATE POLICY users_view_own_${table} ON public.${table}
          FOR SELECT USING (${nullBypass}api_key_id IN
            (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
        GRANT ALL ON public.${table} TO anon, authenticated, service_role;
      `);
    }

    await db.exec(`SET request.jwt.claim.sub = '${owner}'; SET ROLE authenticated;`);
    await assert.rejects(
      db.query('SELECT id FROM public.pre_trade_checks'),
      /permission denied for table api_keys/
    );
    await db.exec('RESET ROLE');

    const migration = await readFile(
      new URL('../../supabase/migrations/0071_audit_rls_key_ownership.sql', import.meta.url),
      'utf8'
    );
    await db.exec(migration);

    const privileges = (
      await db.query(`
        SELECT has_table_privilege('authenticated','public.api_keys','SELECT') AS key_read,
          has_schema_privilege('anon','insight_private','USAGE') AS anon_schema,
          has_schema_privilege('authenticated','insight_private','USAGE') AS auth_schema,
          has_function_privilege('anon','insight_private.owns_api_key(uuid)','EXECUTE') AS anon_fn,
          has_function_privilege('authenticated','insight_private.owns_api_key(uuid)','EXECUTE') AS auth_fn;
      `)
    ).rows[0];
    assert.deepEqual(privileges, {
      key_read: false,
      anon_schema: false,
      auth_schema: true,
      anon_fn: false,
      auth_fn: true,
    });

    await db.exec(`SET request.jwt.claim.sub = '${owner}'; SET ROLE authenticated;`);
    for (const table of auditTables) {
      assert.deepEqual((await db.query(`SELECT id FROM public.${table} ORDER BY id`)).rows, [
        { id: 1 },
      ]);
    }
    await assert.rejects(db.query('SELECT * FROM public.api_keys'), /permission denied/);
    await db.exec('RESET ROLE');

    await db.exec(`SET request.jwt.claim.sub = '${other}'; SET ROLE authenticated;`);
    for (const table of auditTables) {
      assert.deepEqual((await db.query(`SELECT id FROM public.${table} ORDER BY id`)).rows, [
        { id: 2 },
      ]);
    }
    await db.exec('RESET ROLE');

    await db.exec('RESET request.jwt.claim.sub; SET ROLE authenticated;');
    for (const table of auditTables) {
      assert.deepEqual((await db.query(`SELECT id FROM public.${table}`)).rows, []);
    }
    await db.exec('RESET ROLE; SET ROLE anon;');
    for (const table of auditTables) {
      await assert.rejects(db.query(`SELECT id FROM public.${table}`), /permission denied/);
    }
    await db.exec('RESET ROLE; SET ROLE service_role;');
    for (const table of auditTables) {
      assert.equal((await db.query(`SELECT id FROM public.${table}`)).rows.length, 3);
    }
  } finally {
    await db.close();
  }
});
