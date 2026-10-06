import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Regression: 0077 declared the audit network check with legacy names
// ('base', 'base-sepolia') while the code writes CAIP-2 ids ('eip155:84532'),
// so every settlement audit insert was rejected in production. 0078 widens
// the check to the CAIP-2 ids the x402 v2 wire format actually carries.
test('x402 settlement audit accepts CAIP-2 network ids and rejects legacy names', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
    for (const migration of [
      '0077_x402_settlements.sql',
      '0078_x402_settlements_network_caip2.sql',
    ]) {
      await db.exec(
        await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8')
      );
    }
    await db.query(
      "INSERT INTO x402_settlements(request_id,status,network) VALUES('req-caip2','settled','eip155:84532')"
    );
    await assert.rejects(
      db.query(
        "INSERT INTO x402_settlements(request_id,status,network) VALUES('req-legacy','settled','base-sepolia')"
      )
    );
  } finally {
    await db.close();
  }
});
