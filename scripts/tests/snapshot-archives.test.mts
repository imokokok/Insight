import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('compressed snapshot history is lossless, transactional, replay-safe and private', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE price_snapshots(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        snapshot_ts timestamptz NOT NULL,snapshot_hour timestamptz NOT NULL,provider text NOT NULL,
        symbol text NOT NULL,chain_id integer NOT NULL,price numeric(24,8),consensus_price numeric,
        deviation_pct numeric,data_age_seconds integer,confidence numeric,is_success boolean,error_message text,
        created_at timestamptz DEFAULT now());
      CREATE UNIQUE INDEX fine_unique ON price_snapshots(snapshot_ts,provider,symbol,chain_id);
      CREATE TABLE hourly_price_snapshots(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        snapshot_hour timestamptz NOT NULL,provider text NOT NULL,symbol text NOT NULL,chain_id integer NOT NULL,
        price numeric(24,8),is_success boolean,error_message text,created_at timestamptz DEFAULT now());
      CREATE UNIQUE INDEX hourly_unique ON hourly_price_snapshots(snapshot_hour,provider,symbol,chain_id);
      CREATE TABLE oracle_feeds(provider text,symbol text,chain_id integer,is_active boolean,
        observed_data_age_p90_s integer,observed_cadence_updated_at timestamptz);
      GRANT SELECT,UPDATE,DELETE ON price_snapshots,hourly_price_snapshots TO service_role;
      INSERT INTO price_snapshots(snapshot_ts,snapshot_hour,provider,symbol,chain_id,price,
        consensus_price,deviation_pct,data_age_seconds,confidence,is_success,error_message)
      SELECT ((now() AT TIME ZONE 'UTC')::date-9)::timestamp AT TIME ZONE 'UTC' +
        (v%96)*interval '15 minutes',
        date_trunc('hour',((now() AT TIME ZONE 'UTC')::date-9)::timestamp AT TIME ZONE 'UTC' +
          (v%96)*interval '15 minutes'),
        'chainlink','ASSET'||(v/96),CASE WHEN v%2=0 THEN 1 ELSE 8453 END,
        123.12345678,120,-0.3333,20,0.9876,v%5<>0,
        CASE WHEN v%5=0 THEN '失败 "source" \\ unicode' ELSE NULL END
      FROM generate_series(0,2100) v;
      INSERT INTO hourly_price_snapshots(snapshot_hour,provider,symbol,chain_id,price,is_success,error_message)
      SELECT date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'-interval '9 days'+v*interval '1 hour',
        'dia','ETH',1,100+v,v%3<>0,CASE WHEN v%3=0 THEN 'timeout' ELSE NULL END
      FROM generate_series(0,23) v;
    `);
    const migration = await readFile(
      new URL('../../supabase/migrations/0064_compressed_snapshot_history.sql', import.meta.url),
      'utf8'
    );
    await db.exec(migration);
    await db.exec(migration);
    const fine = (await db.query('SELECT to_jsonb(s) AS row FROM price_snapshots s ORDER BY id'))
      .rows;
    const hourly = (
      await db.query('SELECT to_jsonb(s) AS row FROM hourly_price_snapshots s ORDER BY id')
    ).rows;
    const moved = (
      await db.query("SELECT * FROM archive_snapshot_day((now() AT TIME ZONE 'UTC')::date-9)")
    ).rows[0];
    assert.deepEqual(moved, { moved_price: 2101, moved_hourly: 24, archive_rows: 2125 });
    assert.equal((await db.query('SELECT count(*)::int AS n FROM price_snapshots')).rows[0].n, 0);
    const history = async (view: string) =>
      (await db.query(`SELECT to_jsonb(s)-'archive_day' AS row FROM ${view} s ORDER BY id`)).rows;
    assert.deepEqual(await history('price_snapshot_history'), fine);
    assert.deepEqual(await history('hourly_snapshot_history'), hourly);
    for (const row of (await db.query('SELECT * FROM snapshot_archive_exports')).rows) {
      assert.equal(
        row.checksum,
        createHash('sha256')
          .update(row.payload as string, 'utf8')
          .digest('hex')
      );
      assert.equal(row.row_count, JSON.parse(row.payload as string).length);
    }
    assert.deepEqual(
      (await db.query("SELECT * FROM archive_snapshot_day((now() AT TIME ZONE 'UTC')::date-9)"))
        .rows[0],
      { moved_price: 0, moved_hourly: 0, archive_rows: 2125 }
    );
    // A corrected hourly replay overrides one natural key and survives re-archiving.
    await db.exec(`INSERT INTO hourly_price_snapshots(snapshot_hour,provider,symbol,chain_id,price,is_success)
      SELECT min(snapshot_hour),'dia','ETH',1,777,true FROM hourly_snapshot_history`);
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM hourly_snapshot_history')).rows[0].n,
      24
    );
    await db.query("SELECT * FROM archive_snapshot_day((now() AT TIME ZONE 'UTC')::date-9)");
    assert.equal(
      (await db.query('SELECT price FROM hourly_snapshot_history ORDER BY snapshot_hour LIMIT 1'))
        .rows[0].price,
      '777.00000000'
    );
    // A deletion failure rolls back BOTH sources and every archive write.
    await db.exec(`INSERT INTO price_snapshots(snapshot_ts,snapshot_hour,provider,symbol,chain_id,price,is_success)
      VALUES(now()-interval '10 days',now()-interval '10 days','dia','BTC',0,50000,true);
      INSERT INTO hourly_price_snapshots(snapshot_hour,provider,symbol,chain_id,price,is_success)
      VALUES(now()-interval '10 days','dia','BTC',0,50000,true);
      CREATE FUNCTION reject_delete() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'injected deletion failure'; END; $$;
      CREATE TRIGGER reject_delete BEFORE DELETE ON hourly_price_snapshots FOR EACH ROW EXECUTE FUNCTION reject_delete();`);
    await assert.rejects(
      db.query("SELECT * FROM archive_snapshot_day((now() AT TIME ZONE 'UTC')::date-10)"),
      /injected deletion failure/
    );
    assert.equal((await db.query('SELECT count(*)::int AS n FROM price_snapshots')).rows[0].n, 1);
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM snapshot_archives WHERE archive_day=(now() AT TIME ZONE 'UTC')::date-10"
        )
      ).rows[0].n,
      0
    );
    for (const day of [0, 7, 121])
      await assert.rejects(
        db.query(
          `SELECT * FROM archive_snapshot_day((now() AT TIME ZONE 'UTC')::date-$1::integer)`,
          [day]
        ),
        /cold window/
      );
    for (const role of ['anon', 'authenticated']) {
      assert.deepEqual(
        (
          await db.query(
            `SELECT has_table_privilege($1,'price_snapshot_history','SELECT') AS fine,
        has_table_privilege($1,'snapshot_archive_exports','SELECT') AS export,
        has_function_privilege($1,'archive_snapshot_day(date)','EXECUTE') AS archive`,
            [role]
          )
        ).rows[0],
        { fine: false, export: false, archive: false }
      );
    }
    const maintenance = await readFile(
      new URL(
        '../../supabase/migrations/0065_enable_snapshot_archive_maintenance.sql',
        import.meta.url
      ),
      'utf8'
    );
    await db.exec(maintenance.slice(0, maintenance.indexOf('SELECT cron.unschedule')) + 'COMMIT;');
    await db.exec('DROP TRIGGER reject_delete ON hourly_price_snapshots');
    await db.exec('SET ROLE service_role');
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM hourly_snapshot_history')).rows[0].n,
      25
    );
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM price_snapshot_history WHERE archive_day >= (now() AT TIME ZONE 'UTC')::date-1"
        )
      ).rows[0].n,
      0
    );
    assert.deepEqual((await db.query('SELECT * FROM maintain_snapshot_archives()')).rows[0], {
      moved_price: 1,
      moved_hourly: 1,
      archive_rows: 2,
    });
    assert.deepEqual((await db.query('SELECT * FROM maintain_snapshot_archives()')).rows[0], {
      moved_price: 0,
      moved_hourly: 0,
      archive_rows: 0,
    });
  } finally {
    await db.close();
  }
});
