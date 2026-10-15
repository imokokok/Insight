import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Regression: 0077 declared the audit network check with legacy names
// ('base', 'base-sepolia') while the code writes CAIP-2 ids ('eip155:84532'),
// so every settlement audit insert was rejected in production. 0078 widens
// the check to CAIP-2, and 0088 adds nullable network support plus Solana networks.
test('x402 settlement audit accepts supported CAIP-2 networks and nullable quotes', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
    for (const migration of [
      '0077_x402_settlements.sql',
      '0078_x402_settlements_network_caip2.sql',
      '0079_x402_ops_lifecycle.sql',
      '0088_x402_solana_networks.sql',
    ]) {
      await db.exec(
        await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8')
      );
    }
    const supportedNetworks = [
      'eip155:84532',
      'eip155:8453',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    ];
    for (const [index, network] of supportedNetworks.entries()) {
      await db.query('INSERT INTO x402_settlements(request_id,status,network) VALUES($1,$2,$3)', [
        `req-network-${index}`,
        'settled',
        network,
      ]);
    }
    await db.query(
      "INSERT INTO x402_settlements(request_id,status,network) VALUES('req-unselected','quote_issued',NULL)"
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
