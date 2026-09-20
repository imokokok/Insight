import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('coverage SLO SQL counts gaps, isolates policies, rejects backfill and preserves first attempt', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
    await db.exec(
      await readFile(
        new URL('../../supabase/migrations/0056_coverage_slo.sql', import.meta.url),
        'utf8'
      )
    );
    const slot = Number(
      (await db.query('SELECT floor(extract(epoch FROM now())/900)::bigint*900 AS slot')).rows[0]
        .slot
    );
    await db.query(
      "INSERT INTO coverage_slo_targets(id,asset,chain_id,policy_id,objective_bps,enrolled_at) VALUES ('usdc','USDC',1,$1,9900,to_timestamp($2)), ('base','USDC',8453,$1,9900,to_timestamp($2))",
      [`0x${'11'.repeat(32)}`, slot - 3600]
    );
    // Historical fixtures are inserted only by the test database owner with the clock trigger disabled.
    await db.exec('ALTER TABLE coverage_slo_samples DISABLE TRIGGER coverage_sample_clock;');
    for (const [offset, status] of [
      [3600, 'PASS'],
      [2700, 'INSUFFICIENT_COVERAGE'],
      [1800, 'UNAVAILABLE'],
    ]) {
      await db.query(
        "INSERT INTO coverage_slo_samples VALUES ('usdc',$1::bigint,to_timestamp($1::bigint),$2,false,'[]',NULL)",
        [slot - offset, status]
      );
    }
    await db.exec('ALTER TABLE coverage_slo_samples ENABLE TRIGGER coverage_sample_clock;');
    const summary = (await db.query('SELECT coverage_slo_summary(24) AS value')).rows[0].value;
    const usdc = summary.find((t) => t.id === 'usdc');
    assert.equal(usdc.expected, 4);
    assert.equal(usdc.observed, 3);
    assert.equal(usdc.data_ready, 1);
    assert.equal(usdc.unavailable, 1);
    assert.equal(usdc.missing, 1);
    assert.equal(summary.find((t) => t.id === 'base').missing, 4);
    await assert.rejects(db.query('SELECT coverage_slo_summary(99999)'));
    await assert.rejects(
      db.query(
        "INSERT INTO coverage_slo_samples VALUES ('usdc',$1::bigint,to_timestamp($1::bigint),'PASS',false,'[]',NULL)",
        [slot - 900]
      )
    );
    await db.query(
      "INSERT INTO coverage_slo_samples(target_id,slot,status,signed_ready,reasons) VALUES ('usdc',$1,'UNAVAILABLE',false,'[\"PROBE_UNAVAILABLE\"]')",
      [slot]
    );
    await db.query(
      "INSERT INTO coverage_slo_samples(target_id,slot,status,signed_ready,reasons) VALUES ('usdc',$1,'PASS',false,'[]') ON CONFLICT DO NOTHING",
      [slot]
    );
    assert.equal(
      (await db.query('SELECT status FROM coverage_slo_samples WHERE slot=$1', [slot])).rows[0]
        .status,
      'UNAVAILABLE'
    );
    assert.equal(
      (await db.query('SELECT coverage_slo_summary(24) AS value')).rows[0].value.find(
        (t) => t.id === 'usdc'
      ).observed,
      3,
      'current slot is excluded'
    );
    const permissions = (
      await db.query(
        "SELECT has_table_privilege('service_role','coverage_slo_samples','UPDATE') AS can_update,has_table_privilege('service_role','coverage_slo_samples','DELETE') AS can_delete,has_table_privilege('anon','coverage_slo_samples','SELECT') AS anonymous_read"
      )
    ).rows[0];
    assert.deepEqual(permissions, { can_update: false, can_delete: false, anonymous_read: false });
  } finally {
    await db.close();
  }
});
