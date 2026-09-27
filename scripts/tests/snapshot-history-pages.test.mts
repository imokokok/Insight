import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('bounded history pages match the complete SQL history across hot/cold boundaries', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE price_snapshots(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        snapshot_ts timestamptz NOT NULL,snapshot_hour timestamptz NOT NULL,provider text NOT NULL,
        symbol text NOT NULL,chain_id integer NOT NULL,price numeric,is_success boolean,
        data_age_seconds integer,created_at timestamptz DEFAULT now());
      CREATE UNIQUE INDEX fine_unique ON price_snapshots(snapshot_ts,provider,symbol,chain_id);
      CREATE TABLE hourly_price_snapshots(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        snapshot_hour timestamptz NOT NULL,provider text NOT NULL,symbol text NOT NULL,
        chain_id integer NOT NULL,price numeric,is_success boolean,data_age_seconds integer,
        created_at timestamptz DEFAULT now());
      CREATE UNIQUE INDEX hour_unique ON hourly_price_snapshots(snapshot_hour,provider,symbol,chain_id);
      CREATE TABLE oracle_feeds(provider text,symbol text,chain_id integer,is_active boolean,
        observed_data_age_p90_s integer,observed_cadence_updated_at timestamptz);
      GRANT SELECT ON price_snapshots,hourly_price_snapshots TO service_role;
      INSERT INTO price_snapshots(snapshot_ts,snapshot_hour,provider,symbol,chain_id,price,is_success)
      SELECT ((now() AT TIME ZONE 'UTC')::date-d)::timestamp AT TIME ZONE 'UTC'+(v%96)*interval '15 minutes',
        ((now() AT TIME ZONE 'UTC')::date-d)::timestamp AT TIME ZONE 'UTC',
        CASE WHEN v%2=0 THEN 'dia' ELSE 'chainlink' END,'ASSET'||(v/96),v%2,
        CASE WHEN v%7=0 THEN 0 ELSE v+1 END,v%5<>0
        FROM generate_series(0,2500) v CROSS JOIN unnest(ARRAY[1,3,9,11]) d;
      INSERT INTO hourly_price_snapshots(snapshot_hour,provider,symbol,chain_id,price,is_success)
        SELECT snapshot_ts,provider,symbol,chain_id,price,is_success FROM price_snapshots;`);
    for (const migration of [
      '0064_compressed_snapshot_history',
      '0066_preserve_archived_snapshot_writes',
      '0067_set_based_snapshot_archive_cleanup',
      '0068_bounded_snapshot_history_pages',
    ]) {
      const sql = await readFile(
        new URL(`../../supabase/migrations/${migration}.sql`, import.meta.url),
        'utf8'
      );
      await db.exec(sql);
      await db.exec(sql);
    }
    await db.query("SELECT * FROM archive_snapshot_day((now() AT TIME ZONE 'UTC')::date-9)");
    await db.query("SELECT * FROM archive_snapshot_day((now() AT TIME ZONE 'UTC')::date-11)");
    // A late hourly correction creates a mixed hot/cold date, with one identity.
    await db.exec(`INSERT INTO hourly_price_snapshots(snapshot_hour,provider,symbol,chain_id,price,is_success)
      SELECT snapshot_hour,provider,symbol,chain_id,999,true FROM hourly_snapshot_history ORDER BY snapshot_hour,id LIMIT 1`);
    const today = (await db.query("SELECT (now() AT TIME ZONE 'UTC')::date::text AS today")).rows[0]
      .today as string;
    const midnight = new Date(`${today}T00:00:00Z`).getTime();
    for (const kind of ['price', 'hourly']) {
      const time = kind === 'price' ? 'snapshot_ts' : 'snapshot_hour';
      const view = kind === 'price' ? 'price_snapshot_history' : 'hourly_snapshot_history';
      const columns = ['id', time, 'provider', 'symbol', 'chain_id', 'price', 'is_success'];
      for (const ascending of [false, true])
        for (const successOnly of [false, true]) {
          for (const offset of [0, 2000, 4900, 7000, 10000, 15000]) {
            const from = new Date(midnight - 12 * 86400000 + 3 * 3600000).toISOString();
            const before = new Date(midnight - 1 * 86400000 + 13 * 3600000).toISOString();
            const direction = ascending ? 'ASC' : 'DESC';
            const expected = (
              await db.query(
                `SELECT coalesce(jsonb_agg(q.row),'[]') AS data FROM
            (SELECT jsonb_build_object(${columns.map((c) => `'${c}',s.${c}`).join(',')}) AS row
            FROM ${view} s WHERE ${time} >= $1 AND ${time} < $2
            ${successOnly ? 'AND is_success AND price>0' : ''}
            ORDER BY ${time} ${direction},id ${direction} LIMIT 2000 OFFSET $3) q`,
                [from, before, offset]
              )
            ).rows[0].data;
            const actual = (
              await db.query(
                `SELECT get_snapshot_history_page($1,$2,$3,$4,NULL,NULL,NULL,$5,$6,2000,$7) AS data`,
                [kind, from, before, columns, successOnly, ascending, offset]
              )
            ).rows[0].data;
            assert.deepEqual(actual, expected, `${kind}/${ascending}/${successOnly}/${offset}`);
          }
        }
      // Exact endpoint, feed and chain filters, and a projection omitting time.
      const from = new Date(midnight - 11 * 86400000).toISOString();
      const before = new Date(midnight - 9 * 86400000 + 45 * 60000).toISOString();
      for (const inclusive of [false, true]) {
        const actual = (
          await db.query(
            `SELECT get_snapshot_history_page($1,$2,$3,ARRAY['price'],ARRAY['dia'],'ASSET0',0,false,true,10001,0,$4) AS data`,
            [kind, from, before, inclusive]
          )
        ).rows[0].data;
        const expected = (
          await db.query(
            `SELECT coalesce(jsonb_agg(q.row),'[]') AS data FROM
          (SELECT jsonb_build_object('price',price) AS row FROM ${view}
          WHERE ${time}>=$1 AND ${time} ${inclusive ? '<=' : '<'} $2 AND provider='dia' AND symbol='ASSET0' AND chain_id=0
          ORDER BY ${time},id LIMIT 10001) q`,
            [from, before]
          )
        ).rows[0].data;
        assert.deepEqual(actual, expected);
      }
    }
    const uptimeFrom = new Date(midnight - 12 * 86400000).toISOString();
    const uptimeBefore = new Date(midnight).toISOString();
    const uptime = (
      await db.query('SELECT get_snapshot_uptime($1,$2) AS data', [uptimeFrom, uptimeBefore])
    ).rows[0].data;
    const uptimeTruth = (
      await db.query(
        `SELECT jsonb_agg(to_jsonb(q) ORDER BY provider,symbol) AS data FROM
      (SELECT provider,symbol,count(*) AS snapshots,count(*) FILTER(WHERE is_success) AS successes,
        count(DISTINCT date_trunc('hour',snapshot_hour AT TIME ZONE 'UTC')) AS hours
      FROM hourly_snapshot_history WHERE snapshot_hour >= $1 AND snapshot_hour < $2
      GROUP BY provider,symbol) q`,
        [uptimeFrom, uptimeBefore]
      )
    ).rows[0].data;
    assert.deepEqual(uptime, uptimeTruth);
    assert.equal(
      (uptime as { snapshots: number }[]).reduce((sum, row) => sum + row.snapshots, 0),
      10004
    );
    await assert.rejects(
      db.query(
        "SELECT get_snapshot_history_page('price',now(),now(),ARRAY['price); DROP TABLE price_snapshots;--'])"
      ),
      /parameters/
    );
    await db.exec('SET ROLE anon');
    await assert.rejects(
      db.query("SELECT get_snapshot_history_page('price',now(),now(),ARRAY['price'])"),
      /permission denied/
    );
    await db.exec('RESET ROLE; SET ROLE service_role');
    const service = (
      await db.query(
        "SELECT get_snapshot_history_page('price',now()-interval '12 days',now(),ARRAY['id'],NULL,NULL,NULL,false,false,10001) AS data"
      )
    ).rows[0].data;
    assert.equal((service as unknown[]).length, 10001);
  } finally {
    await db.close();
  }
});
